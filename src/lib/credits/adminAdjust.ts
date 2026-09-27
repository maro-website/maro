import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AdminCreditAdjustResult {
  ok: boolean;
  balance?: number;
  oldBalance?: number;
  delta?: number;
  already?: boolean;
  error?: string;
}

export async function adminAdjustCredits(opts: {
  actorId: string;
  userId: string;
  delta: number;
  reason: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AdminCreditAdjustResult> {
  const { data, error } = await getSupabaseAdmin().rpc("admin_adjust_credits", {
    p_actor: opts.actorId,
    p_user: opts.userId,
    p_delta: opts.delta,
    p_reason: opts.reason.trim(),
    p_idempotency_key: opts.idempotencyKey ?? null,
    p_metadata: opts.metadata ?? {},
  });

  if (error) {
    if (error.message.includes("admin_adjust_credits")) {
      return { ok: false, error: "rpc_missing" };
    }
    return { ok: false, error: error.message };
  }

  const row = data as {
    ok?: boolean;
    error?: string;
    balance?: number;
    old_balance?: number;
    delta?: number;
    already?: boolean;
  };

  if (!row?.ok) {
    return { ok: false, error: row?.error ?? "adjust_failed" };
  }

  return {
    ok: true,
    balance: row.balance,
    oldBalance: row.old_balance,
    delta: row.delta,
    already: row.already,
  };
}

/** Set absolute credit balance via delta adjustment (requires reason). */
export async function adminSetCredits(opts: {
  actorId: string;
  userId: string;
  newBalance: number;
  reason: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AdminCreditAdjustResult> {
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", opts.userId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "user_not_found" };

  const current = (profile.credits as number) ?? 0;
  const delta = opts.newBalance - current;
  if (delta === 0) {
    return { ok: true, balance: current, oldBalance: current, delta: 0, already: true };
  }

  return adminAdjustCredits({
    actorId: opts.actorId,
    userId: opts.userId,
    delta,
    reason: opts.reason,
    idempotencyKey: opts.idempotencyKey,
    metadata: opts.metadata,
  });
}
