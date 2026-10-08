import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ membership: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getProfileCredits: mocks.profile, getSupabaseAdmin: () => { throw new Error("no_test_database"); } }));
vi.mock("@/lib/commerce/memberships", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/commerce/memberships")>(),
  getLatestMembership: mocks.membership, countUserWorkspaces: async () => 1,
}));
import { resolveEntitlements } from "@/lib/commerce/entitlements";
import { resolveOrderItem } from "@/lib/payments/orders";

const active = {
  id: "manual-plan", user_id: "owner", plan_id: "pro", payment_provider: null,
  paddle_status: null, started_at: "2026-10-05T18:50:31.000Z", expires_at: "2026-11-04T18:50:31.000Z",
  renewal_mode: "manual", suspended: false, renewal_window_days: 7, business_overrides: {}, cycle_renewal_fulfilled_at: null,
};
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-08T21:30:00.000Z"));
  mocks.profile.mockResolvedValue({ credits: 50, credits_reserved: 0 }); mocks.membership.mockResolvedValue({ ...active });
});
afterEach(() => vi.useRealTimers());

describe("canonical membership agrees with checkout eligibility", () => {
  it("shows a manually granted Pro as active, permits a top-up, and rejects a duplicate plan", async () => {
    expect(await resolveEntitlements("owner")).toMatchObject({ plan_id: "pro", plan_status: "ACTIVE", can_top_up: true, renewal_available: false });
    expect(await resolveOrderItem("owner", "topup-100")).toMatchObject({ ok: true, orderKind: "topup", item: { priceCents: 900, credits: 100 } });
    expect(await resolveOrderItem("owner", "pro")).toEqual({ ok: false, error: "plan_already_active" });
  });
  it("offers a new plan and refuses top-ups for an account without membership", async () => {
    mocks.membership.mockResolvedValue(null);
    expect(await resolveEntitlements("owner")).toMatchObject({ plan_status: "NO_PLAN", can_top_up: false });
    expect(await resolveOrderItem("owner", "topup-100")).toEqual({ ok: false, error: "topup_requires_active_plan" });
    expect(await resolveOrderItem("owner", "standard")).toMatchObject({ ok: true, orderKind: "plan_purchase" });
  });
  it("does not let expired manual grants authorize top-ups", async () => {
    mocks.membership.mockResolvedValue({ ...active, expires_at: "2026-09-19T02:23:18.000Z" });
    expect(await resolveEntitlements("owner")).toMatchObject({ plan_status: "EXPIRED", can_top_up: false });
    expect(await resolveOrderItem("owner", "topup-100")).toEqual({ ok: false, error: "topup_requires_active_plan" });
    expect(await resolveOrderItem("owner", "pro")).toMatchObject({ ok: true });
  });
  it("keeps suspended business memberships ineligible for top-ups", async () => {
    mocks.membership.mockResolvedValue({ ...active, plan_id: "business", suspended: true });
    expect(await resolveEntitlements("owner")).toMatchObject({ plan_status: "BUSINESS_SUSPENDED", can_top_up: false });
    expect(await resolveOrderItem("owner", "topup-100")).toEqual({ ok: false, error: "topup_requires_active_plan" });
  });
  it("permits manual renewal only inside its window and only once per cycle", async () => {
    const window = { ...active, expires_at: "2026-10-12T18:50:31.000Z" };
    mocks.membership.mockResolvedValue(window);
    expect(await resolveEntitlements("owner")).toMatchObject({ plan_status: "RENEWAL_WINDOW", renewal_available: true, can_top_up: true });
    expect(await resolveOrderItem("owner", "renew")).toMatchObject({ ok: true, orderKind: "plan_renewal" });
    mocks.membership.mockResolvedValue({ ...window, cycle_renewal_fulfilled_at: "2026-10-08T20:00:00.000Z" });
    expect(await resolveEntitlements("owner")).toMatchObject({ renewal_available: false, can_top_up: true });
  });
  it("permits top-ups for an active Paddle plan while keeping provider-managed renewal closed", async () => {
    mocks.membership.mockResolvedValue({ ...active, expires_at: "2026-10-12T18:50:31.000Z", payment_provider: "paddle", paddle_status: "active", renewal_mode: "automatic" });
    expect(await resolveEntitlements("owner")).toMatchObject({ can_top_up: true, renewal_available: false });
    expect(await resolveOrderItem("owner", "topup-100")).toMatchObject({ ok: true });
    expect(await resolveOrderItem("owner", "renew")).toEqual({ ok: false, error: "plan_already_active" });
  });
});
