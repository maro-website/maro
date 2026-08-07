import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function fulfillCreditOrder(orderId: string): Promise<{
  ok: boolean;
  error?: string;
  already?: boolean;
  credits?: number;
  balance?: number;
}> {
  const { data, error } = await getSupabaseAdmin().rpc("fulfill_credit_order", {
    p_order_id: orderId,
  });
  if (error) return { ok: false, error: error.message };
  const j = data as Record<string, unknown>;
  return {
    ok: Boolean(j.ok),
    error: j.error as string | undefined,
    already: Boolean(j.already),
    credits: j.credits as number | undefined,
    balance: j.balance as number | undefined,
  };
}

export async function cancelCreditOrder(
  orderId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string; already?: boolean }> {
  const { data, error } = await getSupabaseAdmin().rpc("cancel_credit_order", {
    p_order_id: orderId,
    p_reason: reason ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const j = data as Record<string, unknown>;
  return {
    ok: Boolean(j.ok),
    error: j.error as string | undefined,
    already: Boolean(j.already),
  };
}
