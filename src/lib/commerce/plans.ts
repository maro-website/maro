import "server-only";

import type { MaroPlanId } from "@/lib/credits/money";
import { LIST_PRICE_CENTI_CREDIT, PLAN_PACKAGES, TOPUP_TIERS, type CheckoutItemId } from "@/lib/credits/money";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  CanonicalPlanId,
  CommercePlanRow,
  CommerceTopupRow,
  OrderKind,
} from "@/lib/commerce/types";

function toCanonicalPlanId(id: MaroPlanId): CanonicalPlanId {
  return id === "biz" ? "business" : id;
}

const FALLBACK_PLANS: CommercePlanRow[] = PLAN_PACKAGES.map((p) => {
  const planId = toCanonicalPlanId(p.id);
  return {
    id: planId,
    enabled: !p.contactOnly,
    display_name: p.name,
    description: p.tagline,
    price_cents: Math.round(p.priceEur * 100),
    currency: "EUR",
    included_credits: p.credits,
    duration_days: 30,
    workspace_limit: planId === "pro" ? 5 : planId === "business" ? 10 : 1,
    concurrency_limit: planId === "pro" ? 3 : planId === "business" ? 10 : 1,
    renewal_window_days: 7,
    renewal_mode: "manual" as const,
    recommended_badge: p.badge ?? null,
    sort_order: planId === "standard" ? 1 : planId === "pro" ? 2 : 3,
    contact_only: Boolean(p.contactOnly),
    metadata: {},
  };
});

const FALLBACK_TOPUPS: CommerceTopupRow[] = TOPUP_TIERS.map((t, i) => ({
  id: t.id,
  credits: t.credits,
  price_cents: Math.round(t.priceEur * 100),
  currency: "EUR",
  enabled: true,
  sort_order: i + 1,
  requires_active_plan: true,
}));

let plansCache: { at: number; rows: CommercePlanRow[] } | null = null;
let topupsCache: { at: number; rows: CommerceTopupRow[] } | null = null;
const CACHE_MS = 30_000;

function mapPlanRow(r: Record<string, unknown>): CommercePlanRow {
  return {
    id: r.id as CanonicalPlanId,
    enabled: Boolean(r.enabled),
    display_name: String(r.display_name),
    description: String(r.description ?? ""),
    price_cents: Number(r.price_cents ?? 0),
    currency: String(r.currency ?? "EUR"),
    included_credits: Number(r.included_credits ?? 0),
    duration_days: Number(r.duration_days ?? 30),
    workspace_limit: Number(r.workspace_limit ?? 1),
    concurrency_limit: Number(r.concurrency_limit ?? 1),
    renewal_window_days: Number(r.renewal_window_days ?? 7),
    renewal_mode: (r.renewal_mode as "manual" | "automatic") ?? "manual",
    recommended_badge: (r.recommended_badge as string | null) ?? null,
    sort_order: Number(r.sort_order ?? 0),
    contact_only: Boolean(r.contact_only),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  };
}

function mapTopupRow(r: Record<string, unknown>): CommerceTopupRow {
  return {
    id: String(r.id),
    credits: Number(r.credits),
    price_cents: Number(r.price_cents),
    currency: String(r.currency ?? "EUR"),
    enabled: Boolean(r.enabled),
    sort_order: Number(r.sort_order ?? 0),
    requires_active_plan: r.requires_active_plan !== false,
  };
}

export async function loadCommercePlans(opts?: { includeDisabled?: boolean }): Promise<CommercePlanRow[]> {
  const now = Date.now();
  if (!opts?.includeDisabled && plansCache && now - plansCache.at < CACHE_MS) {
    return plansCache.rows;
  }

  try {
    let q = getSupabaseAdmin().from("commerce_plans").select("*").order("sort_order");
    if (!opts?.includeDisabled) q = q.eq("enabled", true);
    const { data, error } = await q;
    if (error || !data?.length) return FALLBACK_PLANS.filter((p) => opts?.includeDisabled || p.enabled);
    const rows = data.map((r) => mapPlanRow(r as Record<string, unknown>));
    if (!opts?.includeDisabled) plansCache = { at: now, rows };
    return rows;
  } catch {
    return FALLBACK_PLANS.filter((p) => opts?.includeDisabled || p.enabled);
  }
}

export async function loadCommerceTopups(opts?: { includeDisabled?: boolean }): Promise<CommerceTopupRow[]> {
  const now = Date.now();
  if (!opts?.includeDisabled && topupsCache && now - topupsCache.at < CACHE_MS) {
    return topupsCache.rows;
  }

  try {
    let q = getSupabaseAdmin().from("commerce_topups").select("*").order("sort_order");
    if (!opts?.includeDisabled) q = q.eq("enabled", true);
    const { data, error } = await q;
    if (error || !data?.length) return FALLBACK_TOPUPS.filter((t) => opts?.includeDisabled || t.enabled);
    const rows = data.map((r) => mapTopupRow(r as Record<string, unknown>));
    if (!opts?.includeDisabled) topupsCache = { at: now, rows };
    return rows;
  } catch {
    return FALLBACK_TOPUPS.filter((t) => opts?.includeDisabled || t.enabled);
  }
}

export async function getCommercePlan(planId: CanonicalPlanId): Promise<CommercePlanRow | null> {
  const plans = await loadCommercePlans({ includeDisabled: true });
  return plans.find((p) => p.id === planId) ?? null;
}

export async function getCommerceTopup(topupId: string): Promise<CommerceTopupRow | null> {
  const topups = await loadCommerceTopups({ includeDisabled: true });
  return topups.find((t) => t.id === topupId) ?? null;
}

/** Lowest effective EUR per credit from enabled self-service plans and top-ups. */
export async function getLowestEffectiveCreditSellRateEur(): Promise<number> {
  const [plans, topups] = await Promise.all([loadCommercePlans(), loadCommerceTopups()]);
  const rates: number[] = [];

  for (const p of plans) {
    if (p.contact_only || !p.enabled || p.included_credits <= 0 || p.price_cents <= 0) continue;
    rates.push(p.price_cents / 100 / p.included_credits);
  }
  for (const t of topups) {
    if (!t.enabled || t.credits <= 0) continue;
    rates.push(t.price_cents / 100 / t.credits);
  }

  if (rates.length === 0) return LIST_PRICE_CENTI_CREDIT / 100;
  return Math.min(...rates);
}

export function invalidateCommerceConfigCache(): void {
  plansCache = null;
  topupsCache = null;
}

export interface ResolvedCheckoutItem {
  orderKind: OrderKind;
  itemType: "plan" | "topup" | "upgrade";
  itemId: string;
  planId?: CanonicalPlanId;
  credits: number;
  priceCents: number;
  currency: string;
  label: string;
  durationDays?: number;
  renewalWindowDays?: number;
}

export async function resolveCheckoutItem(
  itemId: string,
  opts?: { upgrade?: boolean }
): Promise<ResolvedCheckoutItem | null> {
  if (opts?.upgrade || itemId === "upgrade-pro") {
    const [std, pro] = await Promise.all([getCommercePlan("standard"), getCommercePlan("pro")]);
    if (!std || !pro) return null;
    return {
      orderKind: "plan_upgrade",
      itemType: "upgrade",
      itemId: "upgrade-pro",
      planId: "pro",
      credits: Math.max(0, pro.included_credits - std.included_credits),
      priceCents: Math.max(0, pro.price_cents - std.price_cents),
      currency: pro.currency,
      label: `${std.display_name} → ${pro.display_name}`,
      durationDays: pro.duration_days,
      renewalWindowDays: pro.renewal_window_days,
    };
  }

  if (itemId === "standard" || itemId === "pro") {
    const plan = await getCommercePlan(itemId);
    if (!plan || plan.contact_only || !plan.enabled) return null;
    return {
      orderKind: "plan_purchase",
      itemType: "plan",
      itemId,
      planId: plan.id,
      credits: plan.included_credits,
      priceCents: plan.price_cents,
      currency: plan.currency,
      label: plan.display_name,
      durationDays: plan.duration_days,
      renewalWindowDays: plan.renewal_window_days,
    };
  }

  const topup = await getCommerceTopup(itemId);
  if (topup && topup.enabled) {
    return {
      orderKind: "topup",
      itemType: "topup",
      itemId: topup.id,
      credits: topup.credits,
      priceCents: topup.price_cents,
      currency: topup.currency,
      label: `${topup.credits.toLocaleString("de-DE")} kredite`,
    };
  }

  void (itemId as CheckoutItemId);
  return null;
}

export async function resolveRenewalCheckoutItem(
  planId: CanonicalPlanId
): Promise<ResolvedCheckoutItem | null> {
  const plan = await getCommercePlan(planId);
  if (!plan || plan.contact_only || !plan.enabled) return null;
  return {
    orderKind: "plan_renewal",
    itemType: "plan",
    itemId: plan.id,
    planId: plan.id,
    credits: plan.included_credits,
    priceCents: plan.price_cents,
    currency: plan.currency,
    label: `Rinovim ${plan.display_name}`,
    durationDays: plan.duration_days,
    renewalWindowDays: plan.renewal_window_days,
  };
}

export function buildCommercialSnapshot(
  item: ResolvedCheckoutItem,
  plan?: CommercePlanRow | null
): import("@/lib/commerce/types").CommercialSnapshot {
  return {
    captured_at: new Date().toISOString(),
    order_kind: item.orderKind,
    plan_id: item.planId,
    plan_name_snapshot: plan?.display_name ?? item.label,
    price_cents: item.priceCents,
    currency: item.currency,
    credits_snapshot: item.credits,
    duration_days: item.durationDays,
    renewal_window_days: item.renewalWindowDays,
    topup_id: item.itemType === "topup" ? item.itemId : undefined,
    upgrade_from: item.orderKind === "plan_upgrade" ? "standard" : undefined,
    upgrade_to: item.orderKind === "plan_upgrade" ? "pro" : undefined,
    config_version: "commerce_v1",
  };
}
