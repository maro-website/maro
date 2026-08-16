import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import {
  getSupabaseAdmin,
  refundCreditsAtomic,
  supabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.refund");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { id?: string; action?: "refund" | "archive" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || !action) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: report } = await admin.from("reports").select("*").eq("id", id).single();
  if (!report) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (action === "refund") {
    if (report.user_id && (report.credits_spent ?? 0) > 0) {
      await refundCreditsAtomic(
        report.user_id as string,
        report.credits_spent as number,
        `report-refund-${id}`
      );
    }
    await admin.from("reports").update({ status: "refunded" }).eq("id", id);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "report.refunded",
      targetType: "report",
      targetId: id,
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true, status: "refunded" });
  }

  await admin.from("reports").update({ status: "archived" }).eq("id", id);
  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "report.archived",
    targetType: "report",
    targetId: id,
    requestId: auth.requestId,
  });
  return NextResponse.json({ ok: true, status: "archived" });
}
