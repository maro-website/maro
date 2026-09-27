import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { cancelCreditOrder } from "@/lib/payments/fulfill";
import { getOrderForUser } from "@/lib/payments/orders";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let orderId: string;
  let reason: string | undefined;
  try {
    const body = (await req.json()) as { orderId?: string; reason?: string };
    orderId = String(body.orderId ?? "").trim();
    reason = body.reason ? String(body.reason) : undefined;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.status === "paid") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  const result = await cancelCreditOrder(orderId, reason);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "cancel_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, already: result.already ?? false });
}
