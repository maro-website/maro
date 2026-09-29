import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), rate: vi.fn(), enabled: vi.fn(), create: vi.fn(), portal: vi.fn(),
  from: vi.fn(), rpc: vi.fn(), verify: vi.fn(), normalize: vi.fn(), ownedOrder: vi.fn(),
}));
vi.mock("@/lib/payments/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/security/rateLimit", () => ({ enforceRateLimit: mocks.rate }));
vi.mock("@/lib/payments/paddle/config", () => ({ paddleEnabled: mocks.enabled,
  getPaddle: () => ({ customerPortalSessions: { create: mocks.portal } }) }));
vi.mock("@/lib/payments/paddle/checkout", () => ({ createPaddleCheckout: mocks.create }));
vi.mock("@/lib/payments/orders", () => ({ getOrderForUser: mocks.ownedOrder }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/lib/payments/paddle/webhooks", () => ({
  readRawWebhook: (request: Request) => request.text(), verifyPaddleEvent: mocks.verify, normalizePaddleEvent: mocks.normalize,
}));
import { POST as checkout } from "@/app/api/payments/paddle/checkout/route";
import { POST as portal } from "@/app/api/payments/paddle/portal/route";
import { POST as webhook } from "@/app/api/webhooks/paddle/route";
import { GET as orderStatus } from "@/app/api/payments/order/route";

const user = { id: "owner", email: "owner@example.test" };
const input = { itemId: "standard", fullName: "Owner", country: "DE", city: "Berlin", legalConsent: true };
const request = (body: unknown = input) => new Request("http://localhost/api", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});
let query: Record<string, ReturnType<typeof vi.fn>>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.enabled.mockReturnValue(true); mocks.user.mockResolvedValue(user); mocks.rate.mockResolvedValue({ allowed: true });
  query = Object.fromEntries(["select", "eq", "not", "order", "limit"].map((name) => [name, vi.fn(() => query)]));
  query.maybeSingle = vi.fn().mockResolvedValue({ data: { paddle_customer_id: "ctm_owned" }, error: null });
  mocks.from.mockReturnValue(query);
  mocks.portal.mockResolvedValue({ urls: { general: { overview: "https://customer-portal.paddle.com/session" } } });
  mocks.create.mockResolvedValue({ orderId: "order", transactionId: "txn" });
  mocks.verify.mockResolvedValue({ eventId: "evt_verified" });
  mocks.normalize.mockReturnValue({ eventId: "evt_verified", kind: "ignored" });
  mocks.rpc.mockResolvedValue({ error: null });
});
afterEach(() => vi.restoreAllMocks());

describe("Paddle HTTP security boundaries", () => {
  it("order polling returns the bound Paddle transaction needed to reopen checkout", async () => {
    mocks.ownedOrder.mockResolvedValue({ id: "order", status: "pending", provider: "paddle", provider_transaction_id: "txn_bound", amount_cents: 900 });
    const response = await orderStatus(new Request("http://localhost/api/payments/order?orderId=order"));
    expect(mocks.ownedOrder).toHaveBeenCalledWith("order", user.id);
    expect((await response.json()).order).toMatchObject({ provider: "paddle", providerTransactionId: "txn_bound", status: "pending" });
  });
  it("order polling denies an order outside the authenticated account", async () => {
    mocks.ownedOrder.mockResolvedValue(null);
    expect((await orderStatus(new Request("http://localhost/api/payments/order?orderId=victim"))).status).toBe(404);
    expect(mocks.ownedOrder).toHaveBeenCalledWith("victim", user.id);
  });
  it.each([checkout, portal, webhook])("is unavailable while disabled", async (handler) => {
    mocks.enabled.mockReturnValue(false);
    expect((await handler(request())).status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.verify).not.toHaveBeenCalled();
  });
  it.each([checkout, portal])("requires authenticated identity before any provider/database work", async (handler) => {
    mocks.user.mockResolvedValue(null);
    expect((await handler(request())).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.portal).not.toHaveBeenCalled();
  });
  it.each([checkout, portal])("enforces authenticated rate limits", async (handler) => {
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await handler(request())).status).toBe(429);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("checkout uses session identity and drops client-supplied customer, price and credit amounts", async () => {
    const response = await checkout(request({ ...input, userId: "victim", email: "victim@example.test",
      customerId: "ctm_victim", priceId: "pri_discounted", credits: 99999, amount: 1 }));
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(user, "standard", { fullName: "Owner", email: user.email, country: "DE", city: "Berlin", legalConsent: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each([{ legalConsent: false }, { promoCode: "DISCOUNT" }, { city: "" }])("rejects incomplete or unsupported checkout %j", async (overrides) => {
    expect((await checkout(request({ ...input, ...overrides }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("portal resolves paid customer ownership server-side and mints a new session every request", async () => {
    for (let i = 0; i < 2; i++) {
      const response = await portal(request({ customerId: "ctm_victim", userId: "victim" }));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ url: "https://customer-portal.paddle.com/session" });
    }
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("status", "paid");
    expect(mocks.portal).toHaveBeenCalledTimes(2);
    expect(mocks.portal).toHaveBeenCalledWith("ctm_owned", []);
  });
  it("cannot open a portal without an owned paid customer", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await portal(request())).status).toBe(404);
    expect(mocks.portal).not.toHaveBeenCalled();
  });
  it("fails closed when portal ownership lookup fails", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    expect((await portal(request())).status).toBe(503);
    expect(mocks.portal).not.toHaveBeenCalled();
  });
  it("never reaches fulfillment after failed webhook verification", async () => {
    mocks.verify.mockRejectedValue(new Error("invalid_signature"));
    expect((await webhook(request())).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns a retryable failure on database errors and acknowledges only successful processing", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { message: "temporary outage" } });
    expect((await webhook(request())).status).toBe(500);
    expect((await webhook(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("apply_paddle_event", { p_event: { eventId: "evt_verified", kind: "ignored" } });
  });
  it.each(["invalid_signature_timestamp", "empty_webhook"])("rejects %s without retryable server failure", async (reason) => {
    mocks.verify.mockRejectedValue(new Error(reason));
    expect((await webhook(request())).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps a missing signing secret retryable", async () => {
    mocks.verify.mockRejectedValue(new Error("paddle_webhook_secret_missing"));
    expect((await webhook(request())).status).toBe(500);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
