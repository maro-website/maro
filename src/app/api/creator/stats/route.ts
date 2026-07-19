import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function GET(req: Request) {
  const empty = {
    isCreator: false,
    hasCode: false,
    code: null as string | null,
    slug: null as string | null,
    discount: 0,
    linkUses: 0,
    codeUses: 0,
    sales: 0,
    salesCents: 0,
    creditsSold: 0,
    savedCents: 0,
    earningsCents: 0,
  };
  if (!supabaseServerConfigured()) return NextResponse.json(empty);
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json(empty, { status: 401 });

  const admin = getSupabaseAdmin();

  // Confirm the user is a creator.
  const { data: profile } = await admin
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .single();
  const isCreator = Boolean(profile?.is_creator);
  if (!isCreator) return NextResponse.json({ ...empty, isCreator: false });

  // The creator's promo code (if the admin assigned one).
  const { data: promo } = await admin
    .from("promo_codes")
    .select("code, slug, discount_percent")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!promo?.code) {
    return NextResponse.json({ ...empty, isCreator: true, hasCode: false });
  }

  const code = promo.code as string;
  const slug = (promo.slug as string) ?? null;
  const discount = (promo.discount_percent as number) ?? 0;

  // Referral usage counts.
  const [{ count: linkUses }, { count: codeUses }] = await Promise.all([
    admin
      .from("promo_events")
      .select("id", { count: "exact", head: true })
      .eq("code", code)
      .eq("kind", "link"),
    admin
      .from("promo_events")
      .select("id", { count: "exact", head: true })
      .eq("code", code)
      .eq("kind", "code"),
  ]);

  // Paid orders that used this code (populated once payments go live).
  const { data: orders } = await admin
    .from("credit_orders")
    .select("credits, amount_cents, status")
    .eq("promo_code", code)
    .eq("status", "paid");

  const paid = orders ?? [];
  const sales = paid.length;
  const salesCents = paid.reduce((a, o) => a + ((o.amount_cents as number) ?? 0), 0);
  const creditsSold = paid.reduce((a, o) => a + ((o.credits as number) ?? 0), 0);
  // 1 credit = 1 cent, so full value in cents == creditsSold. Buyer discount:
  const savedCents = Math.max(0, creditsSold - salesCents);
  // Creator earns 10% of the credit value sold via their code.
  const earningsCents = Math.round(creditsSold * 0.1);

  return NextResponse.json({
    isCreator: true,
    hasCode: true,
    code,
    slug,
    discount,
    linkUses: linkUses ?? 0,
    codeUses: codeUses ?? 0,
    sales,
    salesCents,
    creditsSold,
    savedCents,
    earningsCents,
  });
}
