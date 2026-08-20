import { NextResponse } from "next/server";
import { isPaymentModeValid } from "@/lib/config/serverEnv";
import { requireUser } from "@/lib/payments/auth";
import { fulfillCommerceOrder } from "@/lib/payments/fulfill";
import { getOrderForUser } from "@/lib/payments/orders";
import { isTestPaymentAllowed, testPaymentBlockReason } from "@/lib/payments/testMode";
import { emitProductEvent } from "@/lib/events/productEvents";
import { syncMaroPlanCache, resolveEntitlements } from "@/lib/commerce/entitlements";

export async function POST(req: Request) {
  if (!isPaymentModeValid()) {
    return NextResponse.json({ error: "forbidden", reason: "invalid_payment_mode" }, { status: 403 });
  }
  if (!isTestPaymentAllowed()) {
    return NextResponse.json({ error: "forbidden", reason: testPaymentBlockReason() }, { status: 403 });
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

  const providerRef = `test-${orderId}`;
  const result = await fulfillCommerceOrder(orderId, providerRef);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "fulfill_failed" }, { status: 500 });
  }

  if (!result.already) {
    const entitlements = await resolveEntitlements(user.id);
    await syncMaroPlanCache(user.id, entitlements);

    if (order.order_kind === "topup") {
      await emitProductEvent({
        eventName: "topup_purchased",
        userId: user.id,
        metadata: { order_id: orderId, credits: result.credits },
        dedupeKey: `topup-${orderId}`,
      });
    } else if (
      order.order_kind === "plan_purchase" ||
      order.order_kind === "plan_renewal" ||
      order.order_kind === "plan_upgrade"
    ) {
      await emitProductEvent({
        eventName: "plan_started",
        userId: user.id,
        metadata: { order_id: orderId, order_kind: order.order_kind },
        dedupeKey: `plan-${orderId}`,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    already: result.already ?? false,
    credits: result.credits,
    balance: result.balance,
  });
}
