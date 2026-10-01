import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfirmedOrder } from "@/lib/payments/confirmedOrder";

const paidOrder = { id: "order-1", status: "paid", label: "maroPro", priceEur: 35, credits: 500 };

afterEach(() => vi.unstubAllGlobals());

describe("payment confirmation presentation", () => {
  it("requires an order and existing authentication without sending a request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const token = vi.fn().mockResolvedValue(null);
    expect(await loadConfirmedOrder("", token)).toBeNull();
    expect(token).not.toHaveBeenCalled();
    expect(await loadConfirmedOrder("order-1", token)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses only the existing authenticated read endpoint for a paid order", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ order: paidOrder }));
    vi.stubGlobal("fetch", fetcher);
    expect(await loadConfirmedOrder("order-1", async () => "token")).toMatchObject(paidOrder);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/api/payments/order?orderId=order-1", {
      headers: { Authorization: "Bearer token" }, cache: "no-store", signal: undefined,
    });
  });

  it.each(["pending", "failed", "cancelled", "refunded", "success", undefined])(
    "does not confirm status %s", async (status) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ order: { ...paidOrder, status } })));
      expect(await loadConfirmedOrder("order-1", async () => "token")).toBeNull();
    }
  );

  it.each([401, 403, 404, 500])("fails closed for HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ order: paidOrder }, { status })));
    expect(await loadConfirmedOrder("order-1", async () => "token")).toBeNull();
  });

  it.each([null, {}, { order: null }, { order: { ...paidOrder, id: "other-order" } },
    { order: { id: "order-1", status: "paid" } }])("rejects mismatched or incomplete responses", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    expect(await loadConfirmedOrder("order-1", async () => "token")).toBeNull();
  });

  it("fails closed for network errors, invalid JSON, and session errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await loadConfirmedOrder("order-1", async () => "token")).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));
    expect(await loadConfirmedOrder("order-1", async () => "token")).toBeNull();
    expect(await loadConfirmedOrder("order-1", async () => { throw new Error("session expired"); })).toBeNull();
  });

  it("does not request an order after the confirmation context is cancelled", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const controller = new AbortController();
    controller.abort();
    expect(await loadConfirmedOrder("order-1", async () => "token", controller.signal)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
