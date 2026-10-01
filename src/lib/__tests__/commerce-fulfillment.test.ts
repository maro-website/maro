import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCommercialSnapshot,
  getLowestEffectiveCreditSellRateEur,
  resolveCheckoutItem,
} from "@/lib/commerce/plans";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: { message: "no db" } })),
        })),
      })),
    })),
  })),
}));

describe("commerce catalog fallbacks", () => {
  it("resolves standard plan checkout item from fallback", async () => {
    const item = await resolveCheckoutItem("standard");
    expect(item?.orderKind).toBe("plan_purchase");
    expect(item?.priceCents).toBe(900);
    expect(item?.credits).toBe(100);
  });

  it("computes upgrade delta from fallback config", async () => {
    const item = await resolveCheckoutItem("upgrade-pro", { upgrade: true });
    expect(item?.orderKind).toBe("plan_upgrade");
    expect(item?.priceCents).toBe(2600);
    expect(item?.credits).toBe(400);
  });

  it("builds immutable commercial snapshot", async () => {
    const item = await resolveCheckoutItem("pro");
    expect(item).not.toBeNull();
    const snap = buildCommercialSnapshot(item!);
    expect(snap.order_kind).toBe("plan_purchase");
    expect(snap.price_cents).toBe(3500);
    expect(snap.credits_snapshot).toBe(500);
  });

  it("derives lowest effective sell rate dynamically", async () => {
    const rate = await getLowestEffectiveCreditSellRateEur();
    expect(rate).toBeCloseTo(0.07, 5);
  });
});
