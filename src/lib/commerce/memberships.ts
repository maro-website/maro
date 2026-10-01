import "server-only";

import type {
  BusinessOverrides,
  CanonicalPlanId,
  CommercePlanRow,
  MembershipRow,
  MembershipStatus,
  UpgradeQuote,
} from "@/lib/commerce/types";
import { getCommercePlan } from "@/lib/commerce/plans";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export function deriveMembershipStatus(
  membership: Pick<MembershipRow, "expires_at" | "plan_id" | "suspended"> & {
    renewal_window_days: number;
  },
  at: Date = new Date()
): MembershipStatus {
  const expiresAt = new Date(membership.expires_at);
  const now = at.getTime();

  if (membership.plan_id === "business") {
    if (membership.suspended) return "BUSINESS_SUSPENDED";
    if (expiresAt.getTime() <= now) return "BUSINESS_EXPIRED";
    return "BUSINESS_ACTIVE";
  }

  if (expiresAt.getTime() <= now) return "EXPIRED";

  const renewalStart = new Date(expiresAt);
  renewalStart.setDate(renewalStart.getDate() - membership.renewal_window_days);

  if (now >= renewalStart.getTime()) return "RENEWAL_WINDOW";
  return "ACTIVE";
}

export function isActivePlanStatus(status: MembershipStatus): boolean {
  return status === "ACTIVE" || status === "RENEWAL_WINDOW" || status === "BUSINESS_ACTIVE";
}

export async function getLatestMembership(userId: string): Promise<
  (MembershipRow & { renewal_window_days: number }) | null
> {
  const { data, error } = await getSupabaseAdmin()
    .from("memberships")
    .select(
      "id, user_id, plan_id, started_at, expires_at, renewal_mode, renewed_from_id, cycle_renewal_fulfilled_at, business_overrides, suspended, persisted_status, commerce_plans!inner(renewal_window_days)"
    )
    .eq("user_id", userId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const planJoin = row.commerce_plans as { renewal_window_days?: number } | null;

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    plan_id: row.plan_id as CanonicalPlanId,
    started_at: String(row.started_at),
    expires_at: String(row.expires_at),
    renewal_mode: (row.renewal_mode as "manual" | "automatic") ?? "manual",
    renewed_from_id: (row.renewed_from_id as string | null) ?? null,
    cycle_renewal_fulfilled_at: (row.cycle_renewal_fulfilled_at as string | null) ?? null,
    business_overrides: (row.business_overrides as BusinessOverrides) ?? {},
    suspended: Boolean(row.suspended),
    persisted_status: (row.persisted_status as string | null) ?? null,
    renewal_window_days: Number(planJoin?.renewal_window_days ?? 7),
  };
}

export function renewalAlreadyFulfilledForCycle(
  membership: Pick<MembershipRow, "cycle_renewal_fulfilled_at" | "expires_at"> & {
    renewal_window_days: number;
  }
): boolean {
  if (!membership.cycle_renewal_fulfilled_at) return false;
  const renewalStart = new Date(membership.expires_at);
  renewalStart.setDate(renewalStart.getDate() - membership.renewal_window_days);
  return new Date(membership.cycle_renewal_fulfilled_at).getTime() >= renewalStart.getTime();
}

export async function getUpgradeQuote(userId: string): Promise<UpgradeQuote> {
  const membership = await getLatestMembership(userId);
  if (!membership) {
    return {
      from_plan: "standard",
      to_plan: "pro",
      price_cents: 0,
      credits: 0,
      currency: "EUR",
      eligible: false,
      reason: "no_membership",
    };
  }

  const status = deriveMembershipStatus(membership);
  if (!isActivePlanStatus(status) || membership.plan_id !== "standard") {
    return {
      from_plan: membership.plan_id,
      to_plan: "pro",
      price_cents: 0,
      credits: 0,
      currency: "EUR",
      eligible: false,
      reason: "not_standard_active",
    };
  }

  const [std, pro] = await Promise.all([getCommercePlan("standard"), getCommercePlan("pro")]);
  if (!std || !pro) {
    return {
      from_plan: "standard",
      to_plan: "pro",
      price_cents: 0,
      credits: 0,
      currency: "EUR",
      eligible: false,
      reason: "plan_config_missing",
    };
  }

  return {
    from_plan: "standard",
    to_plan: "pro",
    price_cents: Math.max(0, pro.price_cents - std.price_cents),
    credits: Math.max(0, pro.included_credits - std.included_credits),
    currency: pro.currency,
    eligible: true,
  };
}

export function resolveLimitsFromPlan(
  plan: CommercePlanRow | null,
  status: MembershipStatus,
  overrides?: BusinessOverrides | null
): { workspace_limit: number; concurrency_limit: number } {
  if (!isActivePlanStatus(status)) {
    return { workspace_limit: 1, concurrency_limit: 1 };
  }

  if (plan?.id === "business" && overrides) {
    return {
      workspace_limit: overrides.workspace_limit ?? plan.workspace_limit,
      concurrency_limit: overrides.concurrency_limit ?? plan.concurrency_limit,
    };
  }

  if (plan) {
    return {
      workspace_limit: plan.workspace_limit,
      concurrency_limit: plan.concurrency_limit,
    };
  }

  return { workspace_limit: 1, concurrency_limit: 1 };
}

export async function countUserWorkspaces(userId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (error) return 0;
  return count ?? 0;
}
