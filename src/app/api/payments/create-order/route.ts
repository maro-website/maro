import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { createCreditOrder, type BillingSnapshot } from "@/lib/payments/orders";
import { validatePromoCode } from "@/lib/payments/promo";
import { emitProductEvent } from "@/lib/events/productEvents";
import { getCheckoutItem } from "@/lib/credits/money";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import {
  isValidEmail,
  isValidPromoCode,
  normalizeBoundedString,
} from "@/lib/security/validation";

function parseBilling(body: Record<string, unknown>): BillingSnapshot | null {
  const fullName = normalizeBoundedString(body.fullName, REQUEST_LIMITS.billingFieldMax);
  const email = normalizeBoundedString(body.email, REQUEST_LIMITS.billingFieldMax);
  const country = normalizeBoundedString(body.country, REQUEST_LIMITS.billingFieldMax);
  const city = normalizeBoundedString(body.city, REQUEST_LIMITS.billingFieldMax);
  const legalConsent = body.legalConsent === true;
  if (!fullName || !email || !country || !city || !legalConsent) return null;
  if (!isValidEmail(email)) return null;
  const businessName = normalizeBoundedString(body.businessName, REQUEST_LIMITS.billingFieldMax);
  const nui = normalizeBoundedString(body.nui, REQUEST_LIMITS.billingFieldMax);
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

  const ip = clientIp(req);
  const rl = await enforceRateLimit(req, "payments:create-order", user.id, 20, 3600, "strict");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonCreateOrder);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown>;

  const itemId = normalizeBoundedString(body.itemId, 64);
  if (!itemId) return NextResponse.json({ error: "invalid_item" }, { status: 400 });
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

  let promoCode: string | null = null;
  const rawPromo = normalizeBoundedString(body.promoCode, REQUEST_LIMITS.promoCodeMax);
  if (rawPromo) {
    if (!isValidPromoCode(rawPromo)) {
      return NextResponse.json({ error: "invalid_promo" }, { status: 400 });
    }
    const validated = await validatePromoCode(rawPromo);
    if (!validated) {
      return NextResponse.json({ error: "invalid_promo" }, { status: 400 });
    }
    promoCode = validated.code;
  }

  const result = await createCreditOrder({
    userId: user.id,
    userEmail: (profile?.email as string) || user.email || billing.email,
    itemId,
    billing,
    maroPlan: (profile?.maro_plan as string | null) ?? null,
    promoCode,
  });

  if (result.ok && promoCode) {
    await emitProductEvent({
      eventName: "promo_used",
      userId: user.id,
      metadata: { promo_code: promoCode, order_id: result.orderId, stage: "checkout_created" },
      dedupeKey: `promo-checkout-${result.orderId}`,
    });
  }

  if (!result.ok) {
    const status =
      result.error === "topup_requires_plan" ? 403 : result.error === "invalid_item" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ orderId: result.orderId });
}
