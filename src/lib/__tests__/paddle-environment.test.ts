import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPaddle, paddleCheckoutUrl, paddleEnvironment } from "@/lib/payments/paddle/config";
import { resolvePaddleEnvironment, validatePaddleClientToken } from "@/lib/payments/paddle/environment";

beforeEach(() => {
  vi.stubEnv("PADDLE_ENABLED", "true");
  vi.stubEnv("PADDLE_ENVIRONMENT", "sandbox");
  vi.stubEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT", "sandbox");
  vi.stubEnv("PADDLE_SANDBOX_API_KEY", "pdl_sdbx_apikey_fixture");
  vi.stubEnv("PADDLE_LIVE_API_KEY", "pdl_live_apikey_fixture");
  vi.stubEnv("PADDLE_CHECKOUT_URL", "https://localhost:3006/pay/paddle");
});
afterEach(() => vi.unstubAllEnvs());

describe("Paddle environment isolation (SDK construction only; no network)", () => {
  it.each([undefined, "", "live", "invalid"])("requires explicit valid environment: %s", (value) => {
    expect(() => resolvePaddleEnvironment(value)).toThrow("paddle_environment_required");
  });
  it.each(["sandbox", "production"] as const)("accepts matching %s configuration", (environment) => {
    vi.stubEnv("PADDLE_ENVIRONMENT", environment);
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT", environment);
    expect(paddleEnvironment()).toBe(environment);
    expect(() => getPaddle()).not.toThrow();
    expect(validatePaddleClientToken(environment, environment === "sandbox" ? "test_fixture" : "live_fixture")).toBeTruthy();
  });
  it.each(["sandbox", "production"] as const)("rejects mixed server/client environment from %s", (environment) => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT", environment);
    vi.stubEnv("PADDLE_ENVIRONMENT", environment === "sandbox" ? "production" : "sandbox");
    expect(() => getPaddle()).toThrow("paddle_environment_mismatch");
  });
  it.each(["sandbox", "production"] as const)("rejects wrong %s key/token and never falls back to another key", (environment) => {
    vi.stubEnv("PADDLE_ENVIRONMENT", environment);
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT", environment);
    const name = environment === "sandbox" ? "PADDLE_SANDBOX_API_KEY" : "PADDLE_LIVE_API_KEY";
    vi.stubEnv(name, environment === "sandbox" ? "pdl_live_wrong" : "pdl_sdbx_wrong");
    expect(() => getPaddle()).toThrow("paddle_key_environment_mismatch");
    vi.stubEnv(name, "");
    expect(() => getPaddle()).toThrow("paddle_key_environment_mismatch");
    expect(() => validatePaddleClientToken(environment, environment === "sandbox" ? "live_wrong" : "test_wrong")).toThrow();
  });
  it("requires a non-local HTTPS checkout URL in production", () => {
    vi.stubEnv("PADDLE_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT", "production");
    for (const url of ["", "http://example.test/pay/paddle", "https://localhost:3006/pay/paddle", "https://127.0.0.1/pay/paddle", "https://user:password@example.test/pay/paddle"]) {
      vi.stubEnv("PADDLE_CHECKOUT_URL", url);
      expect(() => paddleCheckoutUrl()).toThrow();
    }
    vi.stubEnv("PADDLE_CHECKOUT_URL", "https://example.test/pay/paddle");
    expect(paddleCheckoutUrl()).toBe("https://example.test/pay/paddle");
  });
});
