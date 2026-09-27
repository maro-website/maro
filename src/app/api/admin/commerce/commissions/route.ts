import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import {
  ensureCommissionRecords,
  listCreatorCommissions,
  markCommissionPaid,
  reverseCommission,
} from "@/lib/commerce/commissions";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await ensureCommissionRecords();
  const commissions = await listCreatorCommissions();
  return NextResponse.json({
    commissions,
    note: "Payouts are manual for this release. Mark as Paid records actor, timestamp, and reference only.",
  });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { action?: "mark_paid" | "reverse"; commissionId?: string; paymentReference?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.action === "mark_paid" && body.commissionId) {
    const row = await markCommissionPaid({
      commissionId: body.commissionId,
      actorId: auth.admin.userId,
      paymentReference: body.paymentReference,
    });
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "commerce.commission.mark_paid",
      targetType: "creator_commissions",
      targetId: body.commissionId,
      after: row as Record<string, unknown>,
      requestId: auth.requestId,
    });
    return NextResponse.json({ commission: row });
  }

  if (body.action === "reverse" && body.commissionId) {
    const row = await reverseCommission({ commissionId: body.commissionId, actorId: auth.admin.userId });
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "commerce.commission.reverse",
      targetType: "creator_commissions",
      targetId: body.commissionId,
      after: row as Record<string, unknown>,
      requestId: auth.requestId,
    });
    return NextResponse.json({ commission: row });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
