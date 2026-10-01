import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getOrderForUser } from "@/lib/payments/orders";
import { getCheckoutItem } from "@/lib/credits/money";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orderId = new URL(req.url).searchParams.get("orderId")?.trim();
  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const item = order.item_id ? getCheckoutItem(order.item_id) : null;

  return NextResponse.json({
    order: {
      id: order.id,
      status: order.status,
      credits: order.credits,
      amountCents: order.amount_cents,
      currency: order.currency,
      itemType: order.item_type,
      itemId: order.item_id,
      label: item?.label ?? order.item_id,
      priceEur: item?.priceEur ?? order.amount_cents / 100,
      billing: order.billing_snapshot,
      paidAt: order.paid_at,
    },
  });
}
