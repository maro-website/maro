import { describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ profile: vi.fn(), membership: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getProfileCredits: m.profile }));
vi.mock("@/lib/commerce/memberships", () => ({
  getLatestMembership: m.membership, countUserWorkspaces: async () => 1,
  deriveMembershipStatus: () => "RENEWAL_WINDOW", isActivePlanStatus: () => true,
  renewalAlreadyFulfilledForCycle: () => false, resolveLimitsFromPlan: () => ({ workspace_limit: 2, concurrency_limit: 1 }),
}));
vi.mock("@/lib/commerce/plans", () => ({ getCommercePlan: async () => ({ display_name: "Standard" }) }));
import { resolveEntitlements } from "@/lib/commerce/entitlements";
describe("production compatible entitlement accounting", () => {
  it("does not subtract a reservation from an already debited spendable balance", async () => {
    m.profile.mockResolvedValue({ credits: 5, credits_reserved: 5 }); m.membership.mockResolvedValue(null);
    expect(await resolveEntitlements("owner")).toMatchObject({ credits_balance: 5, credits_reserved: 5, credits_available: 5 });
  });
  it("preserves paid Paddle compatibility without offering legacy renewal", async () => {
    m.profile.mockResolvedValue({ credits: 5, credits_reserved: 5 });
    m.membership.mockResolvedValue({ id: "membership", plan_id: "standard", payment_provider: "paddle", paddle_status: "active", renewal_mode: "automatic" });
    expect(await resolveEntitlements("owner")).toMatchObject({ credits_available: 5, payment_provider: "paddle", renewal_available: false, can_top_up: true });
  });
});
