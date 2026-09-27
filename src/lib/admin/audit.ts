import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AuditEventInput {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

const SECRET_KEYS = /password|token|secret|api[_-]?key|authorization/i;

function sanitizeState(state: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!state) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (SECRET_KEYS.test(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Append an audit event (service role). Best-effort — never throws to caller. */
export async function writeAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await getSupabaseAdmin().from("audit_events").insert({
      actor_id: input.actorId,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      before_state: sanitizeState(input.before),
      after_state: sanitizeState(input.after),
      request_id: input.requestId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("[audit_events] write failed:", err);
  }
}
