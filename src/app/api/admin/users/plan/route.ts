import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import type { AdminUserPlans } from "@/lib/admin/userPlans";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const grantSchema = z.object({
  userId: z.uuid(),
  planId: z.enum(["standard", "pro", "business"]),
  durationDays: z.number().int().min(1).max(365),
  note: z.string().trim().min(3).max(1000),
  grantId: z.uuid(),
}).strict();

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "users.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = new URL(req.url).searchParams.get("userId");
  if (!z.uuid().safeParse(userId).success) return NextResponse.json({ error: "invalid_user" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const [plans, memberships] = await Promise.all([
    admin.from("commerce_plans").select("id, display_name, duration_days").eq("enabled", true).order("sort_order"),
    admin.from("memberships").select("id, plan_id, started_at, expires_at, suspended")
      .eq("user_id", userId).order("expires_at", { ascending: false }).limit(20),
  ]);
  if (plans.error || memberships.error) return NextResponse.json({ error: "load_failed" }, { status: 500 });
  const rows = memberships.data ?? [];
  const ids = rows.map(row => String(row.id));
  const [audits, orders] = ids.length ? await Promise.all([
    admin.from("audit_events").select("target_id, metadata, created_at")
      .eq("action", "users.plan_granted_manually").eq("target_type", "membership").in("target_id", ids),
    admin.from("credit_orders").select("membership_id, amount_cents, provider")
      .eq("user_id", userId).eq("status", "paid").in("membership_id", ids),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  // Do not label missing audit/payment data as a paid plan.
  if (audits.error || orders.error) return NextResponse.json({ error: "load_failed" }, { status: 500 });
  const result: AdminUserPlans = {
    plans: plans.data ?? [],
    canManage: hasPermission(auth.admin.role, "users.manage"),
    memberships: rows.map(row => {
      const audit = audits.data?.find(event => event.target_id === row.id);
      const metadata = audit?.metadata as { note?: string; actor_email?: string } | undefined;
      const paid = orders.data?.some(order => order.membership_id === row.id && order.amount_cents > 0
        && order.provider && !["test", "manual"].includes(order.provider));
      return {
        id: row.id,
        planId: row.plan_id,
        planName: plans.data?.find(plan => plan.id === row.plan_id)?.display_name ?? row.plan_id,
        startedAt: row.started_at,
        expiresAt: row.expires_at,
        suspended: row.suspended,
        source: audit ? "manual" : paid ? "paid" : "other",
        note: metadata?.note ?? null,
        actorEmail: metadata?.actor_email ?? null,
        grantedAt: audit?.created_at ?? null,
      };
    }),
  };
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "users.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => null);
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const grant = parsed.data;
  const { data, error } = await getSupabaseAdmin().rpc("admin_grant_plan", {
    p_actor: auth.admin.userId,
    p_user: grant.userId,
    p_plan: grant.planId,
    p_duration_days: grant.durationDays,
    p_note: grant.note,
    p_grant_id: grant.grantId,
  });
  if (error) {
    const missing = error.code === "PGRST202" || error.code === "42883";
    return NextResponse.json({ error: missing ? "rpc_missing" : "grant_failed" }, { status: missing ? 503 : 500 });
  }
  const result = data as { ok?: boolean; error?: string; already?: boolean; membership_id?: string; expires_at?: string } | null;
  if (!result?.ok) {
    const status = result?.error === "forbidden" ? 403 : result?.error === "user_not_found" ? 404
      : ["existing_plan", "idempotency_conflict"].includes(result?.error ?? "") ? 409 : 400;
    return NextResponse.json({ error: result?.error ?? "grant_failed" }, { status });
  }
  return NextResponse.json({ ok: true, already: result.already, membershipId: result.membership_id, expiresAt: result.expires_at });
}
