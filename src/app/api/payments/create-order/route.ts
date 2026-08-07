import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { createCreditOrder, type BillingSnapshot } from "@/lib/payments/orders";
import { getCheckoutItem } from "@/lib/credits/money";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function parseBilling(body: Record<string, unknown>): BillingSnapshot | null {
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const country = String(body.country ?? "").trim();
  const city = String(body.city ?? "").trim();
  const legalConsent = body.legalConsent === true;
  if (!fullName || !email || !country || !city || !legalConsent) return null;
  const businessName = String(body.businessName ?? "").trim();
  const nui = String(body.nui ?? "").trim();
  return {
    fullName,
    email,
    country,
    city,
    legalConsent,
    ...(businessName ? { businessName } : {}),
    ...(nui ? { nui } : {}),
  };
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const itemId = String(body.itemId ?? "").trim();
  const item = getCheckoutItem(itemId);
  if (!item) return NextResponse.json({ error: "invalid_item" }, { status: 400 });

  const billing = parseBilling(body);
  if (!billing) return NextResponse.json({ error: "invalid_billing" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("maro_plan, email")
    .eq("id", user.id)
    .single();

  const result = await createCreditOrder({
    userId: user.id,
    userEmail: (profile?.email as string) || user.email || billing.email,
    itemId,
    billing,
    maroPlan: (profile?.maro_plan as string | null) ?? null,
  });

  if (!result.ok) {
    const status =
      result.error === "topup_requires_plan" ? 403 : result.error === "invalid_item" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ orderId: result.orderId });
}
