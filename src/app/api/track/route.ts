import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { isValidTrackKind, normalizeBoundedString } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ ok: false });

  const ip = clientIp(req);
  const rl = await enforceRateLimit(req, "track:prompt", ip, 300, 3600, "best_effort");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonTrack);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { kind?: string; toolId?: string; url?: string };

  const kind = isValidTrackKind(body.kind) ? body.kind : null;
  if (!kind) return NextResponse.json({ error: "bad-kind" }, { status: 400 });

  const toolId = normalizeBoundedString(body.toolId, 64);
  const url = normalizeBoundedString(body.url, 512);
  const user = await getUserFromToken(bearer(req));

  try {
    await getSupabaseAdmin().from("prompt_events").insert({
      kind,
      tool_id: toolId,
      prompt: null,
      url,
      user_id: user?.id ?? null,
    });
  } catch {
    /* table may not exist yet — ignore */
  }
  return NextResponse.json({ ok: true });
}
