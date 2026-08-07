import { NextResponse } from "next/server";
import { paymentMode } from "@/lib/config/features";
import { requireUser } from "@/lib/payments/auth";
import { fulfillCreditOrder } from "@/lib/payments/fulfill";
import { getOrderForUser } from "@/lib/payments/orders";

export async function POST(req: Request) {
  if (paymentMode() !== "test") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let orderId: string;
  try {
    const body = (await req.json()) as { orderId?: string };
    orderId = String(body.orderId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.status === "cancelled") {
    return NextResponse.json({ error: "cancelled" }, { status: 409 });
  }

  const result = await fulfillCreditOrder(orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "fulfill_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    already: result.already ?? false,
    credits: result.credits,
    balance: result.balance,
  });
}
