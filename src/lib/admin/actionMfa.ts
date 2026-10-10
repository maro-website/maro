import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rateLimit";

/** Verify a new OTP on the server for this action, even when the session is already AAL2. */
export async function verifyAdminActionMfa(req: Request, actorId: string, code: string): Promise<NextResponse | null> {
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "mfa_code_required" }, { status: 400 });
  const limit = await checkRateLimit("admin:action-mfa", actorId, 10, 600, "strict");
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited", retry_after: limit.retryAfter }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return NextResponse.json({ error: "mfa_unavailable" }, { status: 503 });
  try {
    const { data, error } = await getSupabaseAdmin().auth.admin.mfa.listFactors({ userId: actorId });
    if (error) return NextResponse.json({ error: "mfa_unavailable" }, { status: 503 });
    const factor = data.factors.find(item => item.factor_type === "totp" && item.status === "verified");
    if (!factor) return NextResponse.json({ error: "mfa_enrollment_required" }, { status: 403 });
    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const verified = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verified.error || verified.data.user.id !== actorId) return NextResponse.json({ error: "mfa_code_invalid" }, { status: 403 });
    return null;
  } catch { return NextResponse.json({ error: "mfa_unavailable" }, { status: 503 }); }
}
