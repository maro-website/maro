import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface PromoRow {
  id: string;
  code: string;
  slug: string | null;
  discountPercent: number;
  active: boolean;
  creatorId: string | null;
  createdAt: string;
  usageCount?: number;
  paidOrderCount?: number;
}

export async function listPromoCodes(): Promise<PromoRow[]> {
  const admin = getSupabaseAdmin();
  const { data: promos } = await admin.from("promo_codes").select("*").order("created_at", { ascending: false });
  const rows = promos ?? [];

  const enriched: PromoRow[] = [];
  for (const p of rows) {
    const [{ count: eventCount }, { count: orderCount }] = await Promise.all([
      admin.from("promo_events").select("id", { count: "exact", head: true }).eq("code", p.code),
      admin.from("credit_orders").select("id", { count: "exact", head: true }).eq("promo_code", p.code).eq("status", "paid"),
    ]);
    enriched.push({
      id: p.id as string,
      code: p.code as string,
      slug: (p.slug as string) ?? null,
      discountPercent: p.discount_percent as number,
      active: p.active as boolean,
      creatorId: (p.creator_id as string) ?? null,
      createdAt: p.created_at as string,
      usageCount: eventCount ?? 0,
      paidOrderCount: orderCount ?? 0,
    });
  }
  return enriched;
}

export async function upsertPromoCode(input: {
  id?: string;
  code: string;
  slug?: string | null;
  discountPercent: number;
  active: boolean;
  creatorId?: string | null;
}) {
  const row = {
    code: input.code.trim().toUpperCase(),
    slug: input.slug?.trim() || null,
    discount_percent: input.discountPercent,
    active: input.active,
    creator_id: input.creatorId ?? null,
  };
  if (input.id) {
    const { data, error } = await getSupabaseAdmin()
      .from("promo_codes")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await getSupabaseAdmin().from("promo_codes").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePromoCode(id: string) {
  const { error } = await getSupabaseAdmin().from("promo_codes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
