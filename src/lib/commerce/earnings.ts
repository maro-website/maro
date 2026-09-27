import "server-only";

import { LIST_PRICE_CENTI_CREDIT } from "@/lib/credits/money";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const COMMISSION_RATE = 0.1;

export interface CreatorEarningsRow {
  creatorId: string;
  email: string | null;
  promoCode: string | null;
  paidOrders: number;
  creditsSold: number;
  grossEur: number;
  estimatedCommissionEur: number;
}

export async function listCreatorEarnings(): Promise<CreatorEarningsRow[]> {
  const admin = getSupabaseAdmin();
  const { data: creators } = await admin
    .from("profiles")
    .select("id, email, is_creator")
    .eq("is_creator", true);

  const { data: promos } = await admin.from("promo_codes").select("code, creator_id").not("creator_id", "is", null);
  const promoByCreator = new Map<string, string>();
  for (const p of promos ?? []) {
    if (p.creator_id) promoByCreator.set(p.creator_id as string, p.code as string);
  }

  const rows: CreatorEarningsRow[] = [];
  for (const c of creators ?? []) {
    const creatorId = c.id as string;
    const code = promoByCreator.get(creatorId) ?? null;
    let paidOrders = 0;
    let creditsSold = 0;
    let grossEur = 0;

    if (code) {
      const { data: orders } = await admin
        .from("credit_orders")
        .select("credits, amount_cents")
        .eq("promo_code", code)
        .eq("status", "paid");
      paidOrders = orders?.length ?? 0;
      for (const o of orders ?? []) {
        creditsSold += (o.credits as number) ?? 0;
        grossEur += ((o.amount_cents as number) ?? 0) / 100;
      }
    }

    const listPriceEur = (creditsSold * LIST_PRICE_CENTI_CREDIT) / 100;
    const estimatedCommissionEur = Math.round(listPriceEur * COMMISSION_RATE * 100) / 100;

    rows.push({
      creatorId,
      email: (c.email as string) ?? null,
      promoCode: code,
      paidOrders,
      creditsSold,
      grossEur: Math.round(grossEur * 100) / 100,
      estimatedCommissionEur,
    });
  }

  return rows.sort((a, b) => b.estimatedCommissionEur - a.estimatedCommissionEur);
}
