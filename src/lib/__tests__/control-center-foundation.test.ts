import { describe, expect, it, vi, afterEach } from "vitest";
import {
  hasPermission,
  resolveAccessRole,
  permissionsForRole,
} from "@/lib/admin/permissions";
import { isTestPaymentAllowed, testPaymentBlockReason } from "@/lib/payments/testMode";

describe("RBAC permissions", () => {
  it("maps legacy is_admin to super_admin", () => {
    expect(resolveAccessRole({ is_admin: true })).toBe("super_admin");
  });

  it("returns null for normal users", () => {
    expect(resolveAccessRole({ is_admin: false, access_role: null })).toBeNull();
  });

  it("denies editor financial permissions", () => {
    expect(hasPermission("editor", "credits.adjust")).toBe(false);
    expect(hasPermission("editor", "payments.refund")).toBe(false);
    expect(hasPermission("editor", "presets.manage")).toBe(true);
  });

  it("denies developer billing permissions", () => {
    expect(hasPermission("developer", "credits.adjust")).toBe(false);
    expect(hasPermission("developer", "security.manage")).toBe(true);
  });

  it("grants administrator broad operational access", () => {
    expect(hasPermission("administrator", "payments.refund")).toBe(true);
    expect(hasPermission("administrator", "users.manage")).toBe(true);
  });

  it("super_admin has all defined permissions", () => {
    for (const p of permissionsForRole("super_admin")) {
      expect(hasPermission("super_admin", p)).toBe(true);
    }
  });
});

describe("test payment isolation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks test payment when PAYMENT_MODE is live", () => {
    vi.stubEnv("PAYMENT_MODE", "live");
    expect(isTestPaymentAllowed()).toBe(false);
    expect(testPaymentBlockReason()).toBe("live_mode");
  });

  it("allows test payment in non-production test mode", () => {
    vi.stubEnv("PAYMENT_MODE", "test");
    vi.stubEnv("NODE_ENV", "development");
    expect(isTestPaymentAllowed()).toBe(true);
  });

  it("blocks test payment in production unless ALLOW_TEST_PAYMENTS=true", () => {
    vi.stubEnv("PAYMENT_MODE", "test");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_TEST_PAYMENTS", "");
    expect(isTestPaymentAllowed()).toBe(false);
    expect(testPaymentBlockReason()).toBe("production_requires_allow_test_payments");
  });
});
