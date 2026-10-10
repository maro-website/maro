import "server-only";
import { getAnalyticsSnapshot, getGenerationsByTool, getRevenueByMonth } from "./aggregates";
import { loadCommandCenterKpis } from "@/lib/control-center/commandKpis";
import { getSupabaseAdmin } from "@/lib/supabase/server";
async function allRows<T>(read: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset=0; offset<100000; offset+=500) {
    const result=await read(offset); if (result.error) throw new Error("validation_unavailable");
    rows.push(...(result.data??[])); if ((result.data?.length??0)<500) return rows;
  }
  throw new Error("validation_row_limit");
}
/** Independently read the underlying receipt view and V1 jobs, including all REST pages. */
export async function loadValidationCrossChecks() {
  const admin=getSupabaseAdmin(); const snapshot=await getAnalyticsSnapshot(); const since=snapshot.dayStartsAt;
  const [kpis,jobs,orders,costs]=await Promise.all([
    loadCommandCenterKpis(),
    allRows(offset=>admin.from("generation_jobs").select("user_id,status").in("module",["reklama","logo"]).gte("created_at",since).range(offset,offset+499)),
    allRows(offset=>admin.from("admin_real_paid_orders").select("amount_cents").eq("currency","EUR").gte("paid_at",since).range(offset,offset+499)),
    allRows(offset=>admin.from("generation_jobs").select("provider_cost_usd").in("module",["reklama","logo"]).eq("status","completed").gte("finished_at",since).range(offset,offset+499)),
  ]);
  const revenue=orders.reduce((sum,row)=>sum+Number(row.amount_cents),0)/100;
  const cost=costs.some(row=>row.provider_cost_usd==null) ? null : costs.reduce((sum,row)=>sum+Number(row.provider_cost_usd),0);
  const activeUsers=new Set(jobs.map(row=>row.user_id).filter(Boolean)).size;
  const terminal=jobs.filter(row=>["completed","failed","cancelled"].includes(row.status));
  return {commandCenter:kpis,analyticsOverview:snapshot.overview,
    db:{generationsToday:jobs.length,generationSuccessRate:terminal.length?terminal.filter(row=>row.status==="completed").length/terminal.length*100:null,revenueTodayEur:revenue,aiCostTodayUsd:cost,activeUsersToday:activeUsers,jobsToday:jobs.length},
    deltas:{generationsToday:kpis.generationsToday-jobs.length,revenueToday:kpis.revenueToday==null?null:kpis.revenueToday-revenue,aiCostToday:kpis.aiCostToday==null||cost==null?null:kpis.aiCostToday-cost,activeUsersToday:kpis.activeUsersToday-activeUsers},
    byTool:await getGenerationsByTool(1),revenueByMonth:await getRevenueByMonth(1),checkedAt:new Date().toISOString()};
}
