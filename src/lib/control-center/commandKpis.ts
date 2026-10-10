import "server-only";
import { getAnalyticsSnapshot } from "@/lib/analytics/aggregates";
export interface CommandCenterKpis {
  revenueToday: number | null; revenueTodayAvailable: boolean; aiCostToday: number | null; aiCostTodayAvailable: boolean;
  grossMargin: number | null; grossMarginAvailable: boolean; generationsToday: number; activeUsersToday: number;
  generationSuccessRate: number | null; generationSuccessRateAvailable: boolean; attentionRequired: number; updatedAt: string;
}
export async function loadCommandCenterKpis(): Promise<CommandCenterKpis> {
  const { today, updatedAt } = await getAnalyticsSnapshot(1, 1);
  return { revenueToday: today.revenueEur, revenueTodayAvailable: true,
    aiCostToday: today.costMissing ? null : today.aiCostUsd, aiCostTodayAvailable: today.costMissing === 0,
    // EUR receipts and USD costs cannot produce a meaningful profit margin without FX, fees and refunds.
    grossMargin: null, grossMarginAvailable: false,
    generationsToday: today.generations, activeUsersToday: today.activeUsers,
    generationSuccessRate: today.terminal ? Math.round(today.completed / today.terminal * 1000) / 10 : null,
    generationSuccessRateAvailable: today.terminal > 0, attentionRequired: today.attention, updatedAt };
}
