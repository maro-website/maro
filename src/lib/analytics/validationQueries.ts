import "server-only";

import { getAnalyticsOverview, getGenerationsByTool, getRevenueByMonth } from "@/lib/analytics/aggregates";
import { loadCommandCenterKpis } from "@/lib/control-center/commandKpis";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Direct DB queries for cross-checking admin dashboards during RC validation. */
export async function loadValidationCrossChecks() {
  const admin = getSupabaseAdmin();
  const since = startOfTodayIso();

  const [kpis, overview, gensRes, ordersRes, costRes, jobsRes] = await Promise.all([
    loadCommandCenterKpis(),
    getAnalyticsOverview(),
    admin.from("generations").select("id, user_id, credits_spent, output_urls, created_at").gte("created_at", since),
    admin.from("credit_orders").select("amount_cents, status, created_at").gte("created_at", since),
    admin.from("provider_cost_estimates").select("estimated_cost_usd, created_at").gte("created_at", since),
    admin.from("generation_jobs").select("status", { count: "exact", head: true }).gte("created_at", since),
  ]);

  const generations = gensRes.data ?? [];
  const successCount = generations.filter((g) => {
    const row = g as { output_urls?: string[] | null; credits_spent?: number };
    return Boolean(row.output_urls?.length) || (row.credits_spent ?? 0) > 0;
  }).length;

  const revenueTodayDb =
    (ordersRes.data ?? [])
      .filter((o) => ["paid", "completed", "fulfilled"].includes((o as { status?: string }).status ?? ""))
      .reduce((s, o) => s + Number((o as { amount_cents?: number }).amount_cents ?? 0), 0) / 100;

  const aiCostTodayDb = (costRes.data ?? []).reduce(
    (s, r) => s + Number((r as { estimated_cost_usd?: number }).estimated_cost_usd ?? 0),
    0
  );

  const activeUsersDb = new Set(generations.map((g) => (g as { user_id?: string }).user_id).filter(Boolean)).size;

  return {
    commandCenter: kpis,
    analyticsOverview: overview,
    db: {
      generationsToday: generations.length,
      generationSuccessRate: generations.length ? (successCount / generations.length) * 100 : null,
      revenueTodayEur: Math.round(revenueTodayDb * 100) / 100,
      aiCostTodayUsd: Math.round(aiCostTodayDb * 1000000) / 1000000,
      activeUsersToday: activeUsersDb,
      jobsToday: jobsRes.count ?? 0,
    },
    deltas: {
      generationsToday: kpis.generationsToday - generations.length,
      revenueToday:
        kpis.revenueToday != null ? Math.round((kpis.revenueToday - revenueTodayDb) * 100) / 100 : null,
      aiCostToday:
        kpis.aiCostToday != null ? Math.round((kpis.aiCostToday - aiCostTodayDb) * 1000000) / 1000000 : null,
      activeUsersToday: kpis.activeUsersToday - activeUsersDb,
    },
    byTool: await getGenerationsByTool(1),
    revenueByMonth: await getRevenueByMonth(1),
    checkedAt: new Date().toISOString(),
  };
}
