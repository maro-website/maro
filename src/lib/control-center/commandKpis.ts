import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface CommandCenterKpis {
  revenueToday: number | null;
  revenueTodayAvailable: boolean;
  aiCostToday: number | null;
  aiCostTodayAvailable: boolean;
  grossMargin: number | null;
  grossMarginAvailable: boolean;
  generationsToday: number;
  activeUsersToday: number;
  generationSuccessRate: number | null;
  generationSuccessRateAvailable: boolean;
  attentionRequired: number;
  updatedAt: string;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function loadCommandCenterKpis(): Promise<CommandCenterKpis> {
  const admin = getSupabaseAdmin();
  const since = startOfTodayIso();

  const [gensRes, usersRes, costRes, ordersRes, reportsRes, shadowFailRes] = await Promise.all([
    admin.from("generations").select("id, credits_spent, output_urls", { count: "exact", head: false }).gte("created_at", since).limit(5000),
    admin.from("generations").select("user_id").gte("created_at", since).limit(5000),
    admin
      .from("provider_cost_estimates")
      .select("estimated_cost_usd")
      .gte("created_at", since)
      .limit(5000),
    admin
      .from("credit_orders")
      .select("amount_cents, status")
      .gte("created_at", since)
      .limit(5000),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin
      .from("engine_shadow_comparisons")
      .select("id", { count: "exact", head: true })
      .eq("compile_status", "failed")
      .gte("created_at", since),
  ]);

  const generations = gensRes.data ?? [];
  const successCount = generations.filter((g) => {
    const row = g as { output_urls?: string[] | null; credits_spent?: number };
    return Boolean(row.output_urls?.length) || (row.credits_spent ?? 0) > 0;
  }).length;
  const genTotal = generations.length;
  const uniqueUsers = new Set((usersRes.data ?? []).map((r) => (r as { user_id?: string }).user_id).filter(Boolean));

  let aiCostToday: number | null = null;
  if (!costRes.error && costRes.data?.length) {
    aiCostToday = costRes.data.reduce(
      (sum, row) => sum + Number((row as { estimated_cost_usd?: number }).estimated_cost_usd ?? 0),
      0
    );
  }

  let revenueToday: number | null = null;
  if (!ordersRes.error && ordersRes.data?.length) {
    revenueToday =
      ordersRes.data
        .filter((o) => {
          const s = (o as { status?: string }).status;
          return s === "completed" || s === "paid" || s === "fulfilled";
        })
        .reduce((sum, row) => sum + Number((row as { amount_cents?: number }).amount_cents ?? 0), 0) / 100;
  }

  const grossMarginAvailable = revenueToday != null && aiCostToday != null;
  const grossMargin =
    grossMarginAvailable && revenueToday! > 0
      ? Math.round(((revenueToday! - aiCostToday!) / revenueToday!) * 1000) / 10
      : null;

  const openReports = reportsRes.count ?? 0;
  const shadowFails = shadowFailRes.count ?? 0;

  return {
    revenueToday,
    revenueTodayAvailable: !ordersRes.error,
    aiCostToday,
    aiCostTodayAvailable: !costRes.error && Boolean(costRes.data?.length),
    grossMargin,
    grossMarginAvailable,
    generationsToday: genTotal,
    activeUsersToday: uniqueUsers.size,
    generationSuccessRate: genTotal ? Math.round((successCount / genTotal) * 1000) / 10 : null,
    generationSuccessRateAvailable: genTotal > 0,
    attentionRequired: openReports + shadowFails,
    updatedAt: new Date().toISOString(),
  };
}
