import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import {
  createSupportTicket,
  listRefundRecords,
  listSupportTickets,
  recordManualRefund,
  updateTicketStatus,
} from "@/lib/support/tickets";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "operations.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  if (url.searchParams.get("kind") === "refunds") {
    const refunds = await listRefundRecords();
    return NextResponse.json({ refunds });
  }

  const tickets = await listSupportTickets();
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "operations.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    action?: "create_ticket" | "update_status" | "record_refund";
    subject?: string;
    body?: string;
    userId?: string | null;
    ticketId?: string;
    status?: string;
    refund?: {
      kind: "credit" | "payment";
      reason: string;
      amountCredits?: number;
      amountCurrency?: number;
      orderId?: string;
      userId?: string;
    };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.action === "create_ticket" && body.subject && body.body) {
    const ticket = await createSupportTicket({
      subject: body.subject,
      body: body.body,
      userId: body.userId,
      actorId: auth.admin.userId,
    });
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "support.ticket.create",
      targetType: "support_tickets",
      targetId: ticket.id as string,
      requestId: auth.requestId,
    });
    return NextResponse.json({ ticket });
  }

  if (body.action === "update_status" && body.ticketId && body.status) {
    const ticket = await updateTicketStatus(body.ticketId, body.status);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "support.ticket.status",
      targetType: "support_tickets",
      targetId: body.ticketId,
      after: { status: body.status },
      requestId: auth.requestId,
    });
    return NextResponse.json({ ticket });
  }

  if (body.action === "record_refund" && body.refund?.reason) {
    const refundAuth = await requirePermission(req, "payments.refund");
    if (!refundAuth.ok) return NextResponse.json({ error: refundAuth.error }, { status: refundAuth.status });

    const refund = await recordManualRefund({
      kind: body.refund.kind ?? "credit",
      reason: body.refund.reason,
      amountCredits: body.refund.amountCredits,
      amountCurrency: body.refund.amountCurrency,
      orderId: body.refund.orderId,
      userId: body.refund.userId,
      actorId: auth.admin.userId,
      ticketId: body.ticketId,
    });
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "support.refund.record",
      targetType: "refund_records",
      targetId: refund.id as string,
      requestId: auth.requestId,
    });
    return NextResponse.json({ refund });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
