import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getAppOrigin,
  buildPublicUrl,
  isTrustedPublicOrigin,
} from "@/lib/config/appOrigin";
import {
  classifyCodeExchangeError,
  classifySupabaseRedirectError,
  classifyVerifyOtpError,
  callbackFailureLogMeta,
} from "@/lib/auth/callbackErrors";

describe("canonical public app origin", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    vi.unstubAllEnvs();
  });

  it("rejects 0.0.0.0 and :8080 bind addresses", () => {
    expect(isTrustedPublicOrigin("http://0.0.0.0:8080")).toBe(false);
    expect(isTrustedPublicOrigin("https://0.0.0.0:8080")).toBe(false);
  });

  it("rejects localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isTrustedPublicOrigin("http://localhost:3006")).toBe(false);
  });

  it("uses https://maro.al in production when env is internal", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://0.0.0.0:8080");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://0.0.0.0:8080");
    expect(getAppOrigin()).toBe("https://maro.al");
  });

  it("prefers APP_ORIGIN when trusted", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://maro.al");
    vi.stubEnv("APP_URL", "http://0.0.0.0:8080");
    expect(getAppOrigin()).toBe("https://maro.al");
  });

  it("buildPublicUrl never contains internal hosts", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://0.0.0.0:8080");
    const url = buildPublicUrl("/auth/callback", { type: "recovery", next: "/reset-password" });
    expect(url).toMatch(/^https:\/\/maro\.al\//);
    expect(url).not.toContain("0.0.0.0");
    expect(url).not.toContain(":8080");
    expect(url).not.toContain("localhost");
  });
});

describe("forgot-password redirect target", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds trusted recovery callback URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://maro.al");
    const redirectTo = buildPublicUrl("/auth/callback", { type: "recovery", next: "/reset-password" });
    expect(redirectTo).toBe(
      "https://maro.al/auth/callback?type=recovery&next=%2Freset-password"
    );
  });
});

describe("auth callback error classification", () => {
  it("does not map all verify failures to expired_link", () => {
    expect(classifyVerifyOtpError("Token has expired")).toBe("expired_link");
    expect(classifyVerifyOtpError("Email link is invalid")).toBe("invalid_link");
    expect(classifyVerifyOtpError("Token has already been used")).toBe("invalid_link");
    expect(classifyVerifyOtpError("Something else")).toBe("verification_failed");
  });

  it("classifies code exchange failures separately", () => {
    expect(classifyCodeExchangeError("Code expired")).toBe("expired_link");
    expect(classifyCodeExchangeError("Invalid code")).toBe("invalid_link");
    expect(classifyCodeExchangeError("PKCE mismatch")).toBe("code_exchange_failed");
  });

  it("classifies Supabase provider redirect errors", () => {
    expect(classifySupabaseRedirectError("access_denied", "otp_expired")).toBe("expired_link");
    expect(classifySupabaseRedirectError("invalid_request", null)).toBe("invalid_link");
  });

  it("never logs secrets in callback failure metadata", () => {
    const meta = callbackFailureLogMeta({
      reason: "verification_failed",
      flow: "verify_otp",
      otpType: "recovery",
    });
    expect(JSON.stringify(meta)).not.toMatch(/token_hash|access_token|refresh_token/i);
    expect(meta.reason).toBe("verification_failed");
  });
});

describe("built-in vs hook flow distinction", () => {
  it("documents PKCE code path for built-in mailer and token_hash for hook", () => {
    const hookUrl =
      "https://maro.al/auth/callback?token_hash=abc&type=recovery&next=%2Freset-password";
    const builtinAfterVerify =
      "https://maro.al/auth/callback?type=recovery&next=%2Freset-password&code=pkce-code";

    expect(hookUrl).toContain("token_hash=");
    expect(builtinAfterVerify).toContain("code=");
    expect(builtinAfterVerify).not.toContain("token_hash=");
  });
});
