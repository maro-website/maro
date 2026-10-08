import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import type { BillingSnapshot } from "@/lib/payments/orders";
import { getRaiAcceptClient } from "@/lib/payments/raiaccept/client";
import { readRaiAcceptConfig, raiAcceptCheckoutEnabled } from "@/lib/payments/raiaccept/config";
import { startRaiAcceptCheckout } from "@/lib/payments/raiaccept/checkout";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { isUuid, isValidEmail, normalizeBoundedString } from "@/lib/security/validation";

export const runtime = "nodejs";
const OPTIONS = { headers: { "Cache-Control": "no-store" } };
const ERROR_STATUS: Record<string, number> = {
  invalid_request: 400, invalid_billing: 400, invalid_item: 400, user_not_found: 403,
  idempotency_conflict: 409, topup_requires_active_plan: 403, paddle_managed_subscription: 409,
  order_in_progress: 409, plan_already_active: 403, renewal_not_available: 403,
  renewal_already_fulfilled: 409, upgrade_not_eligible: 403,
};
function parseBilling(body: Record<string, unknown>): BillingSnapshot | null {
  const fields = Object.fromEntries(["fullName", "email", "country", "city", "businessName", "nui"].map(field =>
    [field, normalizeBoundedString(body[field], REQUEST_LIMITS.billingFieldMax)]));
  if (!fields.fullName || !fields.email || !fields.country || !fields.city || body.legalConsent !== true ||
      !isValidEmail(fields.email) || Object.values(fields).some(value => value && /[\x00-\x1f\x7f]/.test(value)) ||
      ["businessName", "nui"].some(field => body[field] !== undefined && body[field] !== "" && !fields[field])) return null;
  return { fullName: fields.fullName, email: fields.email, country: fields.country, city: fields.city,
    legalConsent: true, ...(fields.businessName ? { businessName: fields.businessName } : {}), ...(fields.nui ? { nui: fields.nui } : {}) };
}

export async function POST(req: Request) {
  if (process.env.RAIACCEPT_ENABLED !== "true" || process.env.RAIACCEPT_CHECKOUT_ENABLED !== "true") {
    return NextResponse.json({ error: "purchases_unavailable" }, { ...OPTIONS, status: 404 });
  }
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { ...OPTIONS, status: 401 });
  if (!raiAcceptCheckoutEnabled(user.id)) return NextResponse.json({ error: "purchases_unavailable" }, { ...OPTIONS, status: 404 });
  const limit = await enforceRateLimit(req, "payments:raiaccept-checkout", user.id, 30, 3600, "strict");
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited", retry_after: limit.retryAfter },
    { status: 429, headers: { ...OPTIONS.headers, "Retry-After": String(limit.retryAfter) } });
  const key = req.headers.get("Idempotency-Key") ?? "";
  if (key !== key.trim() || !isUuid(key)) return NextResponse.json({ error: "idempotency_key_required" }, { ...OPTIONS, status: 400 });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonCreateOrder);
  if (!parsed.ok) return parsed.response;
  if (!parsed.body || typeof parsed.body !== "object" || Array.isArray(parsed.body)) {
    return NextResponse.json({ error: "invalid_request" }, { ...OPTIONS, status: 400 });
  }
  const body = parsed.body as Record<string, unknown>;
  const itemId = normalizeBoundedString(body.itemId, 64);
  if (!itemId) return NextResponse.json({ error: "invalid_item" }, { ...OPTIONS, status: 400 });
  const billing = parseBilling(body);
  if (!billing) return NextResponse.json({ error: "invalid_billing" }, { ...OPTIONS, status: 400 });
  if (body.promoCode !== undefined && body.promoCode !== "") {
    return NextResponse.json({ error: "promo_not_available" }, { ...OPTIONS, status: 400 });
  }
  try {
    const config = readRaiAcceptConfig();
    const result = await startRaiAcceptCheckout({ userId: user.id, requestKey: key, itemId, billing }, config, getRaiAcceptClient());
    if ("error" in result) return NextResponse.json(result, { ...OPTIONS, status: ERROR_STATUS[result.error] ?? 503 });
    if (result.state === "rejected") return NextResponse.json({ orderId: result.orderId, error: "checkout_failed" }, { ...OPTIONS, status: 502 });
    return NextResponse.json(result, { ...OPTIONS, status: result.state === "ready" ? 200 : 202 });
  } catch {
    // No raw database errors, billing data, bank responses or credentials in logs/response.
    return NextResponse.json({ error: "checkout_unavailable" }, { ...OPTIONS, status: 503 });
  }
}
