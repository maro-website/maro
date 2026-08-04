import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export async function checkRateLimit(
  scope: string,
  scopeKey: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("check_rate_limit", {
      p_scope: scope,
      p_scope_key: scopeKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return { allowed: true, retryAfter: 0 };
    const j = data as { allowed?: boolean; retry_after?: number };
    return {
      allowed: j?.allowed !== false,
      retryAfter: j?.retry_after ?? 0,
    };
  } catch {
    return { allowed: true, retryAfter: 0 };
  }
}

export async function logAbuseEvent(entry: {
  user_id?: string | null;
  ip?: string | null;
  event_type: string;
  severity?: "info" | "warn" | "critical";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getSupabaseAdmin().from("abuse_events").insert({
      user_id: entry.user_id ?? null,
      ip: entry.ip ?? null,
      event_type: entry.event_type,
      severity: entry.severity ?? "info",
      metadata: entry.metadata ?? {},
    });
  } catch {
    /* best-effort */
  }
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /reveal\s+(the\s+)?(system|master)\s+prompt/i,
  /show\s+(me\s+)?(your\s+)?(system|hidden)\s+prompt/i,
  /repeat\s+(the\s+)?(above|system)\s+prompt/i,
];

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}
