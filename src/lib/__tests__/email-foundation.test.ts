import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  EMAIL_TEMPLATE_KEYS,
  EMAIL_TEMPLATE_REGISTRY,
  assertRegisteredTemplateKey,
  getTemplateRegistryEntry,
} from "@/lib/email/templateRegistry";
import {
  escapeHtml,
  validateStructuredContent,
  validateVariablesForTemplate,
  interpolateStructuredContent,
  collectContentPlaceholders,
  EmailVariableError,
  validateHttpsUrl,
} from "@/lib/email/variables";
import {
  sanitizeEmailVariables,
  sanitizeEmailMetadata,
  buildSanitizedOutboxPayload,
  recipientDomainFromEmail,
} from "@/lib/email/sanitize";
import { renderEmail } from "@/lib/email/render";
import { renderEmailLayout } from "@/lib/email/layout";
import { isResendConfigured, sendViaResend } from "@/lib/email/provider/resend";
import { assertTemplateMutationAllowed } from "@/lib/email/templates";

describe("email template registry", () => {
  it("registers all four auth system templates", () => {
    expect(EMAIL_TEMPLATE_KEYS).toEqual([
      "auth.confirm_signup",
      "auth.reset_password",
      "auth.email_change",
      "auth.magic_link",
    ]);
  });

  it("rejects unknown template keys", () => {
    expect(getTemplateRegistryEntry("auth.unknown")).toBeNull();
    expect(() => assertRegisteredTemplateKey("nope")).toThrow(/unknown_template/);
  });

  it("marks auth templates as non-disablable system templates", () => {
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const entry = EMAIL_TEMPLATE_REGISTRY[key];
      expect(entry.isSystem).toBe(true);
      expect(entry.canDisable).toBe(false);
    }
  });

  it("requires confirmation_url for signup template", () => {
    const entry = EMAIL_TEMPLATE_REGISTRY["auth.confirm_signup"];
    expect(entry.requiredVariables).toContain("confirmation_url");
    expect(entry.urlVariables).toContain("confirmation_url");
  });

  it("documents secure email change variables without assuming token_hash_new mapping", () => {
    const entry = EMAIL_TEMPLATE_REGISTRY["auth.email_change"];
    expect(entry.requiredVariables).toEqual(
      expect.arrayContaining(["confirmation_url", "recipient_email", "change_recipient_role"])
    );
  });
});

describe("email variable engine", () => {
  const signupVars = {
    confirmation_url: "https://maro.al/auth/callback?token_hash=abc&type=signup",
    user_email: "user@example.com",
  };

  it("rejects unknown variables", () => {
    expect(() =>
      validateVariablesForTemplate("auth.confirm_signup", {
        ...signupVars,
        evil: "x",
      })
    ).toThrow(/unknown_variable:evil/);
  });

  it("rejects missing required variables", () => {
    expect(() =>
      validateVariablesForTemplate("auth.confirm_signup", { user_email: "a@b.com" })
    ).toThrow(/missing_required:confirmation_url/);
  });

  it("rejects unknown placeholders in structured content", () => {
    expect(() =>
      validateVariablesForTemplate(
        "auth.confirm_signup",
        signupVars,
        {
          heading: "Hi {{nickname}}",
          paragraphs: ["Test"],
        }
      )
    ).toThrow(/unknown_placeholder:nickname/);
  });

  it("HTML-escapes text variables", () => {
    const result = interpolateStructuredContent(
      { heading: "Hello {{user_email}}", paragraphs: ["Body"] },
      { user_email: "<script>alert(1)</script>@x.com", confirmation_url: signupVars.confirmation_url },
      ["confirmation_url"]
    );
    expect(result.heading).toContain("&lt;script&gt;");
    expect(result.heading).not.toContain("<script>");
  });

  it("rejects non-https URL variables", () => {
    expect(() => validateHttpsUrl("http://maro.al/x")).toThrow(/https_required/);
    expect(() =>
      validateVariablesForTemplate("auth.confirm_signup", {
        confirmation_url: "http://maro.al/auth/callback",
      })
    ).toThrow(/invalid_url/);
  });

  it("rejects invalid CTA URL after interpolation", () => {
    expect(() =>
      renderEmail({
        templateKey: "auth.confirm_signup",
        variables: {
          confirmation_url: "not-a-url",
        },
      })
    ).toThrow(EmailVariableError);
  });

  it("rejects raw HTML in structured content", () => {
    expect(() =>
      validateStructuredContent({
        heading: "<b>Bad</b>",
        paragraphs: ["Ok"],
      })
    ).toThrow(/heading_html_forbidden/);
  });

  it("collects placeholders from structured content", () => {
    const placeholders = collectContentPlaceholders({
      heading: "Hi",
      paragraphs: ["Click {{confirmation_url}}"],
      cta: { label: "Go", url: "{{confirmation_url}}" },
    });
    expect(placeholders).toEqual(["confirmation_url"]);
  });
});

describe("email sanitizer", () => {
  it("redacts secret keys and auth URLs from variables", () => {
    const sanitized = sanitizeEmailVariables({
      user_email: "user@example.com",
      confirmation_url: "https://maro.al/auth/callback?token_hash=secret",
      token_hash: "abc",
    });
    expect(sanitized.user_email).toBe("user@example.com");
    expect(sanitized.confirmation_url).toBe("[REDACTED]");
    expect(sanitized.token_hash).toBe("[REDACTED]");
  });

  it("builds sanitized outbox payload without secrets", () => {
    const payload = buildSanitizedOutboxPayload({
      recovery_url: "https://maro.al/auth/callback?token_hash=xyz&type=recovery",
      user_email: "a@b.com",
    });
    expect(payload.recovery_url).toBe("[REDACTED]");
    expect(payload.user_email).toBe("a@b.com");
  });

  it("sanitizes nested metadata", () => {
    const meta = sanitizeEmailMetadata({
      latency_ms: 42,
      confirmation_url: "https://maro.al/x?token_hash=1",
      nested: { token: "secret" },
    });
    expect(meta?.latency_ms).toBe(42);
    expect(meta?.confirmation_url).toBe("[REDACTED]");
    expect(meta?.nested).toEqual({ token: "[REDACTED]" });
  });

  it("extracts recipient domain", () => {
    expect(recipientDomainFromEmail("user@gmail.com")).toBe("gmail.com");
    expect(recipientDomainFromEmail("bad")).toBeNull();
  });
});

describe("email render + layout", () => {
  it("renders signup template with safe CTA link", () => {
    const url = "https://maro.al/auth/callback?type=signup";
    const result = renderEmail({
      templateKey: "auth.confirm_signup",
      variables: {
        confirmation_url: url,
        user_email: "user@example.com",
      },
    });

    expect(result.subject).toContain("Konfirmo");
    expect(result.html).toContain(url);
    expect(result.html).toContain("Konfirmo email-in");
    expect(result.html).toContain("info@maro.al");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("escapes HTML in layout output", () => {
    const html = renderEmailLayout({
      heading: "Test",
      paragraphs: ['Safe & "quoted"'],
    });
    expect(html).toContain("Safe &amp; &quot;quoted&quot;");
  });
});

describe("Resend provider adapter", () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalKey;
    }
  });

  it("reports CONFIG_MISSING when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    expect(isResendConfigured()).toBe(false);
    const result = await sendViaResend({
      from: "maro <info@maro.al>",
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
      text: "Hi",
      replyTo: "info@maro.al",
    });
    expect(result.success).toBe(false);
    expect(result.errorCategory).toBe("CONFIG_MISSING");
    expect(result.retryable).toBe(false);
  });
});

describe("template service guards", () => {
  it("forbids disabling or deleting system auth templates", () => {
    expect(() =>
      assertTemplateMutationAllowed(
        { isSystem: true, templateKey: "auth.confirm_signup" },
        "disable"
      )
    ).toThrow(/system_auth_template_disable_forbidden/);

    expect(() =>
      assertTemplateMutationAllowed(
        { isSystem: true, templateKey: "auth.confirm_signup" },
        "delete"
      )
    ).toThrow(/system_auth_template_delete_forbidden/);
  });
});

describe("html escaping utility", () => {
  it("escapes dangerous characters", () => {
    expect(escapeHtml(`<&"'>`)).toBe("&lt;&amp;&quot;&#39;&gt;");
  });
});
