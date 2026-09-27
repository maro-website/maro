import "server-only";

import { LIST_PRICE_CENTI_CREDIT } from "@/lib/credits/money";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const COMMISSION_RATE = 0.1;

export interface CreatorCommissionRow {
  id: string;
  creatorId: string;
  email: string | null;
  promoCode: string | null;
  orderId: string | null;
  grossAmount: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  paymentReference: string | null;
}

export async function listCreatorCommissions(): Promise<CreatorCommissionRow[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("creator_commissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if ((data ?? []).length > 0) {
    return hydrateCommissionRows(data ?? []);
  }

  return buildEstimatedCommissionRows();
}

async function hydrateCommissionRows(rows: Record<string, unknown>[]) {
  const admin = getSupabaseAdmin();
  const out: CreatorCommissionRow[] = [];
  for (const r of rows) {
    const creatorId = r.creator_id as string;
    const { data: profile } = await admin.from("profiles").select("email").eq("id", creatorId).maybeSingle();
    out.push({
      id: r.id as string,
      creatorId,
      email: (profile?.email as string) ?? null,
      promoCode: (r.promo_code as string) ?? null,
      orderId: (r.order_id as string) ?? null,
      grossAmount: Number(r.gross_amount ?? 0),
      commissionAmount: Number(r.commission_amount ?? 0),
      status: r.status as string,
      createdAt: r.created_at as string,
      paidAt: (r.paid_at as string) ?? null,
      paymentReference: (r.payment_reference as string) ?? null,
    });
  }
  return out;
}

async function buildEstimatedCommissionRows(): Promise<CreatorCommissionRow[]> {
  const admin = getSupabaseAdmin();
  const { data: creators } = await admin.from("profiles").select("id, email, is_creator").eq("is_creator", true);
  const { data: promos } = await admin.from("promo_codes").select("code, creator_id").not("creator_id", "is", null);
  const promoByCreator = new Map<string, string>();
  for (const p of promos ?? []) {
    if (p.creator_id) promoByCreator.set(p.creator_id as string, p.code as string);
  }

  const rows: CreatorCommissionRow[] = [];
  for (const c of creators ?? []) {
    const creatorId = c.id as string;
    const code = promoByCreator.get(creatorId) ?? null;
    if (!code) continue;
    const { data: orders } = await admin
      .from("credit_orders")
      .select("id, credits, amount_cents, created_at")
      .eq("promo_code", code)
      .eq("status", "paid");
    for (const o of orders ?? []) {
      const credits = (o.credits as number) ?? 0;
      const gross = ((o.amount_cents as number) ?? 0) / 100;
      const listPrice = (credits * LIST_PRICE_CENTI_CREDIT) / 100;
      const commission = Math.round(listPrice * COMMISSION_RATE * 100) / 100;
      rows.push({
        id: `est-${o.id}`,
        creatorId,
        email: (c.email as string) ?? null,
        promoCode: code,
        orderId: o.id as string,
        grossAmount: gross,
        commissionAmount: commission,
        status: "pending",
        createdAt: o.created_at as string,
        paidAt: null,
        paymentReference: null,
      });
    }
  }
  return rows;
}

export async function ensureCommissionRecords(): Promise<number> {
  const estimated = await buildEstimatedCommissionRows();
  let inserted = 0;
  for (const row of estimated) {
    if (!row.orderId) continue;
    const { data: existing } = await getSupabaseAdmin()
      .from("creator_commissions")
      .select("id")
      .eq("order_id", row.orderId)
      .maybeSingle();
    if (existing) continue;
    const { error } = await getSupabaseAdmin().from("creator_commissions").insert({
      creator_id: row.creatorId,
      order_id: row.orderId,
      promo_code: row.promoCode,
      gross_amount: row.grossAmount,
      commission_amount: row.commissionAmount,
      status: "pending",
    });
    if (!error) inserted += 1;
  }
  return inserted;
}

export async function markCommissionPaid(input: {
  commissionId: string;
  actorId: string;
  paymentReference?: string;
}) {
  const { data, error } = await getSupabaseAdmin()
    .from("creator_commissions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: input.actorId,
      payment_reference: input.paymentReference?.trim() || null,
    })
    .eq("id", input.commissionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function reverseCommission(input: { commissionId: string; actorId: string }) {
  const { data, error } = await getSupabaseAdmin()
    .from("creator_commissions")
    .update({
      status: "void",
      reversed_at: new Date().toISOString(),
      reversed_by: input.actorId,
    })
    .eq("id", input.commissionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
