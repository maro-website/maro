import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface TicketRow {
  id: string;
  userId: string | null;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listSupportTickets(limit = 50): Promise<TicketRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: (r.user_id as string) ?? null,
    subject: r.subject as string,
    status: r.status as string,
    priority: (r.priority as string) ?? "normal",
    category: (r.category as string) ?? null,
    assignedTo: (r.assigned_to as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}

export async function createSupportTicket(input: {
  userId?: string | null;
  subject: string;
  category?: string | null;
  priority?: string;
  body: string;
  actorId: string;
}) {
  const admin = getSupabaseAdmin();
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({
      user_id: input.userId ?? null,
      subject: input.subject,
      category: input.category ?? null,
      priority: input.priority ?? "normal",
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await admin.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    author_id: input.actorId,
    author_role: "admin",
    body: input.body,
    internal: false,
  });

  return ticket;
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listRefundRecords(limit = 50) {
  const { data } = await getSupabaseAdmin()
    .from("refund_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function recordManualRefund(input: {
  kind: "credit" | "payment";
  userId?: string | null;
  orderId?: string | null;
  amountCredits?: number | null;
  amountCurrency?: number | null;
  reason: string;
  actorId: string;
  ticketId?: string | null;
}) {
  const { data, error } = await getSupabaseAdmin()
    .from("refund_records")
    .insert({
      kind: input.kind,
      user_id: input.userId ?? null,
      order_id: input.orderId ?? null,
      amount_credits: input.amountCredits ?? null,
      amount_currency: input.amountCurrency ?? null,
      reason: input.reason,
      status: "pending",
      ticket_id: input.ticketId ?? null,
      processed_by: input.actorId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
