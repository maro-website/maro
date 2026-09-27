import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface LedgerRow {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function listCreditLedger(filters: {
  userId?: string;
  type?: string;
  limit?: number;
}): Promise<LedgerRow[]> {
  let q = getSupabaseAdmin()
    .from("credit_transactions")
    .select("id, user_id, type, amount, balance_after, idempotency_key, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.userId) q = q.eq("user_id", filters.userId);
  if (filters.type) q = q.eq("type", filters.type);

  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as string,
    amount: r.amount as number,
    balanceAfter: r.balance_after as number,
    idempotencyKey: (r.idempotency_key as string) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at as string,
  }));
}
