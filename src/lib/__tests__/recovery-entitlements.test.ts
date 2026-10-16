import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ profile: vi.fn(), membership: vi.fn(), limit: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/workspaces/limitServer", () => ({ getWorkspaceLimit: m.limit }));
vi.mock("@/lib/supabase/server", () => ({ getProfileCredits: m.profile }));
vi.mock("@/lib/commerce/memberships", () => ({
  getLatestMembership: m.membership, countUserWorkspaces: m.count,
  deriveMembershipStatus: () => "RENEWAL_WINDOW", isActivePlanStatus: () => true,
  renewalAlreadyFulfilledForCycle: () => false, resolveLimitsFromPlan: () => ({ workspace_limit: 2, concurrency_limit: 1 }),
}));
vi.mock("@/lib/commerce/plans", () => ({ getCommercePlan: async () => ({ display_name: "Standard" }) }));
import { resolveEntitlements } from "@/lib/commerce/entitlements";
beforeEach(() => { m.limit.mockResolvedValue(2); m.count.mockResolvedValue(1); });
describe("production compatible entitlement accounting", () => {
  it("does not subtract a reservation from an already debited spendable balance", async () => {
    m.profile.mockResolvedValue({ credits: 5, credits_reserved: 5 }); m.membership.mockResolvedValue(null);
    expect(await resolveEntitlements("owner")).toMatchObject({ credits_balance: 5, credits_reserved: 5, credits_available: 5 });
  });
  it("keeps automatic plans from offering a duplicate manual renewal", async () => {
    m.profile.mockResolvedValue({ credits: 5, credits_reserved: 5 });
    m.membership.mockResolvedValue({ id: "membership", plan_id: "standard", payment_provider: "raiaccept", renewal_mode: "automatic" });
    expect(await resolveEntitlements("owner")).toMatchObject({ credits_available: 5, payment_provider: "raiaccept", renewal_available: false, can_top_up: true });
  });
  it.each([null, { id: "membership", plan_id: "standard", renewal_mode: "manual" }])("uses the database allowance for both free and paid accounts", async membership => {
    m.profile.mockResolvedValue({ credits: 5 }); m.membership.mockResolvedValue(membership);
    m.limit.mockResolvedValue(25); m.count.mockResolvedValue(24);
    expect(await resolveEntitlements("owner")).toMatchObject({ workspace_limit: 25, current_workspace_count: 24, can_create_workspace: true });
    m.count.mockResolvedValue(25);
    expect(await resolveEntitlements("owner")).toMatchObject({ workspace_limit: 25, can_create_workspace: false });
    m.limit.mockResolvedValue(1);
    expect(await resolveEntitlements("owner")).toMatchObject({ workspace_limit: 1, can_create_workspace: false });
  });
});
