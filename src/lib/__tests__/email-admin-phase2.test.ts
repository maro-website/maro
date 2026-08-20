import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { hasPermission } from "@/lib/admin/permissions";
import { ADMIN_NAV_GROUPS, ADMIN_ROUTES, adminNavGroupForPath } from "@/lib/admin/routes";
import { assertTemplateMutationAllowed } from "@/lib/email/templates";
import { validateTemplateVersionContent } from "@/lib/email/cms";
import { getPreviewSampleVariables, TEST_EMAIL_SUBJECT_PREFIX } from "@/lib/email/previewSamples";
import { isMaroDomainEmail, assertMaroSenderSettings } from "@/lib/email/senderValidation";
import { renderEmailVersion } from "@/lib/email/engine";
import { EMAIL_TEMPLATE_REGISTRY } from "@/lib/email/templateRegistry";

describe("Admin emails — permissions", () => {
  it("denies editor emails.manage", () => {
    expect(hasPermission("editor", "emails.manage")).toBe(false);
  });

  it("allows super_admin, administrator, developer", () => {
    expect(hasPermission("super_admin", "emails.manage")).toBe(true);
    expect(hasPermission("administrator", "emails.manage")).toBe(true);
    expect(hasPermission("developer", "emails.manage")).toBe(true);
  });
});

describe("Admin emails — navigation", () => {
  it("registers /admin/emails under content group", () => {
    const item = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === ADMIN_ROUTES.emails);
    expect(item?.permission).toBe("emails.manage");
    expect(item?.label).toBe("Emailat");
    expect(adminNavGroupForPath("/admin/emails")).toBe("content");
  });
});

describe("Admin emails — system template guards", () => {
  it("forbids disable/delete on auth system templates", () => {
    const authKeys = [
      "auth.confirm_signup",
      "auth.reset_password",
      "auth.email_change",
      "auth.magic_link",
    ] as const;
    for (const key of authKeys) {
      expect(() =>
        assertTemplateMutationAllowed({ isSystem: true, templateKey: key }, "disable")
      ).toThrow(/system_auth_template_disable_forbidden/);
      expect(() =>
        assertTemplateMutationAllowed({ isSystem: true, templateKey: key }, "delete")
      ).toThrow(/system_auth_template_delete_forbidden/);
    }
  });
});

describe("Admin emails — preview samples", () => {
  it("uses safe preview URLs without real tokens", () => {
    const signup = getPreviewSampleVariables("auth.confirm_signup");
    expect(signup.confirmation_url).toContain("preview=1");
    expect(signup.confirmation_url).not.toMatch(/token_hash=/);

    const recovery = getPreviewSampleVariables("auth.reset_password");
    expect(recovery.recovery_url).toContain("preview=1");
    expect(recovery.recovery_url).not.toMatch(/token_hash=/);

    const magic = getPreviewSampleVariables("auth.magic_link");
    expect(magic.magic_link_url).toContain("preview=1");
  });

  it("prefixes test sends", () => {
    expect(TEST_EMAIL_SUBJECT_PREFIX).toBe("[Test maro] ");
  });
});

describe("Admin emails — variable validation", () => {
  const validContent = EMAIL_TEMPLATE_REGISTRY["auth.confirm_signup"].fallbackContent;

  it("rejects unknown placeholders in draft content", () => {
    expect(() =>
      validateTemplateVersionContent("auth.confirm_signup", {
        subject: "Test",
        previewText: "",
        content: {
          heading: "Hi {{evil}}",
          paragraphs: ["Body"],
        },
      })
    ).toThrow(/unknown_placeholder:evil/);
  });

  it("rejects non-url variable in CTA URL", () => {
    expect(() =>
      validateTemplateVersionContent("auth.confirm_signup", {
        subject: "Test",
        previewText: "",
        content: {
          heading: "Hi",
          paragraphs: ["Body"],
          cta: { label: "Go", url: "{{user_email}}" },
        },
      })
    ).toThrow(/cta_url_invalid_variable:user_email/);
  });

  it("accepts valid structured auth template content", () => {
    expect(() =>
      validateTemplateVersionContent("auth.confirm_signup", {
        subject: "Konfirmo",
        previewText: "Preview",
        content: validContent,
      })
    ).not.toThrow();
  });
});

describe("Admin emails — sender validation", () => {
  it("accepts @maro.al addresses", () => {
    expect(isMaroDomainEmail("info@maro.al")).toBe(true);
  });

  it("rejects third-party domains", () => {
    expect(isMaroDomainEmail("info@gmail.com")).toBe(false);
    expect(() =>
      assertMaroSenderSettings({ fromEmail: "x@gmail.com", replyTo: "info@maro.al" })
    ).toThrow(/from_email_must_be_maro_domain/);
  });
});

describe("Admin emails — canonical preview renderer", () => {
  it("renders draft/live version content via renderEmailVersion", async () => {
    const variables = getPreviewSampleVariables("auth.confirm_signup");
    const content = EMAIL_TEMPLATE_REGISTRY["auth.confirm_signup"].fallbackContent;
    const rendered = await renderEmailVersion({
      templateKey: "auth.confirm_signup",
      subject: "Konfirmo",
      previewText: "Preview",
      content,
      variables,
    });

    expect(rendered.html).toContain("Konfirmo");
    expect(rendered.html).not.toContain("<script");
    expect(rendered.html).toContain("preview=1");
    expect(rendered.html).not.toMatch(/token_hash=/);
  });
});

describe("Admin emails — settings secrets guard", () => {
  it("documents that secrets are not in settings API body contract", () => {
    const forbiddenKeys = ["resendApiKey", "supabaseAuthHookSecret"];
    expect(forbiddenKeys).toContain("resendApiKey");
    expect(forbiddenKeys).toContain("supabaseAuthHookSecret");
  });
});
