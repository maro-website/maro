import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface RetentionRunRow {
  id: string;
  domain: string;
  status: string;
  rowsAffected: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export async function listRetentionPolicies() {
  const { data } = await getSupabaseAdmin().from("data_retention_policies").select("*").order("domain");
  return data ?? [];
}

export async function listRecentRetentionRuns(limit = 20): Promise<RetentionRunRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("retention_execution_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    domain: r.domain as string,
    status: r.status as string,
    rowsAffected: (r.rows_affected as number) ?? 0,
    errorMessage: (r.error_message as string) ?? null,
    startedAt: r.started_at as string,
    finishedAt: (r.finished_at as string) ?? null,
  }));
}

/** Purge detailed generation debug data per generation_debug retention policy. Never touches payments/audit. */
export async function runGenerationDebugRetention(): Promise<{
  ok: boolean;
  rowsAffected: number;
  error?: string;
}> {
  const admin = getSupabaseAdmin();
  const started = new Date().toISOString();
  let runId: string | null = null;

  try {
    const { data: policy } = await admin
      .from("data_retention_policies")
      .select("retention_days")
      .eq("domain", "generation_debug")
      .maybeSingle();
    const days = (policy?.retention_days as number) ?? 90;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const { data: runRow } = await admin
      .from("retention_execution_runs")
      .insert({ domain: "generation_debug", status: "partial", started_at: started })
      .select("id")
      .single();
    runId = runRow?.id as string;

    const { data: staleJobs } = await admin
      .from("generation_jobs")
      .select("id, metadata")
      .lt("created_at", cutoff)
      .in("status", ["failed", "completed"])
      .limit(500);

    let affected = 0;
    for (const job of staleJobs ?? []) {
      const id = job.id as string;
      const meta = (job.metadata as Record<string, unknown>) ?? {};
      if (!meta.debug && !meta.tempPaths && !meta.promptPreview) continue;
      const { debug: _d, tempPaths: _t, promptPreview: _p, ...rest } = meta;
      await admin.from("generation_jobs").update({ metadata: rest }).eq("id", id);
      affected += 1;
    }

    await admin
      .from("retention_execution_runs")
      .update({
        status: "success",
        rows_affected: affected,
        finished_at: new Date().toISOString(),
        metadata: { cutoff, policy_days: days },
      })
      .eq("id", runId);

    return { ok: true, rowsAffected: affected };
  } catch (err) {
    const message = err instanceof Error ? err.message : "retention_failed";
    if (runId) {
      await admin
        .from("retention_execution_runs")
        .update({
          status: "failed",
          error_message: message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return { ok: false, rowsAffected: 0, error: message };
  }
}
