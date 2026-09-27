import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateProviderImageBytes } from "@/lib/security/uploadValidation";
import type { ImageProviderObservation } from "@/lib/ai/imageObservation";

export type V1Failure = "provider_failed" | "provider_output_invalid" | "storage_failed" | "history_failed" | "execution_trace_unavailable" | "execution_interrupted";
export class V1PersistenceError extends Error {
  constructor(public readonly code: V1Failure) { super(code); }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export function v1OutputReference(userId: string, jobId: string) {
  if (!uuid.test(userId) || !uuid.test(jobId)) throw new V1PersistenceError("storage_failed");
  const path = `${userId}/${jobId}/output.png`;
  return { path, reference: `storage:generations/${path}` };
}

/** Decode, durably checkpoint, upload, and read back the one expected V1 output. */
export async function storeV1ImageOutput(userId: string, jobId: string, outputs: string[], observation?: ImageProviderObservation): Promise<string> {
  if (outputs.length !== 1) throw new V1PersistenceError("provider_output_invalid");
  const validated = validateProviderImageBytes(outputs[0]);
  if (!validated.ok) throw new V1PersistenceError("provider_output_invalid");
  let bytes: Buffer;
  try { bytes = await sharp(validated.bytes, { limitInputPixels: 40_000_000 }).png().toBuffer(); }
  catch { throw new V1PersistenceError("provider_output_invalid"); }
  const { path, reference } = v1OutputReference(userId, jobId);
  const db = getSupabaseAdmin();
  const digest = hash(bytes);
  const checkpoint = await db.rpc("mark_v1_image_provider_result", { p_job_id: jobId, p_sha256: digest, p_observation: observation ?? null });
  if (checkpoint.error || checkpoint.data !== true) throw new V1PersistenceError("storage_failed");
  try {
    const bucket = db.storage.from("generations");
    const uploaded = await bucket.upload(path, bytes, { contentType: "image/png", upsert: false });
    // A timeout/conflict may mean a previous upload committed. Verify the deterministic object.
    if (!uploaded.error && uploaded.data?.path !== path) throw new Error("invalid_storage_path");
    const stored = await bucket.download(path);
    if (stored.error || !stored.data || hash(new Uint8Array(await stored.data.arrayBuffer())) !== digest) throw new Error("storage_verification_failed");
    return reference;
  } catch { throw new V1PersistenceError("storage_failed"); }
}

/** SQL inserts history and links the job in one transaction, or throws. */
export async function persistV1ImageHistory(jobId: string): Promise<string> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("persist_v1_image_generation", { p_job_id: jobId });
    if (error || typeof data !== "string" || !uuid.test(data)) throw new Error("history_insert_failed");
    return data;
  } catch { throw new V1PersistenceError("history_failed"); }
}

export type V1Settlement = "finalized" | "already_finalized" | "settlement_pending" | "invalid_state" | "evidence_missing";
export async function settleV1ImageJob(jobId: string): Promise<V1Settlement> {
  // Retry a transport-uncertain commit once. The database lock and ledger unique index own idempotency.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await getSupabaseAdmin().rpc("settle_v1_image_job", { p_job_id: jobId });
      if (!error && ["finalized", "already_finalized", "settlement_pending", "invalid_state", "evidence_missing"].includes(data)) return data as V1Settlement;
    } catch { /* Preserve durable output and reservation for reconciliation. */ }
  }
  return "settlement_pending";
}

export async function failV1ImageJob(jobId: string, reason: V1Failure): Promise<string> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("fail_v1_image_job", { p_job_id: jobId, p_reason: reason });
    if (!error && typeof data === "string") return data;
  } catch { /* A database outage must not be reported as a verified refund. */ }
  return "reconciliation_pending";
}

export async function optionalImageWork(label: string, work: () => Promise<unknown>): Promise<void> {
  try { await work(); }
  catch { console.error(`[v1_image] optional ${label} failed`); }
}
