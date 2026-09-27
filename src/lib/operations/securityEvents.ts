import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function logSecurityEvent(input: {
  eventType: string;
  severity?: "info" | "warning" | "critical";
  userId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getSupabaseAdmin().from("security_events").insert({
      event_type: input.eventType,
      severity: input.severity ?? "info",
      user_id: input.userId ?? null,
      ip_address: input.ipAddress ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("[security_events] write failed:", err);
  }
}
