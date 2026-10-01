import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
export function eligibleForReconciliation(job: { status: string; created_at: string; metadata?: { v1_durable?: boolean } }, now = Date.now()) {
  return job.metadata?.v1_durable === true && ["pending", "reserved", "processing"].includes(job.status) && Date.parse(job.created_at) <= now - 15 * 60000;
}
export async function reconcileV1AdminJob(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("invalid_job_id");
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("generation_jobs").select("status,created_at,metadata").eq("id", id).single();
  if (error || !data) throw new Error("job_unavailable");
  if (["completed", "failed", "cancelled"].includes(data.status)) return "already_terminal";
  if (!eligibleForReconciliation(data)) throw new Error("job_not_eligible");
  const result = await db.rpc("reconcile_generation_job", { p_job_id: id, p_stale_minutes: 15 });
  if (result.error) throw new Error("reconciliation_failed");
  const allowed = ["finalized", "already_finalized", "settlement_pending", "released", "reconciliation_pending", "completed", "failed", "cancelled", "active", "unchanged", "missing", "evidence_missing", "invalid_state"];
  if (!allowed.includes(result.data)) throw new Error("unknown_reconciliation_result");
  return result.data as string;
}
