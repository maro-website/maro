import { describe, expect, it } from "vitest";
import { checkoutProvider, checkoutEntryUrl, checkoutDestination } from "@/lib/payments/checkout-routing";

describe("explicit Paddle checkout routing", () => {
  it("preserves Paddle across a refreshed URL and sign-in round trip", () => {
    const entry = checkoutEntryUrl("standard", "paddle");
    const next = new URLSearchParams({ next: entry });
    const restored = new URL(new URLSearchParams(next.toString()).get("next")!, "http://localhost");
    const provider = checkoutProvider(restored.searchParams.get("provider"));
    expect(provider).toBe("paddle");
    expect(checkoutDestination(provider!, true)).toEqual({ endpoint: "/api/payments/paddle/checkout", paymentPath: "/pay/paddle" });
  });
  it("fails closed when Paddle is disabled, never choosing legacy routes", () => {
    expect(() => checkoutDestination("paddle", false)).toThrow("paddle_unavailable");
  });
  it("defaults old provider-less purchase links to Paddle", () => {
    expect(checkoutProvider(null)).toBe("paddle");
    expect(checkoutEntryUrl("topup-100")).toBe("/checkout?item=topup-100&provider=paddle");
    expect(checkoutDestination(checkoutProvider(null)!, true)).toEqual({ endpoint: "/api/payments/paddle/checkout", paymentPath: "/pay/paddle" });
  });
  it("rejects an unknown explicit provider instead of defaulting to legacy", () => {
    expect(checkoutProvider("paddel")).toBeNull();
    expect(checkoutProvider("existing")).toBeNull();
    expect(checkoutProvider("raiffeisen")).toBeNull();
  });
});
