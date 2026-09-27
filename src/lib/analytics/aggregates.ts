import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AnalyticsOverview {
  usersTotal: number;
  usersCreators: number;
  generationsTotal: number;
  generationsLast7d: number;
  ordersPaid: number;
  revenueEur: number;
  creditsSpentLast7d: number;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const admin = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { count: usersTotal },
    { count: usersCreators },
    { count: generationsTotal },
    { count: generationsLast7d },
    { data: paidOrders },
    { data: recentGens },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_creator", true),
    admin.from("generations").select("id", { count: "exact", head: true }),
    admin.from("generations").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("credit_orders").select("amount_cents").eq("status", "paid"),
    admin.from("generations").select("credits").gte("created_at", weekAgo),
  ]);

  const revenueEur =
    Math.round(((paidOrders ?? []).reduce((s, o) => s + ((o.amount_cents as number) ?? 0), 0) / 100) * 100) / 100;
  const creditsSpentLast7d = (recentGens ?? []).reduce((s, g) => s + ((g.credits as number) ?? 0), 0);

  return {
    usersTotal: usersTotal ?? 0,
    usersCreators: usersCreators ?? 0,
    generationsTotal: generationsTotal ?? 0,
    generationsLast7d: generationsLast7d ?? 0,
    ordersPaid: paidOrders?.length ?? 0,
    revenueEur,
    creditsSpentLast7d,
  };
}

export async function getGenerationsByTool(limitDays = 30) {
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - limitDays * 86400000).toISOString();
  const { data } = await admin.from("generations").select("tool, credits, created_at").gte("created_at", since);

  const byTool = new Map<string, { count: number; credits: number }>();
  for (const g of data ?? []) {
    const tool = (g.tool as string) ?? "unknown";
    const cur = byTool.get(tool) ?? { count: 0, credits: 0 };
    cur.count += 1;
    cur.credits += (g.credits as number) ?? 0;
    byTool.set(tool, cur);
  }
  return Array.from(byTool.entries())
    .map(([tool, stats]) => ({ tool, ...stats }))
    .sort((a, b) => b.count - a.count);
}

export async function getRevenueByMonth(months = 6) {
  const admin = getSupabaseAdmin();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const { data } = await admin
    .from("credit_orders")
    .select("amount_cents, created_at")
    .eq("status", "paid")
    .gte("created_at", since.toISOString());

  const byMonth = new Map<string, { orders: number; eur: number }>();
  for (const o of data ?? []) {
    const d = new Date(o.created_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = byMonth.get(key) ?? { orders: 0, eur: 0 };
    cur.orders += 1;
    cur.eur += ((o.amount_cents as number) ?? 0) / 100;
    byMonth.set(key, cur);
  }
  return Array.from(byMonth.entries())
    .map(([month, stats]) => ({ month, ...stats, eur: Math.round(stats.eur * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getUserSignupTrend(days = 30) {
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await admin.from("profiles").select("created_at").gte("created_at", since);
  const byDay = new Map<string, number>();
  for (const p of data ?? []) {
    const d = new Date(p.created_at as string).toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  return Array.from(byDay.entries())
    .map(([day, signups]) => ({ day, signups }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
