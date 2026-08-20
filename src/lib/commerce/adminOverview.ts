import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { deriveMembershipStatus, isActivePlanStatus } from "@/lib/commerce/memberships";

export async function getCommerceOverviewMetrics() {
  const admin = getSupabaseAdmin();
  const now = new Date();

  const [
    membershipsRes,
    ordersRes,
    ledgerGrantedRes,
    ledgerSpentRes,
    pendingOrdersRes,
  ] = await Promise.all([
    admin
      .from("memberships")
      .select("id, user_id, plan_id, expires_at, suspended, commerce_plans!inner(renewal_window_days)")
      .order("expires_at", { ascending: false }),
    admin
      .from("credit_orders")
      .select("id, order_kind, item_type, item_id, credits, amount_cents, status, created_at, paid_at")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(20),
    admin
      .from("credit_transactions")
      .select("amount")
      .in("type", ["plan_purchase", "plan_renewal", "plan_upgrade", "topup", "admin_grant"]),
    admin.from("credit_transactions").select("amount").eq("type", "charge"),
    admin
      .from("credit_orders")
      .select("id, status, created_at")
      .in("status", ["pending", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const memberships = membershipsRes.data ?? [];
  let active = 0;
  let renewalWindow = 0;
  let expired = 0;

  const seenUsers = new Set<string>();
  for (const row of memberships) {
    const userId = String((row as Record<string, unknown>).user_id);
    if (seenUsers.has(userId)) continue;
    seenUsers.add(userId);
    const r = row as Record<string, unknown>;
    const renewalDays = Number(
      (r.commerce_plans as { renewal_window_days?: number })?.renewal_window_days ?? 7
    );
    const status = deriveMembershipStatus({
      plan_id: r.plan_id as "standard" | "pro" | "business",
      expires_at: String(r.expires_at),
      suspended: Boolean(r.suspended),
      renewal_window_days: renewalDays,
    });
    if (status === "RENEWAL_WINDOW") renewalWindow += 1;
    else if (isActivePlanStatus(status)) active += 1;
    else if (status === "EXPIRED" || status === "BUSINESS_EXPIRED") expired += 1;
  }

  const creditsGranted = (ledgerGrantedRes.data ?? []).reduce(
    (sum, r) => sum + Number((r as { amount: number }).amount),
    0
  );
  const creditsSpent = (ledgerSpentRes.data ?? []).reduce(
    (sum, r) => sum + Number((r as { amount: number }).amount),
    0
  );

  const recentOrders = (ordersRes.data ?? []).map((o) => {
    const row = o as Record<string, unknown>;
    return {
      id: row.id as string,
      orderKind: row.order_kind as string | null,
      itemId: row.item_id as string | null,
      credits: row.credits as number,
      amountCents: row.amount_cents as number,
      paidAt: row.paid_at as string | null,
    };
  });

  const planPurchases = recentOrders.filter((o) =>
    ["plan_purchase", "plan_renewal", "plan_upgrade"].includes(o.orderKind ?? "")
  );
  const topups = recentOrders.filter((o) => o.orderKind === "topup");

  return {
    memberships: { active, renewalWindow, expired, total: memberships.length },
    credits: { granted: creditsGranted, spent: creditsSpent },
    recentPlanPurchases: planPurchases.slice(0, 10),
    recentTopups: topups.slice(0, 10),
    pendingOrFailedOrders: pendingOrdersRes.data ?? [],
  };
}
