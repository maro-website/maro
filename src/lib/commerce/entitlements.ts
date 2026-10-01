import "server-only";

import {
  countUserWorkspaces,
  deriveMembershipStatus,
  getLatestMembership,
  isActivePlanStatus,
  renewalAlreadyFulfilledForCycle,
  resolveLimitsFromPlan,
} from "@/lib/commerce/memberships";
import { getCommercePlan } from "@/lib/commerce/plans";
import type { ResolvedEntitlements } from "@/lib/commerce/types";
import { EXPIRED_DEFAULTS } from "@/lib/commerce/types";
import { getProfileCredits } from "@/lib/supabase/server";

export async function resolveEntitlements(userId: string): Promise<ResolvedEntitlements> {
  const [profile, membership, workspaceCount] = await Promise.all([
    getProfileCredits(userId),
    getLatestMembership(userId),
    countUserWorkspaces(userId),
  ]);

  const creditsBalance = profile?.credits ?? 0;
  const creditsReserved = profile?.credits_reserved ?? 0;
  const creditsAvailable = Math.max(0, creditsBalance - creditsReserved);

  if (!membership) {
    return {
      plan_id: null,
      plan_status: "NO_PLAN",
      plan_display_name: null,
      started_at: null,
      expires_at: null,
      renewal_mode: "manual",
      renewal_available: false,
      credits_balance: creditsBalance,
      credits_reserved: creditsReserved,
      credits_available: creditsAvailable,
      can_top_up: false,
      workspace_limit: EXPIRED_DEFAULTS.workspace_limit,
      current_workspace_count: workspaceCount,
      can_create_workspace: workspaceCount < EXPIRED_DEFAULTS.workspace_limit,
      concurrency_limit: EXPIRED_DEFAULTS.concurrency_limit,
      maro_brain_access: true,
      maro_presets_access: true,
      business_overrides: null,
      membership_id: null,
    };
  }

  const plan = await getCommercePlan(membership.plan_id);
  const status = deriveMembershipStatus(membership);
  const active = isActivePlanStatus(status);
  const limits = resolveLimitsFromPlan(plan, status, membership.business_overrides);

  const renewalAvailable =
    status === "RENEWAL_WINDOW" && !renewalAlreadyFulfilledForCycle(membership);

  return {
    plan_id: membership.plan_id,
    plan_status: status,
    plan_display_name: plan?.display_name ?? membership.plan_id,
    started_at: membership.started_at,
    expires_at: membership.expires_at,
    renewal_mode: membership.renewal_mode,
    renewal_available: renewalAvailable,
    credits_balance: creditsBalance,
    credits_reserved: creditsReserved,
    credits_available: creditsAvailable,
    can_top_up: active,
    workspace_limit: limits.workspace_limit,
    current_workspace_count: workspaceCount,
    can_create_workspace: workspaceCount < limits.workspace_limit,
    concurrency_limit: limits.concurrency_limit,
    maro_brain_access: true,
    maro_presets_access: true,
    business_overrides:
      membership.plan_id === "business" ? membership.business_overrides : null,
    membership_id: membership.id,
  };
}

/** Sync denormalized profile cache — never use for authorization. */
export async function syncMaroPlanCache(userId: string, entitlements: ResolvedEntitlements): Promise<void> {
  const { getSupabaseAdmin } = await import("@/lib/supabase/server");
  const cachePlan =
    entitlements.plan_status === "EXPIRED" ||
    entitlements.plan_status === "NO_PLAN" ||
    entitlements.plan_status === "BUSINESS_EXPIRED"
      ? null
      : entitlements.plan_id;

  await getSupabaseAdmin()
    .from("profiles")
    .update({ maro_plan: cachePlan })
    .eq("id", userId);
}
