import "server-only";
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
}): Promise<GenerationJob | null> {
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
  if (error) return null;
  return data as GenerationJob;
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
  await getSupabaseAdmin().from("generation_jobs").update(patch).eq("id", jobId);
}

export async function countActiveJobs(userId?: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc("count_active_jobs", {
    p_user: userId ?? null,
  });
  if (error) return 0;
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
