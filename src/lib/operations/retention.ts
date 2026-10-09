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
  const { data, error } = await admin.rpc("run_v1_debug_retention", { p_batch: 500 });
  if (error || typeof data !== "number") {
    await admin.from("retention_execution_runs").insert({ domain: "generation_debug", status: "failed", error_message: "retention_failed", finished_at: new Date().toISOString() });
    return { ok: false, rowsAffected: 0, error: "retention_failed" };
  }
  return { ok: true, rowsAffected: data };
}
