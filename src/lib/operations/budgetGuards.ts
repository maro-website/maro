import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/operations/securityEvents";

export type GuardAction = "warn" | "block";

export interface BudgetGuardRow {
  id: string;
  scope: string;
  scopeKey: string | null;
  dailyLimitUsd: number | null;
  monthlyLimitUsd: number | null;
  enabled: boolean;
  action: GuardAction;
  warnPct: number;
  description: string;
}

export interface BudgetGuardEvaluation {
  guard: BudgetGuardRow;
  period: "daily" | "monthly";
  spendUsd: number;
  limitUsd: number;
  pct: number;
  estimated: boolean;
  triggered: boolean;
  action: GuardAction;
}

function parseGuard(row: Record<string, unknown>): BudgetGuardRow {
  const meta = (row.metadata as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    scope: row.scope as string,
    scopeKey: (row.scope_key as string) ?? null,
    dailyLimitUsd: row.daily_limit_usd != null ? Number(row.daily_limit_usd) : null,
    monthlyLimitUsd: row.monthly_limit_usd != null ? Number(row.monthly_limit_usd) : null,
    enabled: Boolean(row.enabled),
    action: meta.action === "block" ? "block" : "warn",
    warnPct: typeof meta.warn_pct === "number" ? meta.warn_pct : 80,
    description: typeof meta.description === "string" ? meta.description : "",
  };
}

export async function listActiveBudgetGuards(): Promise<BudgetGuardRow[]> {
  const { data } = await getSupabaseAdmin().from("budget_guards").select("*").eq("enabled", true);
  return (data ?? []).map((r) => parseGuard(r as Record<string, unknown>));
}

async function spendForScope(scope: string, scopeKey: string | null, sinceIso: string): Promise<number> {
  const admin = getSupabaseAdmin();
  let q = admin.from("provider_cost_estimates").select("estimated_cost_usd").gte("created_at", sinceIso);
  if (scope === "tool" && scopeKey) q = q.eq("tool_id", scopeKey);
  if (scope === "provider" && scopeKey) q = q.eq("provider", scopeKey);
  const { data } = await q.limit(5000);
  return (data ?? []).reduce((s, r) => s + Number((r as { estimated_cost_usd?: number }).estimated_cost_usd ?? 0), 0);
}

export async function evaluateBudgetGuards(input?: {
  toolId?: string;
  provider?: string;
}): Promise<BudgetGuardEvaluation[]> {
  const guards = await listActiveBudgetGuards();
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const results: BudgetGuardEvaluation[] = [];

  for (const guard of guards) {
    if (guard.scope === "tool" && guard.scopeKey && input?.toolId && guard.scopeKey !== input.toolId) continue;
    if (guard.scope === "provider" && guard.scopeKey && input?.provider && guard.scopeKey !== input.provider) {
      continue;
    }

    const checks: Array<{ period: "daily" | "monthly"; limit: number | null; since: Date }> = [
      { period: "daily", limit: guard.dailyLimitUsd, since: dayStart },
      { period: "monthly", limit: guard.monthlyLimitUsd, since: monthStart },
    ];

    for (const check of checks) {
      if (check.limit == null || check.limit <= 0) continue;
      const spend = await spendForScope(guard.scope, guard.scopeKey, check.since.toISOString());
      const pct = Math.round((spend / check.limit) * 1000) / 10;
      const warnThreshold = guard.warnPct;
      const blockThreshold = 100;
      const action: GuardAction =
        guard.action === "block" && pct >= blockThreshold
          ? "block"
          : pct >= warnThreshold
            ? guard.action
            : "warn";
      const triggered = guard.action === "block" ? pct >= blockThreshold : pct >= warnThreshold;
      if (!triggered) continue;
      results.push({
        guard,
        period: check.period,
        spendUsd: Math.round(spend * 100) / 100,
        limitUsd: check.limit,
        pct,
        estimated: true,
        triggered: true,
        action,
      });
    }
  }

  return results;
}

export async function assertBudgetGuards(input?: { toolId?: string; provider?: string; module?: string }) {
  const evaluations = await evaluateBudgetGuards({
    toolId: input?.toolId ?? input?.module,
    provider: input?.provider,
  });

  for (const ev of evaluations) {
    await logSecurityEvent({
      eventType: ev.action === "block" ? "budget_guard_block" : "budget_guard_warn",
      severity: ev.action === "block" ? "critical" : "warning",
      metadata: {
        guard_id: ev.guard.id,
        scope: ev.guard.scope,
        scope_key: ev.guard.scopeKey,
        period: ev.period,
        spend_usd: ev.spendUsd,
        limit_usd: ev.limitUsd,
        pct: ev.pct,
        estimated: ev.estimated,
        description: ev.guard.description,
      },
    });

    if (ev.action === "block") {
      return { ok: false as const, reason: "budget_guard_blocked", evaluation: ev };
    }
  }

  return { ok: true as const, warnings: evaluations.filter((e) => e.action === "warn") };
}
