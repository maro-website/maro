import "server-only";
import { releaseCreditReserve } from "@/lib/credits/ledger";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type JobStatus =
  | "pending"
  | "reserved"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface GenerationJob {
  id: string;
  user_id: string;
  module: string;
  model: string | null;
  status: JobStatus;
  idempotency_key: string | null;
  credits_reserved: number;
  credits_charged: number;
  provider_cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  retry_count: number;
  priority: number;
  error: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export type CreateJobErrorCode =
  | "job_create_failed"
  | "jobs_table_missing"
  | "jobs_db_permission"
  | "job_idempotency_conflict";

export function isInFlightJobStatus(status: JobStatus): boolean {
  return status === "pending" || status === "reserved" || status === "processing";
}

export type CreateJobResult =
  | { ok: true; job: GenerationJob }
  | { ok: false; code: CreateJobErrorCode; detail: string };

const STALE_JOB_MS = 15 * 60 * 1000;

/** Fail jobs stuck in pending/reserved/processing so users aren't blocked forever. */
export async function cleanupStaleJobs(userId?: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_JOB_MS).toISOString();
  let q = getSupabaseAdmin()
    .from("generation_jobs")
    .select("id, status, credits_reserved")
    .in("status", ["pending", "reserved", "processing"])
    .lt("created_at", cutoff);
  if (userId) q = q.eq("user_id", userId);

  const { data: staleJobs, error } = await q;
  if (error) {
    console.error("[generation_jobs] stale cleanup select failed:", error.code, error.message);
    return;
  }

  for (const job of staleJobs ?? []) {
    const jobId = String(job.id);
    const hasReservation =
      Number(job.credits_reserved ?? 0) > 0 ||
      job.status === "reserved" ||
      job.status === "processing";

    if (hasReservation) {
      try {
        await releaseCreditReserve(jobId, `stale-${jobId}`);
      } catch (e) {
        console.error("[generation_jobs] stale credit release failed:", jobId, e);
      }
    }

    await updateJob(jobId, {
      status: "failed",
      error: "stale_timeout",
      finished_at: new Date().toISOString(),
    });
  }
}

export async function findJobByIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<GenerationJob | null> {
  const { data } = await getSupabaseAdmin()
    .from("generation_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .in("status", ["pending", "reserved", "processing", "completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as GenerationJob) ?? null;
}

export async function createJob(entry: {
  user_id: string;
  module: string;
  model?: string;
  idempotency_key?: string | null;
  priority?: number;
  metadata?: Record<string, unknown>;
}): Promise<CreateJobResult> {
  const { data, error } = await getSupabaseAdmin()
    .from("generation_jobs")
    .insert({
      user_id: entry.user_id,
      module: entry.module,
      model: entry.model ?? null,
      status: "pending",
      idempotency_key: entry.idempotency_key ?? null,
      priority: entry.priority ?? 0,
      metadata: entry.metadata ?? {},
    })
    .select("*")
    .single();

  if (!error) {
    return { ok: true, job: data as GenerationJob };
  }

  console.error("[generation_jobs] insert failed:", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    userId: entry.user_id,
    module: entry.module,
    idempotencyKey: entry.idempotency_key,
  });

  // Race: two parallel requests with the same idempotency key.
  if (error.code === "23505" && entry.idempotency_key) {
    const existing = await findJobByIdempotency(entry.user_id, entry.idempotency_key);
    if (existing) {
      return {
        ok: false,
        code: "job_idempotency_conflict",
        detail: existing.id,
      };
    }
  }

  if (error.code === "42P01") {
    return {
      ok: false,
      code: "jobs_table_missing",
      detail: "Tabela generation_jobs mungon — apliko migrimin 0011_abuse_protection.sql në Supabase.",
    };
  }

  if (error.code === "42501") {
    return {
      ok: false,
      code: "jobs_db_permission",
      detail: "SUPABASE_SERVICE_ROLE_KEY nuk ka akses — kontrollo env vars në server.",
    };
  }

  return {
    ok: false,
    code: "job_create_failed",
    detail: error.message || "Insert failed",
  };
}

export async function updateJob(
  jobId: string,
  patch: Partial<{
    status: JobStatus;
    credits_reserved: number;
    credits_charged: number;
    provider_cost_usd: number;
    input_tokens: number;
    output_tokens: number;
    retry_count: number;
    error: string;
    metadata: Record<string, unknown>;
    started_at: string;
    finished_at: string;
  }>
): Promise<void> {
  const { error } = await getSupabaseAdmin().from("generation_jobs").update(patch).eq("id", jobId);
  if (error) {
    console.error("[generation_jobs] update failed:", jobId, error.code, error.message);
  }
}

export async function countActiveJobs(userId?: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc("count_active_jobs", {
    p_user: userId ?? null,
  });
  if (error) {
    console.error("[generation_jobs] count_active_jobs rpc failed:", error.code, error.message);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}

export async function getJob(jobId: string): Promise<GenerationJob | null> {
  const { data } = await getSupabaseAdmin()
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  return (data as GenerationJob) ?? null;
}
