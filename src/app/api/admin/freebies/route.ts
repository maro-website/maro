import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { createFreebieSchema, setFreebieActiveSchema } from "@/lib/freebies/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const auth = await requirePermission(req, "credits.adjust");
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const query = new URL(req.url).searchParams;
  const offset = Number(query.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 1000000) return json({ error: "invalid_request" }, 400);
  const admin = getSupabaseAdmin();
  const { data: drops, error, count } = await admin.from("freebie_drops")
    .select("id,code,title,credits,max_claims,claims_count,min_generations_7d,audience,target_user_id,plan_id,plan_days,active,starts_at,expires_at,created_at", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 49);
  if (error) return json({ error: "freebies_unavailable" }, 503);
  const targets = [...new Set((drops ?? []).map(drop => drop.target_user_id).filter(Boolean))];
  const { data: profiles, error: profileError } = targets.length ? await admin.from("profiles")
    .select("id,email,username,full_name").in("id", targets) : { data: [], error: null };
  if (profileError) return json({ error: "freebies_unavailable" }, 503);
  const { data: plans, error: planError } = await admin.from("commerce_plans").select("id,display_name,duration_days").eq("enabled", true).order("sort_order");
  if (planError) return json({ error: "freebies_unavailable" }, 503);
  return json({ drops: (drops ?? []).map(drop => ({ ...drop, target: profiles?.find(profile => profile.id === drop.target_user_id) ?? null })), total: count ?? 0, plans: plans ?? [] });
}

async function mutationAuth(req: Request) {
  const auth = await requirePermission(req, "credits.adjust");
  if (!auth.ok) return { response: json({ error: auth.error }, auth.status) };
  const limit = await checkRateLimit("freebies:admin:write", auth.admin.userId, 30, 300, "strict");
  if (!limit.allowed) return { response: NextResponse.json({ error: "rate_limited", retry_after: limit.retryAfter }, {
    status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" },
  }) };
  return { actor: auth.admin.userId };
}

export async function POST(req: Request) {
  const auth = await mutationAuth(req); if (auth.response) return auth.response;
  const bounded = await readJsonBody(req, REQUEST_LIMITS.jsonDefault); if (!bounded.ok) return bounded.response;
  const parsed = createFreebieSchema.safeParse(bounded.body); if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const v = parsed.data;
  const { data, error } = await getSupabaseAdmin().rpc("admin_create_freebie_drop", {
    p_actor: auth.actor, p_drop_id: v.id, p_code: v.code, p_title: v.title,
    p_credits: v.credits, p_max_claims: v.maxClaims, p_min_generations: v.minGenerations,
    p_target_user: v.targetUserId, p_plan: v.planId, p_plan_days: v.planDays,
    p_starts_at: v.startsAt, p_expires_at: v.expiresAt,
  });
  if (error) return json({ error: error.code === "23505" ? "code_exists" : "freebies_unavailable" }, error.code === "23505" ? 409 : 503);
  if (!data?.ok) return json({ error: data?.error ?? "freebies_unavailable" }, data?.error === "forbidden" ? 403 : 409);
  return json({ ok: true, id: data.drop_id, already: data.already }, data.already ? 200 : 201);
}

export async function PATCH(req: Request) {
  const auth = await mutationAuth(req); if (auth.response) return auth.response;
  const bounded = await readJsonBody(req, REQUEST_LIMITS.jsonDefault); if (!bounded.ok) return bounded.response;
  const parsed = setFreebieActiveSchema.safeParse(bounded.body); if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const { data, error } = await getSupabaseAdmin().rpc("admin_set_freebie_active", {
    p_actor: auth.actor, p_drop_id: parsed.data.id, p_active: parsed.data.active,
  });
  if (error || !data) return json({ error: "freebies_unavailable" }, 503);
  if (!data.ok) return json({ error: data.error }, data.error === "forbidden" ? 403 : 404);
  return json({ ok: true });
}
