import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface ValidatedPromo {
  code: string;
  discountPercent: number;
  creatorId: string | null;
}

/** Server-side promo validation for checkout (case-insensitive). */
export async function validatePromoCode(raw: string): Promise<ValidatedPromo | null> {
  const code = raw.trim();
  if (!code) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("promo_codes")
    .select("code, discount_percent, creator_id, active")
    .ilike("code", code)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    code: data.code as string,
    discountPercent: (data.discount_percent as number) ?? 0,
    creatorId: (data.creator_id as string) ?? null,
  };
}
