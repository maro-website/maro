import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type CreditTxType = "reserve" | "charge" | "refund" | "manual_adjustment" | "release";

export interface CreditTransaction {
  id: string;
  user_id: string;
  job_id: string | null;
  type: CreditTxType;
  amount: number;
  balance_after: number | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Reserve credits before AI work starts. Returns balance or -1 if insufficient. */
export async function reserveCredits(
  userId: string,
  amount: number,
  jobId: string,
  idempotencyKey?: string | null
): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc("reserve_credits", {
    p_user: userId,
    p_amount: amount,
    p_job_id: jobId,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : -1;
}

/** Convert reserved credits to a final charge after success. */
export async function finalizeCreditCharge(jobId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc("finalize_credit_charge", {
    p_job_id: jobId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Release reserved credits on failure (idempotent). */
export async function releaseCreditReserve(
  jobId: string,
  idempotencyKey?: string | null
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc("release_credit_reserve", {
    p_job_id: jobId,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Atomic refund for admin/report flows (not tied to job reserve). */
export async function refundCreditsAtomic(
  userId: string,
  amount: number,
  idempotencyKey?: string | null
): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc("refund_credits_atomic", {
    p_user: userId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : -1;
}

/** @deprecated Use releaseCreditReserve or refundCreditsAtomic */
export async function refundCredits(userId: string, amount: number, jobId?: string): Promise<void> {
  if (jobId) {
    await releaseCreditReserve(jobId, `refund-${jobId}`);
    return;
  }
  await refundCreditsAtomic(userId, amount, `refund-${userId}-${amount}-${Date.now()}`);
}

export async function logManualAdjustment(
  userId: string,
  amount: number,
  metadata: Record<string, unknown>
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();
  const balance = (profile?.credits as number) ?? 0;
  await admin.from("credit_transactions").insert({
    user_id: userId,
    type: "manual_adjustment",
    amount: Math.abs(amount),
    balance_after: balance,
    metadata,
  });
}

export async function fetchCreditTransactions(
  userId: string,
  limit = 100
): Promise<CreditTransaction[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as CreditTransaction[];
}
