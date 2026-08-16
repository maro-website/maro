import "server-only";
import { getCheckoutItem } from "@/lib/credits/money";
import { paymentMode } from "@/lib/config/features";
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
  billing_snapshot: BillingSnapshot | null;
  created_at: string;
  paid_at?: string | null;
  cancel_reason?: string | null;
}

export async function createCreditOrder(opts: {
  userId: string;
  userEmail: string;
  itemId: string;
  billing: BillingSnapshot;
  maroPlan?: string | null;
  /** Validated promo code text stored for creator attribution (Phase 0). */
  promoCode?: string | null;
}): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  const item = getCheckoutItem(opts.itemId);
  if (!item) return { ok: false, error: "invalid_item" };

  if (item.itemType === "topup" && !opts.maroPlan) {
    return { ok: false, error: "topup_requires_plan" };
  }

  const { data, error } = await getSupabaseAdmin()
    .from("credit_orders")
    .insert({
      user_id: opts.userId,
      user_email: opts.userEmail,
      credits: item.credits,
      amount_cents: item.priceCents,
      currency: "EUR",
      status: "pending",
      provider: paymentMode() === "test" ? "test" : "raiffeisen",
      promo_code: opts.promoCode ?? null,
      item_type: item.itemType,
      item_id: item.itemId,
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
  const item = order.item_id ? getCheckoutItem(order.item_id) : null;
  return {
    id: order.id,
    status: order.status,
    cancelReason: order.cancel_reason ?? null,
    credits: order.credits,
    amountCents: order.amount_cents,
    currency: order.currency,
    itemType: order.item_type,
    itemId: order.item_id,
    label: item?.label ?? order.item_id ?? "Porosi",
    priceEur: item?.priceEur ?? order.amount_cents / 100,
    provider: order.provider,
    billing: order.billing_snapshot,
    createdAt: order.created_at,
    paidAt: order.paid_at ?? null,
  };
}
