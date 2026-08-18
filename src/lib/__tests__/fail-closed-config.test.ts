import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  denyProtectedOperationWithoutSupabase,
  getSecurityConfigStatus,
  isPaymentModeValid,
  isProduction,
  isSupabaseServerConfigured,
  isTurnstileRequired,
  paymentModeStrict,
  resolvePaymentMode,
} from "@/lib/config/serverEnv";
import { authorizeCronRequest } from "@/lib/security/cronAuth";
import { isTestPaymentAllowed, testPaymentBlockReason } from "@/lib/payments/testMode";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

const AI_ROUTES = [
  "src/app/api/ai/generate/route.ts",
  "src/app/api/ai/image/route.ts",
  "src/app/api/ai/chat/route.ts",
  "src/app/api/ai/edit/route.ts",
  "src/app/api/ai/edit-html/route.ts",
  "src/app/api/ai/audio/route.ts",
] as const;

function readRoute(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Batch S2 — server environment classification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats unknown PAYMENT_MODE as invalid in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_MODE", "staging");
    expect(resolvePaymentMode()).toBe("invalid");
    expect(isPaymentModeValid()).toBe(false);
    expect(paymentModeStrict()).toBe("live");
  });

  it("defaults PAYMENT_MODE to test outside production when unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENT_MODE", "");
    expect(resolvePaymentMode()).toBe("test");
    expect(isPaymentModeValid()).toBe(true);
  });

  it("requires explicit PAYMENT_MODE in production when unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_MODE", "");
    expect(resolvePaymentMode()).toBe("invalid");
  });
});

describe("Batch S2 — Supabase fail-closed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies protected operations in production when Supabase server config is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(isSupabaseServerConfigured()).toBe(false);
    const deny = denyProtectedOperationWithoutSupabase(false);
    expect(deny.denied).toBe(true);
    expect(deny.response.status).toBe(503);
  });

  it("allows development to proceed without Supabase server config", () => {
    vi.stubEnv("NODE_ENV", "development");
    const deny = denyProtectedOperationWithoutSupabase(false);
    expect(deny.denied).toBe(false);
  });

  it("all AI routes import production Supabase guard", () => {
    for (const route of AI_ROUTES) {
      const source = readRoute(route);
      expect(source).toContain("denyIfProductionWithoutSupabase");
      expect(source).not.toContain("entitled = !supabaseServerConfigured()");
    }
  });
});

describe("Batch S2 — test payment lockdown", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never allows test payment fulfillment in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_MODE", "test");
    vi.stubEnv("ALLOW_TEST_PAYMENTS", "true");
    expect(isTestPaymentAllowed()).toBe(false);
    expect(testPaymentBlockReason()).toBe("production_blocked");
  });

  it("allows test payments only in non-production test mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENT_MODE", "test");
    expect(isTestPaymentAllowed()).toBe(true);
  });

  it("blocks test payments when payment mode is invalid", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENT_MODE", "staging");
    expect(isTestPaymentAllowed()).toBe(false);
    expect(testPaymentBlockReason()).toBe("invalid_payment_mode");
  });

  it("pay/test page is gated server-side", () => {
    const page = readRoute("src/app/pay/test/page.tsx");
    expect(page).toContain("isTestPaymentAllowed()");
    expect(page).toContain("notFound()");
  });

  it("pay/redirect does not route production users to simulator", () => {
    const page = readRoute("src/app/pay/redirect/page.tsx");
    expect(page).toContain("PayRedirectUnavailableClient");
    expect(page).toContain("isTestPaymentAllowed()");
  });

  it("complete-test route validates payment mode and test allowance", () => {
    const route = readRoute("src/app/api/payments/complete-test/route.ts");
    expect(route).toContain("isPaymentModeValid()");
    expect(route).toContain("isTestPaymentAllowed()");
    expect(route).toContain("fulfillCreditOrder");
  });
});

describe("Batch S2 — Turnstile fail-closed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires Turnstile only when signup is enabled in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "");
    expect(isTurnstileRequired()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "true");
    expect(isTurnstileRequired()).toBe(true);
  });

  it("rejects signup verification in production when Turnstile secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "true");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const result = await verifyTurnstileToken("token");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("turnstile_not_configured");
  });

  it("allows explicit development bypass when Turnstile secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "true");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const result = await verifyTurnstileToken("token");
    expect(result.ok).toBe(true);
  });
});

describe("Batch S2 — cron authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies production cron when CRON_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    expect(authorizeCronRequest(new Request("http://localhost/api/cron/test"))).toBe(
      "misconfigured"
    );
  });

  it("denies wrong cron secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "expected-secret");
    const req = new Request("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(authorizeCronRequest(req)).toBe("unauthorized");
  });

  it("allows correct cron secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "expected-secret");
    const req = new Request("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer expected-secret" },
    });
    expect(authorizeCronRequest(req)).toBe("ok");
  });

  it("cron routes use shared authorizeCronRequest", () => {
    for (const route of [
      "src/app/api/cron/cleanup-temp/route.ts",
      "src/app/api/cron/data-retention/route.ts",
      "src/app/api/cron/reconcile-stale-jobs/route.ts",
    ]) {
      expect(readRoute(route)).toContain("authorizeCronRequest");
    }
  });
});

describe("Batch S2 — security config health snapshot", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports non-secret configuration status", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("PAYMENT_MODE", "live");
    vi.stubEnv("CRON_SECRET", "secret");
    const status = getSecurityConfigStatus();
    expect(status.supabaseServer).toBe("OK");
    expect(status.paymentMode).toBe("live");
    expect(status.testPayments).toBe("DISABLED");
    expect(status.cronSecret).toBe("CONFIGURED");
    expect(JSON.stringify(status)).not.toContain("service-key");
  });

  it("admin security route exposes securityConfig without secrets", () => {
    const route = readRoute("src/app/api/admin/security/route.ts");
    expect(route).toContain("getSecurityConfigStatus()");
    expect(route).toContain("securityConfig");
  });
});

describe("Batch S2 — production detection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NODE_ENV for production detection", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProduction()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(isProduction()).toBe(false);
  });
});
