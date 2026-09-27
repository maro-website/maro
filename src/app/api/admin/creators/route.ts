import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { emitProductEvent } from "@/lib/events/productEvents";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { isAccessRole, type AccessRole } from "@/lib/admin/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "creators.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { applicationId?: string; action?: "approve" | "reject" | "restore" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const applicationId = String(body.applicationId ?? "").trim();
  const action = body.action;
  if (!applicationId || !action) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: app, error: fetchErr } = await admin
    .from("creator_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr || !app) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const prevStatus = app.status as string;

  if (action === "approve" && prevStatus === "approved") {
    return NextResponse.json({ ok: true, already: true, status: "approved" });
  }
  if (action === "reject" && prevStatus === "rejected") {
    return NextResponse.json({ ok: true, already: true, status: "rejected" });
  }

  const nextStatus =
    action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";

  const { error: updErr } = await admin
    .from("creator_applications")
    .update({ status: nextStatus })
    .eq("id", applicationId);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  let profileId: string | null = null;

  if (action === "approve") {
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", app.email as string)
      .maybeSingle();

    if (prof?.id) {
      profileId = prof.id as string;
      await admin.from("profiles").update({ is_creator: true }).eq("id", profileId);

      const { data: existing } = await admin
        .from("promo_codes")
        .select("id")
        .eq("creator_id", profileId)
        .maybeSingle();

      if (!existing) {
        const base =
          String(app.name || (app.email as string).split("@")[0] || "kreator")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[^a-z0-9]+/g, "")
            .slice(0, 16) || "kreator";
        const rnd = Math.floor(100 + Math.random() * 900);
        await admin.from("promo_codes").insert({
          code: `${base.toUpperCase()}-10`,
          slug: `${base}${rnd}`,
          discount_percent: 10,
          creator_id: profileId,
          active: true,
        });
      }
    }
  }

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: `creator.${action}`,
    targetType: "creator_application",
    targetId: applicationId,
    before: { status: prevStatus },
    after: { status: nextStatus, profile_id: profileId },
    requestId: auth.requestId,
  });

  await emitProductEvent({
    eventName: action === "approve" ? "creator_approved" : "creator_rejected",
    userId: profileId,
    metadata: { application_id: applicationId, email: app.email },
    dedupeKey: `${applicationId}-${action}`,
  });

  return NextResponse.json({ ok: true, status: nextStatus, profileId });
}
