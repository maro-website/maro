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
    const { data } = await getSupabaseAdmin()
      .from("app_settings")
      .select("platform_limits, ai_paused")
      .eq("id", 1)
      .single();
    const pl = (data?.platform_limits as PlatformLimits) ?? {};
    return {
      ...DEFAULT_PLATFORM_LIMITS,
      ...pl,
      aiPaused: Boolean(data?.ai_paused) || Boolean(pl.aiPaused),
    };
  } catch {
    return DEFAULT_PLATFORM_LIMITS;
  }
}

export async function setAiPaused(paused: boolean): Promise<void> {
  await getSupabaseAdmin()
    .from("app_settings")
    .update({ ai_paused: paused, updated_at: new Date().toISOString() })
    .eq("id", 1);
}

export async function getCircuitState(userId?: string): Promise<CircuitState> {
  const admin = getSupabaseAdmin();
  const limits = await getPlatformLimits();

  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [{ data: hourRoll }, { data: dayRoll }, { count: queueDepth }] = await Promise.all([
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
    aiPaused: limits.aiPaused ?? false,
    limits,
    hourlySpendUsd,
    dailySpendUsd,
    queueDepth: queueDepth ?? 0,
  };
}

export async function assertCircuitAllows(
  module: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await runEmergencyChecks();
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

  const { data: recent } = await admin
    .from("generation_jobs")
    .select("status")
    .gte("created_at", since)
    .limit(200);

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
  creditsCharged: number
): Promise<void> {
  const admin = getSupabaseAdmin();
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const zero = "00000000-0000-0000-0000-000000000000";

  for (const [bucketStart, bucketType] of [
    [hourStart.toISOString(), "hour"],
    [dayStart.toISOString(), "day"],
  ] as const) {
    for (const [uid, mod] of [
      [zero, ""],
      [userId, module],
    ] as const) {
      const { data: existing } = await admin
        .from("platform_spend_rollup")
        .select("spend_usd, credits_charged, job_count")
        .eq("bucket_start", bucketStart)
        .eq("bucket_type", bucketType)
        .eq("user_id", uid)
        .eq("module", mod)
        .maybeSingle();

      if (existing) {
        await admin
          .from("platform_spend_rollup")
          .update({
            spend_usd: Number(existing.spend_usd) + spendUsd,
            credits_charged: (existing.credits_charged as number) + creditsCharged,
            job_count: (existing.job_count as number) + 1,
          })
          .eq("bucket_start", bucketStart)
          .eq("bucket_type", bucketType)
          .eq("user_id", uid)
          .eq("module", mod);
      } else {
        await admin.from("platform_spend_rollup").upsert({
          bucket_start: bucketStart,
          bucket_type: bucketType,
          user_id: uid,
          module: mod,
          spend_usd: spendUsd,
          credits_charged: creditsCharged,
          job_count: 1,
        });
      }
    }
  }
}
