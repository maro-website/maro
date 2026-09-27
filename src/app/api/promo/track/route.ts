import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { isValidPromoCode, isValidPromoKind, normalizeBoundedString } from "@/lib/security/validation";
import { validatePromoCode } from "@/lib/payments/promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const ip = clientIp(req);
  const rl = await enforceRateLimit(req, "promo:track", ip, 120, 3600, "strict");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonPromoTrack);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { code?: string; kind?: string };

  const code = normalizeBoundedString(body.code, REQUEST_LIMITS.promoCodeMax);
  if (!code || !isValidPromoCode(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }
  if (!isValidPromoKind(body.kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const promo = await validatePromoCode(code);
  if (!promo) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

  const user = await getUserFromToken(bearer(req));
  await getSupabaseAdmin().from("promo_events").insert({
    code: promo.code,
    kind: body.kind,
    user_id: user?.id ?? null,
  });

  return NextResponse.json({ ok: true });
}
