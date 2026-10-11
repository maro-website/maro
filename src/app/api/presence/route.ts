import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/config/appOrigin";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";
import { checkRateLimit, clientIp } from "@/lib/security/rateLimit";
import { readJsonBody } from "@/lib/security/requestLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  // No CORS access or cross-site activity injection. No client-supplied user IDs.
  const origin = req.headers.get("origin");
  const expectedOrigin = process.env.NODE_ENV === "production" ? getAppOrigin() : new URL(req.url).origin;
  if (origin !== expectedOrigin || req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !supabaseServerConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const bounded = await readJsonBody(req, 256);
  if (!bounded.ok) return bounded.response;
  const body = bounded.body as { sessionId?: unknown } | null;
  if (!body || Array.isArray(body) || typeof body !== "object" || Object.keys(body).length !== 1
    || typeof body.sessionId !== "string" || !UUID.test(body.sessionId)) {
    return NextResponse.json({ error: "bad-input" }, { status: 400 });
  }
  const hash = (value: string) => createHmac("sha256", secret).update(`maro-presence:${value}`).digest("hex");
  try {
    const rate = await checkRateLimit("presence", hash(`ip:${clientIp(req)}`), 300, 60, "strict");
    if (!rate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
    const authorization = req.headers.get("authorization");
    const user = await getUserFromToken(authorization?.startsWith("Bearer ") ? authorization.slice(7) : null);
    const { error } = await getSupabaseAdmin().rpc("touch_online_presence", {
      p_key: hash(user ? `user:${user.id}` : `session:${body.sessionId.toLowerCase()}`),
      p_signed_in: Boolean(user),
    });
    if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
