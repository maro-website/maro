import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store", Vary: "Authorization" },
});

export async function GET(req: Request, context: { params: Promise<{ dropId: string }> }) {
  const auth = await requirePermission(req, "credits.adjust");
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const { dropId } = await context.params;
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? 0);
  if (!z.uuid().safeParse(dropId).success || !Number.isInteger(offset) || offset < 0 || offset > 1000000) {
    return json({ error: "invalid_request" }, 400);
  }
  const rate = await checkRateLimit("freebies:admin:claims", auth.admin.userId, 120, 60, "strict");
  if (!rate.allowed) return NextResponse.json({ error: "rate_limited", retry_after: rate.retryAfter }, {
    status: 429, headers: { "Cache-Control": "no-store", Vary: "Authorization", "Retry-After": String(rate.retryAfter) },
  });

  const admin = getSupabaseAdmin();
  const { data: drop, error: dropError } = await admin.from("freebie_drops")
    .select("id,code,title,claims_count,credits_given").eq("id", dropId).is("deleted_at", null).maybeSingle();
  if (dropError) return json({ error: "claims_unavailable" }, 503);
  if (!drop) return json({ error: "drop_not_found" }, 404);

  const { data: claims, error, count } = await admin.from("freebie_claims")
    .select("id,user_id,credits,claimed_at", { count: "exact" }).eq("drop_id", dropId)
    .order("claimed_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 49);
  if (error) return json({ error: "claims_unavailable" }, 503);
  const userIds = [...new Set((claims ?? []).map(claim => claim.user_id).filter(Boolean))];
  const { data: profiles, error: profileError } = userIds.length ? await admin.from("profiles")
    .select("id,email,username,full_name").in("id", userIds) : { data: [], error: null };
  if (profileError) return json({ error: "claims_unavailable" }, 503);
  const users = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  return json({
    drop, total: count ?? 0, offset, limit: 50,
    // Preserve claims whose user was deleted. Do not expose balances or recover old identities.
    claims: (claims ?? []).map(claim => ({ id: claim.id, credits: claim.credits, claimed_at: claim.claimed_at, user: users.get(claim.user_id) ?? null })),
  });
}
