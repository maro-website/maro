import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { NextResponse } from "next/server";
import { legacyPaymentsEnabled } from "@/lib/payments/legacy";
import { requireUser } from "@/lib/payments/auth";
import { cancelCreditOrder } from "@/lib/payments/fulfill";
import { getOrderForUser } from "@/lib/payments/orders";

export async function POST(req: Request) {
  if (!legacyPaymentsEnabled()) return NextResponse.json({ error: "legacy_payments_disabled" }, { status: 404 });
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let orderId: string;
  let reason: string | undefined;
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return NextResponse.json({ error: "bad-json" }, { status: 400 });
  try {
    const body = boundedBody.body as { orderId?: string; reason?: string };
    orderId = String(body.orderId ?? "").trim();
    reason = body.reason ? String(body.reason) : undefined;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.provider === "paddle") return NextResponse.json({ error: "paddle_managed_payment" }, { status: 409 });
  if (order.status === "paid") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  const result = await cancelCreditOrder(orderId, reason);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "cancel_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, already: result.already ?? false });
}
