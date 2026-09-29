import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { EventName, type EventEntity } from "@paddle/paddle-node-sdk";
import { getPaddle } from "./config";

// Check timestamp in both directions and compare all h1 values in constant time.
// The SDK then verifies and deserializes the exact raw request body.
export async function verifyPaddleEvent(raw: string, signature: string): Promise<EventEntity> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("paddle_webhook_secret_missing");
  const parts = signature.split(";").map((part) => part.trim());
  const timestamps = parts.filter((part) => part.startsWith("ts="));
  const ts = timestamps[0]?.slice(3) ?? "";
  if (timestamps.length !== 1 || !/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 5) {
    throw new Error("invalid_signature_timestamp");
  }
  const expected = createHmac("sha256", secret).update(`${ts}:${raw}`).digest();
  const hash = parts.filter((part) => /^h1=[a-f0-9]{64}$/i.test(part)).map((part) => part.slice(3))
    .find((value) => timingSafeEqual(expected, Buffer.from(value, "hex")));
  if (!hash) throw new Error("invalid_signature");
  return getPaddle().webhooks.unmarshal(raw, secret, `ts=${ts};h1=${hash}`);
}

export interface PaddleEventInput {
  eventId: string; eventType: string; occurredAt: string;
  kind: "subscription" | "transaction" | "ignored";
  seedOrderId?: string; userId?: string; customerId?: string | null;
  subscriptionId?: string | null; transactionId?: string; priceId?: string;
  status?: string; origin?: string; amount?: number; currency?: string;
  startsAt?: string | null; endsAt?: string | null;
  scheduledChange?: { action: string; effectiveAt: string } | null;
}

export function normalizePaddleEvent(event: EventEntity): PaddleEventInput {
  const base: PaddleEventInput = {
    eventId: event.eventId, eventType: event.eventType, occurredAt: event.occurredAt, kind: "ignored",
  };
  const metadata = event.data && "customData" in event.data ? event.data.customData : null;
  // Ignore unrelated applications in a shared Paddle account.
  if (metadata?.maro_app !== "maro") return base;
  const seedOrderId = String(metadata.maro_order_id ?? "");
  const userId = String(metadata.maro_user_id ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(seedOrderId) || !/^[a-f0-9-]{36}$/i.test(userId)) {
    throw new Error("invalid_order_mapping");
  }
  const mapping = { seedOrderId, userId };
  switch (event.eventType) {
    case EventName.TransactionCompleted: {
      const tx = event.data;
      if (tx.status !== "completed" || tx.items.length !== 1 || tx.items[0].quantity !== 1 ||
          tx.items[0].proration || tx.discountId || !tx.details?.totals || !tx.items[0].price || !tx.customerId ||
          !["api", "subscription_recurring"].includes(tx.origin)) throw new Error("unsupported_transaction");
      const amount = Number(tx.details.totals.total);
      const price = tx.items[0].price;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount !== Number(price.unitPrice.amount) ||
          tx.currencyCode !== price.unitPrice.currencyCode) throw new Error("invalid_paid_amount");
      return { ...base, ...mapping, kind: "transaction", transactionId: tx.id,
        customerId: tx.customerId, subscriptionId: tx.subscriptionId, status: tx.status,
        origin: tx.origin, priceId: price.id, amount, currency: tx.currencyCode,
        startsAt: tx.billingPeriod?.startsAt, endsAt: tx.billingPeriod?.endsAt };
    }
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionCanceled:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed: {
      const sub = event.data;
      if (sub.items.length !== 1 || sub.items[0].quantity !== 1 || !sub.items[0].price) throw new Error("unsupported_subscription");
      return { ...base, ...mapping, kind: "subscription", subscriptionId: sub.id,
        transactionId: "transactionId" in sub ? sub.transactionId : undefined,
        customerId: sub.customerId, status: sub.status, priceId: sub.items[0].price.id,
        startsAt: sub.currentBillingPeriod?.startsAt, endsAt: sub.currentBillingPeriod?.endsAt,
        scheduledChange: sub.scheduledChange };
    }
    // Failure events never grant credits or paid time. subscription.past_due owns
    // lifecycle state; a transaction payment_failed event may be followed by recovery.
    default: return base;
  }
}

export async function readRawWebhook(req: Request): Promise<string> {
  const limit = 1024 * 1024;
  if (Number(req.headers.get("content-length")) > limit) throw new Error("webhook_too_large");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("empty_webhook");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("webhook_too_large"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
