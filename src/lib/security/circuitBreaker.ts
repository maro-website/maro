import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  DEFAULT_PLATFORM_LIMITS,
  type PlatformLimits,
} from "@/lib/security/platformLimits";

export interface CircuitState {
  aiPaused: boolean;
  limits: PlatformLimits;
  hourlySpendUsd: number;
  dailySpendUsd: number;
  queueDepth: number;
}

export async function getPlatformLimits(): Promise<PlatformLimits> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("app_settings")
      .select("platform_limits, ai_paused")
      .eq("id", 1)
      .single();
    if (error || !data) throw new Error("platform_policy_unavailable");
    const pl = (data?.platform_limits as PlatformLimits) ?? {};
    return {
      ...DEFAULT_PLATFORM_LIMITS,
      ...pl,
      aiPaused: Boolean(data?.ai_paused) || Boolean(pl.aiPaused),
    };
  } catch {
    console.error("[circuit] platform policy unavailable; admission paused");
    return { ...DEFAULT_PLATFORM_LIMITS, aiPaused: true, disableFreeCredits: true };
  }
}

export async function setAiPaused(paused: boolean): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("app_settings")
    .update({ ai_paused: paused, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error("platform_pause_update_failed");
}

export async function getCircuitState(userId?: string): Promise<CircuitState> {
  const admin = getSupabaseAdmin();
  const limits = await getPlatformLimits();

  const hourStart = new Date();
  hourStart.setUTCMinutes(0, 0, 0);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [hourResult, dayResult, queueResult] = await Promise.all([
    admin
      .from("platform_spend_rollup")
      .select("spend_usd")
      .eq("bucket_type", "hour")
      .eq("bucket_start", hourStart.toISOString())
      .eq("user_id", "00000000-0000-0000-0000-000000000000"),
    admin
      .from("platform_spend_rollup")
      .select("spend_usd")
      .eq("bucket_type", "day")
      .eq("bucket_start", dayStart.toISOString())
      .eq("user_id", "00000000-0000-0000-0000-000000000000"),
    admin
      .from("generation_jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "reserved", "processing"]),
  ]);
  const { data: hourRoll } = hourResult;
  const { data: dayRoll } = dayResult;
  const { count: queueDepth } = queueResult;
  const unavailable = Boolean(hourResult.error || dayResult.error || queueResult.error);
  if (unavailable) console.error("[circuit] spend/queue state unavailable; admission paused");

  const hourlySpendUsd = (hourRoll ?? []).reduce(
    (s, r) => s + Number((r as { spend_usd: number }).spend_usd ?? 0),
    0
  );
  const dailySpendUsd = (dayRoll ?? []).reduce(
    (s, r) => s + Number((r as { spend_usd: number }).spend_usd ?? 0),
    0
  );

  void userId;

  return {
    aiPaused: unavailable || (limits.aiPaused ?? false),
    limits,
    hourlySpendUsd,
    dailySpendUsd,
    queueDepth: queueDepth ?? 0,
  };
}

export async function assertCircuitAllows(
  module: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try { await runEmergencyChecks(); }
  catch {
    console.error("[circuit] emergency checks unavailable; admission paused");
    return { ok: false, reason: "policy_unavailable" };
  }
  const state = await getCircuitState();
  if (state.aiPaused) {
    return { ok: false, reason: "ai_paused" };
  }
  if (state.limits.pausedModules?.includes(module)) {
    return { ok: false, reason: "module_paused" };
  }
  if (state.hourlySpendUsd >= (state.limits.hourlySpendUsd ?? 100)) {
    return { ok: false, reason: "hourly_spend_limit" };
  }
  if (state.dailySpendUsd >= (state.limits.dailySpendUsd ?? 500)) {
    return { ok: false, reason: "daily_spend_limit" };
  }
  if (state.queueDepth >= (state.limits.maxQueueSize ?? 200)) {
    return { ok: false, reason: "queue_full" };
  }
  return { ok: true };
}

/** Auto-pause when failure rate or spend spikes beyond thresholds. */
export async function runEmergencyChecks(): Promise<void> {
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();

  const { data: recent, error } = await admin
    .from("generation_jobs")
    .select("status")
    .gte("created_at", since)
    .limit(200);
  if (error) throw new Error("emergency_check_unavailable");

  const jobs = recent ?? [];
  if (jobs.length >= 10) {
    const failed = jobs.filter((j) => (j as { status: string }).status === "failed").length;
    const failRate = failed / jobs.length;
    if (failRate > 0.3) {
      await admin.from("abuse_events").insert({
        event_type: "emergency_high_failure_rate",
        severity: "critical",
        metadata: { failRate, sample: jobs.length },
      });
      await setAiPaused(true);
    }
  }

  const state = await getCircuitState();
  const hourlyLimit = state.limits.hourlySpendUsd ?? 100;
  if (state.hourlySpendUsd >= hourlyLimit * 2) {
    await admin.from("abuse_events").insert({
      event_type: "emergency_spend_spike",
      severity: "critical",
      metadata: { hourlySpendUsd: state.hourlySpendUsd, limit: hourlyLimit },
    });
    await setAiPaused(true);
  }
}

export async function recordJobSpend(
  userId: string,
  module: string,
  spendUsd: number,
  creditsCharged: number,
  jobId: string
): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("record_job_spend", {
    p_job_id: jobId, p_user_id: userId, p_module: module,
    p_spend_usd: spendUsd, p_credits: creditsCharged,
  });
  if (error) throw new Error("spend_accounting_failed");
}
