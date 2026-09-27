import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ProductEventName =
  | "user_registered"
  | "generation_succeeded"
  | "generation_failed"
  | "plan_started"
  | "topup_purchased"
  | "preset_used"
  | "promo_used"
  | "support_ticket_created"
  | "creator_approved"
  | "creator_rejected"
  | "admin_credits_adjusted";

export interface EmitProductEventInput {
  eventName: ProductEventName;
  userId?: string | null;
  toolId?: string | null;
  metadata?: Record<string, unknown>;
  /** Optional dedupe key stored in metadata — skip if same event+key exists recently */
  dedupeKey?: string;
  dedupeWindowMs?: number;
}

/**
 * Lightweight product event emitter. Best-effort insert; never throws.
 * Dedupe: when dedupeKey is set, skips insert if an identical event exists
 * within dedupeWindowMs (default 60s).
 */
export async function emitProductEvent(input: EmitProductEventInput): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const meta = { ...(input.metadata ?? {}) };
    if (input.dedupeKey) {
      meta.dedupe_key = input.dedupeKey;
      const since = new Date(Date.now() - (input.dedupeWindowMs ?? 60_000)).toISOString();
      const { data: existing } = await admin
        .from("product_events")
        .select("id")
        .eq("event_name", input.eventName)
        .gte("created_at", since)
        .contains("metadata", { dedupe_key: input.dedupeKey })
        .limit(1)
        .maybeSingle();
      if (existing) return;
    }

    await admin.from("product_events").insert({
      event_name: input.eventName,
      user_id: input.userId ?? null,
      tool_id: input.toolId ?? null,
      metadata: meta,
    });
  } catch (err) {
    console.error("[product_events] emit failed:", err);
  }
}
