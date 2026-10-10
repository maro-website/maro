import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";
import { checkRateLimit, clientIp } from "@/lib/security/rateLimit";
import { readJsonBody } from "@/lib/security/requestLimits";
import { claimFreebieSchema } from "@/lib/freebies/validation";
import type { FreebieClaimResult } from "@/lib/freebies/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return json({ error: "bonus_unavailable" }, 503);
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] ?? null;
  const user = await getUserFromToken(token);
  if (!user) return json({ error: "unauthorized" }, 401);
  if (!user.email_confirmed_at) return json({ error: "email_unconfirmed" }, 403);
  const parsedBody = await readJsonBody(req, 4096);
  if (!parsedBody.ok) return parsedBody.response;
  const parsed = claimFreebieSchema.safeParse(parsedBody.body);
  if (!parsed.success) return json({ error: "invalid_code" }, 400);
  const limits = await Promise.all([
    checkRateLimit("freebies:claim:user", user.id, 10, 300, "strict"),
    checkRateLimit("freebies:claim:ip", clientIp(req), 60, 300, "strict"),
  ]);
  if (limits.some(limit => !limit.allowed)) {
    const retry = Math.max(...limits.filter(limit => !limit.allowed).map(limit => limit.retryAfter), 1);
    return NextResponse.json({ error: "rate_limited", retry_after: retry }, {
      status: 429, headers: { "Retry-After": String(retry), "Cache-Control": "no-store" },
    });
  }
  try {
    const { data, error } = await getSupabaseAdmin().rpc("claim_freebie_drop", { p_user: user.id, p_code: parsed.data.code });
    if (error || !data) return json({ error: "bonus_unavailable" }, 503);
    const result = data as FreebieClaimResult;
    if (!result.ok) return json(result, result.error === "invalid_code" ? 404 : 409);
    return json({ ok: true, credits: result.credits, balance: result.balance, claim_id: result.claim_id,
      plan_id: result.plan_id, expires_at: result.expires_at });
  } catch { return json({ error: "bonus_unavailable" }, 503); }
}
