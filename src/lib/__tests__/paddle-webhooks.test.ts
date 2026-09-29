import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { EventEntity } from "@paddle/paddle-node-sdk";
import { normalizePaddleEvent, readRawWebhook, verifyPaddleEvent } from "@/lib/payments/paddle/webhooks";
import { getPaddle, paddlePriceId } from "@/lib/payments/paddle/config";

const secret = "test-only-not-a-real-webhook-secret";
const raw = JSON.stringify({ event_id: "evt_test", event_type: "customer.created", occurred_at: new Date().toISOString(),
  data: { id: "ctm_test", name: null, email: "fixture@example.test", status: "active", custom_data: null } });
function sign(body = raw, ts = Math.floor(Date.now() / 1000)) {
  return `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;
}
beforeEach(() => {
  vi.stubEnv("PADDLE_ENABLED", "true"); vi.stubEnv("PADDLE_ENVIRONMENT", "sandbox");
  vi.stubEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT", "sandbox");
  vi.stubEnv("PADDLE_SANDBOX_API_KEY", "pdl_sdbx_apikey_fixture"); vi.stubEnv("PADDLE_WEBHOOK_SECRET", secret);
});
afterEach(() => vi.unstubAllEnvs());

describe("Paddle raw-body signature verification with the official SDK", () => {
  it("verifies and deserializes the original bytes", async () => {
    expect((await verifyPaddleEvent(raw, sign())).eventId).toBe("evt_test");
  });
  it.each(["", "ts=invalid;h1=1234", "ts=1;h1=" + "a".repeat(64)])("rejects invalid header %s", async (header) => {
    await expect(verifyPaddleEvent(raw, header)).rejects.toThrow();
  });
  it("rejects a wrong secret or modified/reformatted payload", async () => {
    await expect(verifyPaddleEvent(raw + " ", sign())).rejects.toThrow();
    vi.stubEnv("PADDLE_WEBHOOK_SECRET", "wrong");
    await expect(verifyPaddleEvent(raw, sign())).rejects.toThrow();
  });
  it.each([-60, 60])("rejects timestamp skew in either direction (%s seconds)", async (offset) => {
    await expect(verifyPaddleEvent(raw, sign(raw, Math.floor(Date.now() / 1000) + offset))).rejects.toThrow();
  });
  it("accepts a matching rotated signature among multiple h1 values", async () => {
    expect((await verifyPaddleEvent(raw, sign() + ";h1=" + "f".repeat(64))).eventId).toBe("evt_test");
  });
  it("bounds actual streamed bytes without parsing/reformatting JSON", async () => {
    expect(await readRawWebhook(new Request("http://local", { method: "POST", body: raw }))).toBe(raw);
    await expect(readRawWebhook(new Request("http://local", { method: "POST", body: "x".repeat(1048577) }))).rejects.toThrow("too_large");
  });
  it("fails closed for mixed credentials, mismatched environments, and disabled flag", () => {
    vi.stubEnv("PADDLE_SANDBOX_API_KEY", "pdl_live_forbidden"); expect(() => getPaddle()).toThrow();
    vi.stubEnv("PADDLE_SANDBOX_API_KEY", "pdl_sdbx_fixture");
    vi.stubEnv("PADDLE_ENVIRONMENT", "production"); expect(() => getPaddle()).toThrow();
    vi.stubEnv("PADDLE_ENVIRONMENT", "sandbox"); vi.stubEnv("PADDLE_ENABLED", "false");
    expect(() => getPaddle()).toThrow(); expect(() => paddlePriceId("invented-plan")).toThrow();
  });
});

function completed(overrides: Record<string, unknown> = {}) {
  return { eventId: "evt_test", eventType: "transaction.completed", occurredAt: new Date().toISOString(),
    data: { id: "txn_test", status: "completed", origin: "api", customerId: "ctm_test", subscriptionId: "sub_test",
      currencyCode: "EUR", discountId: null, customData: { maro_app: "maro",
        maro_user_id: "11111111-1111-4111-8111-111111111111", maro_order_id: "22222222-2222-4222-8222-222222222222" },
      items: [{ quantity: 1, proration: null, price: { id: "pri_test", unitPrice: { amount: "900", currencyCode: "EUR" } } }],
      details: { totals: { total: "900" } }, billingPeriod: { startsAt: "2026-09-29", endsAt: "2026-10-29" }, ...overrides,
    } } as unknown as EventEntity;
}
describe("Paddle event filtering and payment invariants", () => {
  it("only normalizes completed, full-price, single-quantity transactions", () => {
    expect(normalizePaddleEvent(completed())).toMatchObject({ kind: "transaction", amount: 900, currency: "EUR" });
  });
  it.each([
    { status: "paid" }, { origin: "subscription_update" }, { discountId: "discount" },
    { details: null }, { currencyCode: "USD" }, { details: { totals: { total: "899" } } },
    { items: [] }, { items: [{ quantity: 2 }] }, { customerId: null },
  ])("rejects incomplete or altered payment %j", (data) => {
    expect(() => normalizePaddleEvent(completed(data))).toThrow();
  });
  it("ignores unrelated account events and payment failures", () => {
    expect(normalizePaddleEvent(completed({ customData: null })).kind).toBe("ignored");
    const event = { ...completed(), eventType: "transaction.payment_failed" } as unknown as EventEntity;
    expect(normalizePaddleEvent(event).kind).toBe("ignored");
  });
});
