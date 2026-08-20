import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  let leadsQuery = admin
    .from("business_leads")
    .select("id, user_id, email, status, questionnaire, admin_notes, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (userId) leadsQuery = leadsQuery.eq("user_id", userId);

  const [leadsRes, membershipsRes] = await Promise.all([
    leadsQuery,
    admin
      .from("memberships")
      .select(
        "id, user_id, plan_id, expires_at, suspended, business_overrides, started_at, profiles!inner(email, full_name)"
      )
      .eq("plan_id", "business")
      .order("expires_at", { ascending: false }),
  ]);

  return NextResponse.json({
    leads: leadsRes.data ?? [],
    businessMemberships: membershipsRes.data ?? [],
  });
}

export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const kind = String(body.kind ?? "");

  if (kind === "lead") {
    const id = String(body.id ?? "");
    const patch = body.patch as Record<string, unknown> | undefined;
    if (!id || !patch) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("status" in patch) update.status = patch.status;
    if ("admin_notes" in patch) update.admin_notes = patch.admin_notes;
    if ("questionnaire" in patch) update.questionnaire = patch.questionnaire;

    const { error } = await admin.from("business_leads").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "commerce.business_lead_updated",
      targetType: "business_lead",
      targetId: id,
      after: update,
      requestId: auth.requestId,
    });

    return NextResponse.json({ ok: true });
  }

  if (kind === "membership") {
    const id = String(body.id ?? "");
    const patch = body.patch as Record<string, unknown> | undefined;
    if (!id || !patch) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("suspended" in patch) update.suspended = patch.suspended;
    if ("expires_at" in patch) update.expires_at = patch.expires_at;
    if ("business_overrides" in patch) update.business_overrides = patch.business_overrides;

    const { error } = await admin.from("memberships").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "commerce.business_membership_updated",
      targetType: "membership",
      targetId: id,
      after: update,
      requestId: auth.requestId,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_kind" }, { status: 400 });
}
