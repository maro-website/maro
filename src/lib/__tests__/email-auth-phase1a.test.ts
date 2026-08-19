import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Webhook } from "standardwebhooks";
import {
  sanitizeInternalRedirectPath,
  defaultPostAuthPathForOtpType,
} from "@/lib/auth/safeRedirect";
import {
  buildAuthCallbackUrl,
  hookActionToOtpType,
  isValidEmailOtpType,
  parseEmailOtpType,
} from "@/lib/email/authUrls";
import { resolveEmailChangeDelivery } from "@/lib/email/secureEmailChange";
import {
  mapAuthHookError,
  processAuthEmailHook,
  verifyAuthHookSignature,
} from "@/lib/email/authHook";
import { sanitizeEmailMetadata, sanitizeEmailVariables } from "@/lib/email/sanitize";

vi.mock("@/lib/email/engine", () => ({
  sendEmail: vi.fn(),
}));

import { sendEmail } from "@/lib/email/engine";

const TEST_SECRET = "v1,whsec_" + Buffer.from("super-secret-key-32bytes!!").toString("base64");

function signPayload(payload: object): { body: string; headers: Headers } {
  const wh = new Webhook(TEST_SECRET.slice(TEST_SECRET.indexOf("whsec_")));
  const body = JSON.stringify(payload);
  const msgId = "msg_test";
  const timestamp = new Date();
  const signature = wh.sign(msgId, timestamp, body);
  const headers = new Headers({
    "webhook-id": msgId,
    "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "webhook-signature": signature,
  });
  return { body, headers };
}

describe("safe internal redirect", () => {
  it("accepts internal paths", () => {
    expect(sanitizeInternalRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeInternalRedirectPath("/reset-password")).toBe("/reset-password");
    expect(sanitizeInternalRedirectPath("/checkout?item=abc")).toBe("/checkout?item=abc");
  });

  it("rejects external and dangerous destinations", () => {
    expect(sanitizeInternalRedirectPath("https://evil.com")).toBe("/");
    expect(sanitizeInternalRedirectPath("//evil.com")).toBe("/");
    expect(sanitizeInternalRedirectPath("javascript:alert(1)")).toBe("/");
    expect(sanitizeInternalRedirectPath("/\\evil")).toBe("/");
    expect(sanitizeInternalRedirectPath("/%2f%2fevil.com")).toBe("/");
  });

  it("maps otp types to default post-auth paths", () => {
    expect(defaultPostAuthPathForOtpType("recovery")).toBe("/reset-password");
    expect(defaultPostAuthPathForOtpType("email_change")).toBe("/account");
  });
});

describe("auth callback URL builder", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://maro.al");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds callback URLs with token_hash and type", () => {
    const url = buildAuthCallbackUrl({
      tokenHash: "abc123",
      type: "signup",
      next: "/",
    });
    expect(url).toContain("https://maro.al/auth/callback");
    expect(url).toContain("token_hash=abc123");
    expect(url).toContain("type=signup");
  });

  it("rejects unsafe next paths via sanitizer", () => {
    const url = buildAuthCallbackUrl({
      tokenHash: "abc123",
      type: "recovery",
      next: "https://evil.com",
    });
    expect(url).toContain("type=recovery");
    expect(url).not.toContain("evil.com");
  });
});

describe("email otp type parsing", () => {
  it("accepts supported types only", () => {
    expect(isValidEmailOtpType("signup")).toBe(true);
    expect(isValidEmailOtpType("recovery")).toBe(true);
    expect(parseEmailOtpType("SIGNUP")).toBe("signup");
    expect(parseEmailOtpType("magiclink")).toBe("magiclink");
    expect(parseEmailOtpType("bogus")).toBeNull();
  });
});

describe("secure email change mapper", () => {
  it("maps secure mode current email to token_hash_new", () => {
    const delivery = resolveEmailChangeDelivery({
      user: { email: "old@example.com", new_email: "new@example.com" },
      email_data: { token_hash_new: "hash-for-current" },
    });
    expect(delivery).toEqual({
      recipient: "old@example.com",
      recipientRole: "current",
      tokenHash: "hash-for-current",
    });
  });

  it("maps secure mode new email to token_hash", () => {
    const delivery = resolveEmailChangeDelivery({
      user: { email: "old@example.com", new_email: "new@example.com" },
      email_data: { token_hash: "hash-for-new" },
    });
    expect(delivery).toEqual({
      recipient: "new@example.com",
      recipientRole: "new",
      tokenHash: "hash-for-new",
    });
  });

  it("handles non-secure single-recipient change", () => {
    const delivery = resolveEmailChangeDelivery({
      user: { email: "old@example.com", new_email: "new@example.com" },
      email_data: { token_hash: "only-hash" },
    });
    expect(delivery?.recipient).toBe("new@example.com");
    expect(delivery?.tokenHash).toBe("only-hash");
  });
});

describe("auth hook signature verification", () => {
  const originalSecret = process.env.SUPABASE_AUTH_HOOK_SECRET;

  beforeEach(() => {
    process.env.SUPABASE_AUTH_HOOK_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SUPABASE_AUTH_HOOK_SECRET;
    else process.env.SUPABASE_AUTH_HOOK_SECRET = originalSecret;
  });

  it("rejects unsigned payloads", () => {
    expect(() =>
      verifyAuthHookSignature("{}", new Headers())
    ).toThrow();
  });

  it("accepts valid signed payloads", () => {
    const { body, headers } = signPayload({ hello: "world" });
    expect(() => verifyAuthHookSignature(body, headers)).not.toThrow();
  });

  it("rejects invalid signatures", () => {
    const { body, headers } = signPayload({ hello: "world" });
    headers.set("webhook-signature", "v1,invalid");
    expect(() => verifyAuthHookSignature(body, headers)).toThrow();
  });
});

describe("auth hook processing", () => {
  const originalSecret = process.env.SUPABASE_AUTH_HOOK_SECRET;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://maro.al");
    process.env.SUPABASE_AUTH_HOOK_SECRET = TEST_SECRET;
    vi.mocked(sendEmail).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalSecret === undefined) delete process.env.SUPABASE_AUTH_HOOK_SECRET;
    else process.env.SUPABASE_AUTH_HOOK_SECRET = originalSecret;
  });

  it("maps signup action to confirm template", async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, providerMessageId: "re_1" });

    const payload = {
      user: { id: "u1", email: "user@example.com" },
      email_data: {
        email_action_type: "signup",
        token_hash: "signup-hash",
      },
    };

    const result = await processAuthEmailHook(JSON.stringify(payload));
    expect(result.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: "auth.confirm_signup",
        channel: "auth",
        to: "user@example.com",
      })
    );

    const vars = vi.mocked(sendEmail).mock.calls[0]?.[0]?.variables ?? {};
    expect(vars.confirmation_url).toContain("token_hash=signup-hash");
    expect(sanitizeEmailVariables(vars).confirmation_url).toBe("[REDACTED]");
  });

  it("maps recovery action to reset template", async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: true });

    const result = await processAuthEmailHook(
      JSON.stringify({
        user: { id: "u1", email: "user@example.com" },
        email_data: { email_action_type: "recovery", token_hash: "rec-hash" },
      })
    );

    expect(result.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateKey: "auth.reset_password", channel: "auth" })
    );
  });

  it("fails unsupported action types", async () => {
    const result = await processAuthEmailHook(
      JSON.stringify({
        user: { email: "user@example.com" },
        email_data: { email_action_type: "magiclink", token_hash: "x" },
      })
    );
    expect(result.ok).toBe(false);
    expect(result.category).toBe("unsupported_action");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns non-2xx when send fails", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      ok: false,
      errorCategory: "CONFIG_MISSING",
      retryable: false,
      message: "RESEND_API_KEY not configured",
    });

    const result = await processAuthEmailHook(
      JSON.stringify({
        user: { id: "u1", email: "user@example.com" },
        email_data: { email_action_type: "signup", token_hash: "hash" },
      })
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBeGreaterThanOrEqual(400);
  });

  it("never puts auth URLs into sanitized log metadata", () => {
    const vars = {
      confirmation_url: "https://maro.al/auth/callback?token_hash=secret&type=signup",
      user_email: "user@example.com",
    };
    expect(sanitizeEmailVariables(vars).confirmation_url).toBe("[REDACTED]");
    expect(
      sanitizeEmailMetadata({ template: "auth.confirm_signup", confirmation_url: vars.confirmation_url })
        ?.confirmation_url
    ).toBe("[REDACTED]");
  });
});

describe("hook action mapping helper", () => {
  it("maps supported hook actions", () => {
    expect(hookActionToOtpType("signup")).toBe("signup");
    expect(hookActionToOtpType("recovery")).toBe("recovery");
    expect(hookActionToOtpType("email_change")).toBe("email_change");
    expect(hookActionToOtpType("magiclink")).toBeNull();
  });
});

describe("auth hook error mapping", () => {
  it("maps signature failures to 401", () => {
    const mapped = mapAuthHookError(new Error("Invalid signature"));
    expect(mapped.status).toBe(401);
    expect(mapped.category).toBe("signature");
  });
});
