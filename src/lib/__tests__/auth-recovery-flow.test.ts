import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getAppOrigin,
  buildPublicUrl,
  isTrustedPublicOrigin,
} from "@/lib/config/appOrigin";
import {
  classifyCodeExchangeError,
  classifyCodeExchangeFailure,
  classifySupabaseRedirectError,
  classifyVerifyOtpError,
  callbackFailureLogMeta,
} from "@/lib/auth/callbackErrors";
import {
  isSupabasePkceVerifierCookieName,
  requestHasPkceVerifierCookie,
  responseSetsPkceVerifierCookie,
} from "@/lib/auth/pkceDiagnostics";

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
    expect(
      classifyCodeExchangeFailure(
        "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device."
      )
    ).toBe("pkce_verifier_missing");
    expect(
      classifyCodeExchangeError(
        "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device."
      )
    ).toBe("code_exchange_failed");
    expect(
      classifyCodeExchangeFailure("both auth code and code verifier should be non-empty")
    ).toBe("pkce_verifier_missing");
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
      exchangeFailureCategory: "pkce_verifier_missing",
      pkceVerifierPresent: false,
    });
    expect(JSON.stringify(meta)).not.toMatch(/token_hash|access_token|refresh_token|code=/i);
    expect(meta.reason).toBe("verification_failed");
    expect(meta.pkce_verifier_present).toBe(false);
    expect(meta.exchange_failure_category).toBe("pkce_verifier_missing");
  });
});

describe("PKCE verifier cookie diagnostics", () => {
  it("detects Supabase verifier cookie names without reading values", () => {
    expect(isSupabasePkceVerifierCookieName("sb-abc-auth-token-code-verifier")).toBe(true);
    expect(
      isSupabasePkceVerifierCookieName("sb-abc-auth-token-flow-01234567-code-verifier")
    ).toBe(true);
    expect(isSupabasePkceVerifierCookieName("sb-abc-auth-token")).toBe(false);
  });

  it("reports verifier presence on callback request cookies", () => {
    expect(
      requestHasPkceVerifierCookie([
        { name: "sb-project-auth-token-code-verifier", value: "secret" },
      ])
    ).toBe(true);
    expect(requestHasPkceVerifierCookie([{ name: "other-cookie", value: "x" }])).toBe(false);
  });

  it("reports verifier Set-Cookie on forgot-password style responses", () => {
    expect(
      responseSetsPkceVerifierCookie([
        "sb-project-auth-token-code-verifier=abc; Path=/; HttpOnly; SameSite=Lax",
      ])
    ).toBe(true);
    expect(responseSetsPkceVerifierCookie(["session=abc; Path=/"])).toBe(false);
  });
});

describe("forgot-password server client architecture", () => {
  it("uses stateless supabase-js rather than @supabase/ssr cookie client", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/api/auth/forgot-password/route.ts", "utf8")
    );
    expect(source).toContain('from "@supabase/supabase-js"');
    expect(source).not.toMatch(/from\s+"@supabase\/ssr"/);
    expect(source).not.toContain("createSupabaseRouteHandlerClient");
    expect(source).toContain("persistSession: false");
    expect(source).toContain("NextResponse.json(GENERIC_OK");
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
