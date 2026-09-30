import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { paddleEnabled } from "@/lib/payments/paddle/config";
import { createPaddleCheckout } from "@/lib/payments/paddle/checkout";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { normalizeBoundedString } from "@/lib/security/validation";

export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!paddleEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const user = await requireUser(req);
  if (!user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rate = await enforceRateLimit(req, "paddle:checkout", user.id, 20, 3600, "strict");
  if (!rate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonCreateOrder);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const itemId = normalizeBoundedString(body.itemId, 64);
  const fullName = normalizeBoundedString(body.fullName, 200);
  const country = normalizeBoundedString(body.country, 200);
  const city = normalizeBoundedString(body.city, 200);
  if (!itemId || !fullName || !country || !city || body.legalConsent !== true || body.promoCode) {
    return NextResponse.json({ error: "invalid_billing_or_promo" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createPaddleCheckout(user, itemId, {
      fullName, email: user.email, country, city, legalConsent: true,
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Log only a bounded machine code, never SDK request objects or credentials.
    const providerCode = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const reason = typeof providerCode === "string" && /^[a-z0-9_]{1,100}$/i.test(providerCode) ? providerCode :
      error instanceof Error && /^paddle_[a-z_]+$/.test(error.message) ? error.message : "provider_request_failed";
    console.error("paddle_checkout_failed", { reason });
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 409 });
  }
}
