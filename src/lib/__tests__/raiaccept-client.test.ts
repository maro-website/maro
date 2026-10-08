import { describe, expect, it, vi } from "vitest";
import { RaiAcceptClient } from "@/lib/payments/raiaccept/client";
import { RaiAcceptError } from "@/lib/payments/raiaccept/errors";
import { buildRaiAcceptPayload, centsFromApiAmount, parseRaiAcceptCheckout, parseRaiAcceptOrder } from "@/lib/payments/raiaccept/contract";
import { raiAcceptCheckoutEnabled, readRaiAcceptConfig } from "@/lib/payments/raiaccept/config";
import type { CreditOrderRow } from "@/lib/payments/orders";

const config = { environment: "sandbox" as const, merchantAccountId: "P-007-MA-TEST", username: "mock-user", password: "mock-password", appOrigin: "https://staging.example.com" };
const reference = "MARO-S-12345678-1234-4123-8123-123456789abc";
const rawOrder = () => ({ orderIdentification: "P-007-ORD-TEST", status: "DRAFT", isProduction: false,
  merchant: { merchantAccountId: config.merchantAccountId }, invoice: { amount: 9, currency: "EUR", merchantOrderReference: reference } });
const auth = () => new Response(JSON.stringify({ accessToken: "mock-access", accessTokenExpiresIn: 299, refreshToken: "mock-refresh", refreshTokenExpiresIn: 86399 }));
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const makeOrder = (): CreditOrderRow => ({ id: "12345678-1234-4123-8123-123456789abc", user_id: "test-user", user_email: "owner@example.com", credits: 100,
  amount_cents: 900, currency: "EUR", status: "pending", provider: "raiaccept", item_type: "plan", item_id: "standard", order_kind: "plan_purchase", membership_id: null,
  commercial_snapshot: { captured_at: "2026-10-08T00:00:00Z", order_kind: "plan_purchase", price_cents: 900, currency: "EUR", credits_snapshot: 100, duration_days: 30, plan_name_snapshot: "maroStandard" },
  billing_snapshot: { fullName: "Test Customer", email: "test@example.com", country: "Kosovo", city: "Prishtine", legalConsent: true }, created_at: "2026-10-08T00:00:00Z" });
const payload = () => buildRaiAcceptPayload(makeOrder(), config.appOrigin, "sandbox");

describe("RaiAccept frozen financial contract", () => {
  it("builds the documented nested invoice from the frozen order", () => {
    const body = payload();
    expect(body.invoice).toMatchObject({ amount: 9, currency: "EUR", merchantOrderReference: reference,
      items: [{ numberOfItems: 1, price: 9, description: "maroStandard" }] });
    expect(body).not.toHaveProperty("items");
    expect(body.recurring.recurringModel).toBe("NONE");
    expect(body.urls.notificationUrl).toBe("https://staging.example.com/api/payments/raiaccept/webhook");
    expect(new URL(body.urls.cancelUrl).searchParams.get("orderId")).toBe(makeOrder().id);
  });
  it("separates references for the same UUID in different environments", () => {
    expect(buildRaiAcceptPayload(makeOrder(), "https://maro.al", "production").invoice.merchantOrderReference).not.toBe(reference);
  });
  it.each([9, 9.01, 35, 75])("converts %s EUR to exact integer cents", amount => {
    expect(centsFromApiAmount(amount)).toBe(Math.round(amount * 100));
  });
  it.each(["9", 0, -1, 9.001, NaN, Infinity, 1e-7])("rejects invalid API money %s", amount => {
    expect(() => centsFromApiAmount(amount)).toThrow("raiaccept_invalid_amount");
  });
  it("rejects catalog/snapshot drift and unsupported promotions before calling the bank", () => {
    expect(() => buildRaiAcceptPayload({ ...makeOrder(), amount_cents: 100 }, config.appOrigin, "sandbox")).toThrow("snapshot");
    expect(() => buildRaiAcceptPayload({ ...makeOrder(), credits: 500 }, config.appOrigin, "sandbox")).toThrow("snapshot");
    expect(() => buildRaiAcceptPayload({ ...makeOrder(), promo_code: "PROMO" }, config.appOrigin, "sandbox")).toThrow("promo_not_supported");
  });
  it.each([true, "false", 0, undefined])("never infers Sandbox from the P- prefix or isProduction=%s", isProduction => {
    expect(() => parseRaiAcceptOrder({ ...rawOrder(), isProduction }, config)).toThrow("environment_mismatch");
  });
  it("rejects wrong merchants, currency and unknown statuses", () => {
    expect(() => parseRaiAcceptOrder({ ...rawOrder(), merchant: { merchantAccountId: "OTHER" } }, config)).toThrow("merchant_mismatch");
    expect(() => parseRaiAcceptOrder({ ...rawOrder(), invoice: { ...rawOrder().invoice, currency: "USD" } }, config)).toThrow("currency_mismatch");
    expect(() => parseRaiAcceptOrder({ ...rawOrder(), status: "SUCCESS" }, config)).toThrow("invalid_order_status");
  });
  it.each(["http://payment.raiaccept.com/checkout?paymentSession=TEST", "https://payment.raiaccept.com.evil.example/checkout?paymentSession=TEST",
    "https://user@payment.raiaccept.com/checkout?paymentSession=TEST", "https://payment.raiaccept.com/checkout?paymentSession=OTHER",
    "https://payment.raiaccept.com/checkout?paymentSession=TEST&paymentSession=OTHER"]) ("rejects untrusted or mismatched session %s", paymentRedirectURL => {
    expect(() => parseRaiAcceptCheckout({ sessionId: "TEST", paymentRedirectURL })).toThrow("checkout_url");
  });
});

describe("RaiAccept transport and recovery boundaries", () => {
  it("shares one authentication request across concurrent reads", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockImplementation(() => Promise.resolve(response(rawOrder())));
    const api = new RaiAcceptClient(config, { fetch: transport });
    const orders = await Promise.all([api.getOrder("P-007-ORD-TEST"), api.getOrder("P-007-ORD-TEST")]);
    expect(orders.map(order => order.amountCents)).toEqual([900, 900]);
    expect(transport.mock.calls.filter(call => String(call[0]).endsWith("/login"))).toHaveLength(1);
  });
  it("refreshes without expecting a replacement refresh token", async () => {
    let now = 0;
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockResolvedValueOnce(response(rawOrder()))
      .mockResolvedValueOnce(response({ accessToken: "refreshed-access", accessTokenExpiresIn: 299 })).mockResolvedValueOnce(response(rawOrder()));
    const api = new RaiAcceptClient(config, { fetch: transport, now: () => now });
    await api.getOrder("P-007-ORD-TEST");
    now = 290_000;
    await api.getOrder("P-007-ORD-TEST");
    expect(transport.mock.calls[2][0]).toBe("https://auth.raiaccept.com/auth/api/refresh");
    expect(JSON.parse(transport.mock.calls[2][1].body)).toMatchObject({ refreshToken: "mock-refresh" });
    expect(transport.mock.calls[3][1].headers.Authorization).toBe("Bearer refreshed-access");
  });
  it("uses GET for transaction discovery, as verified in Sandbox", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockResolvedValueOnce(response([]));
    await expect(new RaiAcceptClient(config, { fetch: transport }).listTransactions("P-007-ORD-TEST")).resolves.toEqual([]);
    expect(transport.mock.calls[1][1].method).toBe("GET");
  });
  it("does not retry an indeterminate create and does not expose raw errors", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockRejectedValueOnce(new Error("mock-password mock-access internal failure"));
    const error = await new RaiAcceptClient(config, { fetch: transport }).createOrder(payload()).catch(value => value);
    expect(error).toBeInstanceOf(RaiAcceptError);
    expect(error.code).toBe("raiaccept_network_error");
    expect(error.indeterminate).toBe(true);
    expect(String(error)).not.toMatch(/mock-password|mock-access|internal failure/);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("treats a mismatched 201 as requiring review, not a new create", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockResolvedValueOnce(response({ ...rawOrder(), isProduction: true }, 201));
    await expect(new RaiAcceptClient(config, { fetch: transport }).createOrder(payload())).rejects.toMatchObject({ indeterminate: true });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("reuses the exact frozen invoice for order/session creation", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockResolvedValueOnce(response(rawOrder(), 201))
      .mockResolvedValueOnce(response(rawOrder())).mockResolvedValueOnce(response({ sessionId: "SESSION", paymentRedirectURL: "https://payment.raiaccept.com/checkout?paymentSession=SESSION" }, 201));
    const api = new RaiAcceptClient(config, { fetch: transport });
    const body = payload();
    const order = await api.createOrder(body);
    await expect(api.createCheckout(order.id, body)).resolves.toMatchObject({ sessionId: "SESSION" });
    expect(transport.mock.calls[1][1].body).toBe(transport.mock.calls[3][1].body);
  });
  it("does not create a second session for an order already in Checkout", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockResolvedValueOnce(response({ ...rawOrder(), status: "CHECKOUT" }));
    await expect(new RaiAcceptClient(config, { fetch: transport }).createCheckout("P-007-ORD-TEST", payload())).rejects.toThrow("already_started");
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("discards provider error bodies and treats HTTP 500 POST as indeterminate", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockResolvedValueOnce(response({ password: "DO-NOT-PRINT" }, 500));
    const error = await new RaiAcceptClient(config, { fetch: transport }).createOrder(payload()).catch(value => value);
    expect(error).toMatchObject({ code: "raiaccept_http_error", httpStatus: 500, indeterminate: true });
    expect(JSON.stringify(error)).not.toContain("DO-NOT-PRINT");
  });
  it("bounds a timed-out create and records uncertainty without retrying", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("raw timeout detail")), { once: true });
    }));
    await expect(new RaiAcceptClient(config, { fetch: transport, timeoutMs: 5 }).createOrder(payload()))
      .rejects.toMatchObject({ code: "raiaccept_timeout", indeterminate: true });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("bounds response size after a create rather than repeating it", async () => {
    const transport = vi.fn().mockResolvedValueOnce(auth()).mockResolvedValueOnce(response({ large: "x".repeat(300_000) }));
    await expect(new RaiAcceptClient(config, { fetch: transport }).createOrder(payload()))
      .rejects.toMatchObject({ code: "raiaccept_response_too_large", indeterminate: true });
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

describe("RaiAccept isolation and rollout configuration", () => {
  const env = () => ({ RAIACCEPT_ENABLED: "true", RAIACCEPT_ENVIRONMENT: "sandbox", RAIACCEPT_API_USERNAME: "mock-user", RAIACCEPT_API_PASSWORD: "mock-password",
    RAIACCEPT_MERCHANT_ACCOUNT_ID: config.merchantAccountId, APP_ORIGIN: config.appOrigin,
    RAIACCEPT_DATABASE_PROJECT_REF: "abcdefghijklmnopqrst", NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" });
  it("requires explicit credentials/environment and an isolated database", () => {
    expect(readRaiAcceptConfig(env()).environment).toBe("sandbox");
    expect(() => readRaiAcceptConfig({ ...env(), RAIACCEPT_ENVIRONMENT: "" })).toThrow("environment_required");
    expect(() => readRaiAcceptConfig({ ...env(), RAIACCEPT_API_PASSWORD: "" })).toThrow("credentials_required");
    expect(() => readRaiAcceptConfig({ ...env(), RAIACCEPT_DATABASE_PROJECT_REF: "pbhzobqpavkuttdipjaq", NEXT_PUBLIC_SUPABASE_URL: "https://pbhzobqpavkuttdipjaq.supabase.co" })).toThrow("database_environment_mismatch");
  });
  it("keeps callbacks off production during Sandbox staging", () => {
    expect(() => readRaiAcceptConfig({ ...env(), APP_ORIGIN: "https://maro.al" })).toThrow("app_origin");
    expect(() => readRaiAcceptConfig({ ...env(), APP_ORIGIN: "https://staging.example.com/redirect" })).toThrow("app_origin");
  });
  it("allows only named users until public release and separates the checkout gate", () => {
    const flags = { RAIACCEPT_ENABLED: "true", RAIACCEPT_CHECKOUT_ENABLED: "true", RAIACCEPT_RECOVERY_ENABLED: "true", CRON_SECRET:"fixture-cron", RAIACCEPT_CHECKOUT_USER_IDS: "test-user" };
    expect(raiAcceptCheckoutEnabled("test-user", flags)).toBe(true);
    expect(raiAcceptCheckoutEnabled("test-user", {...flags,RAIACCEPT_RECOVERY_ENABLED:"false"})).toBe(false);
    expect(raiAcceptCheckoutEnabled("test-user", {...flags,CRON_SECRET:""})).toBe(false);
    expect(raiAcceptCheckoutEnabled("someone-else", flags)).toBe(false);
    expect(raiAcceptCheckoutEnabled("test-user", { ...flags, RAIACCEPT_CHECKOUT_ENABLED: "false" })).toBe(false);
    expect(raiAcceptCheckoutEnabled("someone-else", { ...flags, RAIACCEPT_PUBLIC_RELEASE: "true" })).toBe(true);
  });
});
