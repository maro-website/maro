"use client";

import { getAccessToken } from "@/lib/supabase/client";

export interface CreditTransactionItem {
  id: string;
  type: string;
  amount: number;
  balance_after: number | null;
  job_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

const TYPE_LABELS: Record<string, string> = {
  reserve: "Rezervim",
  charge: "Ngarkim",
  refund: "Rimbursim",
  release: "Lirim rezerve",
  manual_adjustment: "Rregullim manual",
};

export function txTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export async function fetchCreditTransactions(): Promise<CreditTransactionItem[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await fetch("/api/credits/transactions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { items?: CreditTransactionItem[] };
  return j.items ?? [];
}
