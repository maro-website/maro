import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { paddleEnabled } from "@/lib/payments/paddle/config";
import { normalizePaddleEvent, readRawWebhook, verifyPaddleEvent } from "@/lib/payments/paddle/webhooks";

export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!paddleEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let eventId: string | undefined;
  try {
    const event = await verifyPaddleEvent(await readRawWebhook(req), req.headers.get("paddle-signature") ?? "");
    eventId = event.eventId;
    const input = normalizePaddleEvent(event);
    const { error } = await getSupabaseAdmin().rpc("apply_paddle_event", { p_event: input });
    if (error) throw new Error("paddle_database_processing_failed");
    return NextResponse.json({ received: true });
  } catch (error) {
    // Malformed or unauthenticated requests are client rejections. Keep genuine
    // configuration/processing failures retryable so Paddle can redeliver them.
    const reason = error instanceof Error ? error.message : "";
    if (!eventId && ["invalid_signature", "invalid_signature_timestamp", "empty_webhook", "webhook_too_large"].includes(reason)) {
      return NextResponse.json({ error: "invalid_webhook" }, { status: reason === "webhook_too_large" ? 413 : 400 });
    }
    // Do not log raw payloads, credentials, SDK request objects, or portal URLs.
    console.error("paddle_webhook_failed", { eventId: eventId ?? "unverified" });
    return NextResponse.json({ error: "webhook_not_processed" }, { status: 500 });
  }
}
