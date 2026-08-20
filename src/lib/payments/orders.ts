import "server-only";

import {
  buildCommercialSnapshot,
  loadCommercePlans,
  loadCommerceTopups,
  resolveCheckoutItem,
  resolveRenewalCheckoutItem,
  getLowestEffectiveCreditSellRateEur,
} from "@/lib/commerce/plans";
import { LIST_PRICE_CENTI_CREDIT } from "@/lib/credits/money";
import { resolveEntitlements } from "@/lib/commerce/entitlements";
import {
  deriveMembershipStatus,
  getLatestMembership,
  getUpgradeQuote,
  isActivePlanStatus,
  renewalAlreadyFulfilledForCycle,
} from "@/lib/commerce/memberships";
import type { CommercialSnapshot, OrderKind } from "@/lib/commerce/types";
import { paymentModeStrict } from "@/lib/config/serverEnv";
import { recordOrderPricingSnapshot } from "@/lib/pricing/snapshots";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface BillingSnapshot {
  fullName: string;
  email: string;
  country: string;
  city: string;
  businessName?: string;
  nui?: string;
  legalConsent: boolean;
}

export interface CreditOrderRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  credits: number;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string | null;
  promo_code?: string | null;
  item_type: string | null;
  item_id: string | null;
  order_kind: OrderKind | null;
  membership_id: string | null;
  commercial_snapshot: CommercialSnapshot | null;
  billing_snapshot: BillingSnapshot | null;
  created_at: string;
  paid_at?: string | null;
  cancel_reason?: string | null;
  provider_transaction_id?: string | null;
}

export type OrderEligibilityError =
  | "invalid_item"
  | "topup_requires_active_plan"
  | "plan_already_active"
  | "renewal_not_available"
  | "renewal_already_fulfilled"
  | "upgrade_not_eligible"
  | "invalid_billing";

export async function resolveOrderItem(
  userId: string,
  itemId: string
): Promise<
  | {
      ok: true;
      item: Awaited<ReturnType<typeof resolveCheckoutItem>>;
      commercialSnapshot: CommercialSnapshot;
      orderKind: OrderKind;
    }
  | { ok: false; error: OrderEligibilityError }
> {
  const membership = await getLatestMembership(userId);
  const entitlements = await resolveEntitlements(userId);

  if (itemId === "renew") {
    if (!membership || !entitlements.renewal_available) {
      return { ok: false, error: "renewal_not_available" };
    }
    if (renewalAlreadyFulfilledForCycle(membership)) {
      return { ok: false, error: "renewal_already_fulfilled" };
    }
    const item = await resolveRenewalCheckoutItem(membership.plan_id);
    if (!item) return { ok: false, error: "invalid_item" };
    const plan = await import("@/lib/commerce/plans").then((m) => m.getCommercePlan(membership.plan_id));
    return {
      ok: true,
      item,
      commercialSnapshot: buildCommercialSnapshot(item, plan),
      orderKind: "plan_renewal",
    };
  }

  if (itemId === "upgrade-pro" || itemId === "upgrade") {
    const quote = await getUpgradeQuote(userId);
    if (!quote.eligible) return { ok: false, error: "upgrade_not_eligible" };
    const item = await resolveCheckoutItem("upgrade-pro", { upgrade: true });
    if (!item) return { ok: false, error: "invalid_item" };
    const pro = await import("@/lib/commerce/plans").then((m) => m.getCommercePlan("pro"));
    return {
      ok: true,
      item,
      commercialSnapshot: buildCommercialSnapshot(item, pro),
      orderKind: "plan_upgrade",
    };
  }

  const item = await resolveCheckoutItem(itemId);
  if (!item) return { ok: false, error: "invalid_item" };

  if (item.orderKind === "topup") {
    if (!entitlements.can_top_up) {
      return { ok: false, error: "topup_requires_active_plan" };
    }
  }

  if (item.orderKind === "plan_purchase") {
    if (membership) {
      const status = deriveMembershipStatus(membership);
      if (isActivePlanStatus(status)) {
        return { ok: false, error: "plan_already_active" };
      }
    }
  }

  const plan =
    item.planId != null
      ? await import("@/lib/commerce/plans").then((m) => m.getCommercePlan(item.planId!))
      : null;

  return {
    ok: true,
    item,
    commercialSnapshot: buildCommercialSnapshot(item, plan),
    orderKind: item.orderKind,
  };
}

export async function createCreditOrder(opts: {
  userId: string;
  userEmail: string;
  itemId: string;
  billing: BillingSnapshot;
  promoCode?: string | null;
}): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  const resolved = await resolveOrderItem(opts.userId, opts.itemId);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { item, commercialSnapshot, orderKind } = resolved;
  if (!item) return { ok: false, error: "invalid_item" };

  const { data, error } = await getSupabaseAdmin()
    .from("credit_orders")
    .insert({
      user_id: opts.userId,
      user_email: opts.userEmail,
      credits: item.credits,
      amount_cents: item.priceCents,
      currency: item.currency,
      status: "pending",
      provider: paymentModeStrict() === "test" ? "test" : "raiffeisen",
      promo_code: opts.promoCode ?? null,
      item_type: item.itemType === "topup" ? "topup" : "plan",
      item_id: item.itemId,
      order_kind: orderKind,
      commercial_snapshot: commercialSnapshot,
      billing_snapshot: opts.billing,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  const orderId = data.id as string;
  await recordOrderPricingSnapshot({
    orderId,
    userId: opts.userId,
    itemId: opts.itemId,
    promoCode: opts.promoCode,
    commercialSnapshot,
  });
  return { ok: true, orderId };
}

export async function getOrderForUser(
  orderId: string,
  userId: string
): Promise<CreditOrderRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("credit_orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CreditOrderRow;
}

export async function getOrderById(orderId: string): Promise<CreditOrderRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("credit_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CreditOrderRow;
}

export async function listOrdersForUser(userId: string, limit = 50): Promise<CreditOrderRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("credit_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as CreditOrderRow[];
}

export async function listAllOrders(limit = 100): Promise<CreditOrderRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("credit_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as CreditOrderRow[];
}

export function serializeOrder(order: CreditOrderRow) {
  const snap = order.commercial_snapshot;
  const label =
    snap?.plan_name_snapshot ??
    (order.item_id === "topup-100" ||
    order.item_id === "topup-200" ||
    order.item_id === "topup-500" ||
    order.item_id === "topup-1000"
      ? `${order.credits} kredite Top-up`
      : order.item_id ?? "Porosi");

  return {
    id: order.id,
    status: order.status,
    cancelReason: order.cancel_reason ?? null,
    credits: order.credits,
    amountCents: order.amount_cents,
    currency: order.currency,
    itemType: order.item_type,
    itemId: order.item_id,
    orderKind: order.order_kind,
    label,
    priceEur: (snap?.price_cents ?? order.amount_cents) / 100,
    commercialSnapshot: snap,
    provider: order.provider,
    providerTransactionId: order.provider_transaction_id ?? null,
    billing: order.billing_snapshot,
    createdAt: order.created_at,
    paidAt: order.paid_at ?? null,
  };
}

export async function getPublicCatalog() {
  const [plans, topups, listRate, lowestRate] = await Promise.all([
    loadCommercePlans(),
    loadCommerceTopups(),
    Promise.resolve(LIST_PRICE_CENTI_CREDIT / 100),
    getLowestEffectiveCreditSellRateEur(),
  ]);

  return {
    listPriceEurPerCredit: listRate,
    lowestEffectiveSellRateEurPerCredit: lowestRate,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.display_name,
      tagline: p.description,
      priceEur: p.price_cents / 100,
      credits: p.included_credits,
      durationDays: p.duration_days,
      workspaceLimit: p.workspace_limit,
      concurrencyLimit: p.concurrency_limit,
      badge: p.recommended_badge,
      contactOnly: p.contact_only,
      features: buildPlanFeatures(p),
    })),
    topups: topups.map((t) => ({
      id: t.id,
      credits: t.credits,
      priceEur: t.price_cents / 100,
      effectiveRateEur: t.price_cents / 100 / t.credits,
      discountPct: Math.round((1 - t.price_cents / t.credits / LIST_PRICE_CENTI_CREDIT) * 100),
    })),
  };
}

function buildPlanFeatures(p: Awaited<ReturnType<typeof loadCommercePlans>>[number]) {
  if (p.contact_only) {
    return [
      "Kredite sipas nevojës",
      "Workspaces sipas nevojës",
      "maroPresets të personalizuara",
      "Prompt Engineering nga ekipi i Maro",
      "Concurrency sipas marrëveshjes",
      "Çmime të personalizuara sipas volumit",
      "Mbështetje prioritare",
    ];
  }
  return [
    `${p.included_credits} kredite maro`,
    "maroBrain",
    p.workspace_limit === 1 ? "1 Workspace" : `Deri në ${p.workspace_limit} Workspaces`,
    "maroPresets",
    p.concurrency_limit === 1
      ? "1 gjenerim njëkohësisht"
      : `Deri në ${p.concurrency_limit} gjenerime njëkohësisht`,
    "Kreditet nuk skadojnë",
    "Top-up gjatë planit aktiv",
  ];
}
