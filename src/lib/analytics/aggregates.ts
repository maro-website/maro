import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AnalyticsSnapshot } from "./types";
export type { AnalyticsOverview } from "./types";
export async function getAnalyticsSnapshot(days = 30, months = 6): Promise<AnalyticsSnapshot> {
  const { data, error } = await getSupabaseAdmin().rpc("admin_analytics_snapshot", { p_days: days, p_months: months });
  if (error || !data) throw new Error("analytics_unavailable");
  return data as AnalyticsSnapshot;
}
export async function getAnalyticsOverview() { return (await getAnalyticsSnapshot()).overview; }
export async function getGenerationsByTool(days = 30) { return (await getAnalyticsSnapshot(days)).byTool; }
export async function getRevenueByMonth(months = 6) {
  return (await getAnalyticsSnapshot(30, months)).byMonth.filter(row => row.currency === "EUR").map(row => ({ month: row.month, orders: row.orders, eur: row.amount }));
}
export async function getUserSignupTrend(days = 30) { return (await getAnalyticsSnapshot(days)).daily.map(({ day, signups }) => ({ day, signups })); }
