import { NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import {
  isValidLaunchEmail,
  normalizeLaunchEmail,
} from "@/lib/launch/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const ip = clientIp(req);
  const rateLimit = await enforceRateLimit(
    req,
    "launch:waitlist",
    ip,
    12,
    3600,
    "strict"
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter || 60) },
      }
    );
  }

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { email?: unknown; website?: unknown };

  // Quietly accept bot-filled honeypot submissions without storing them.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = normalizeLaunchEmail(
    typeof body.email === "string" ? body.email : ""
  );
  if (!isValidLaunchEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    const { error } = await getSupabaseAdmin().from("launch_waitlist").insert({
      email,
      source: "coming_soon",
    });

    if (!error) return NextResponse.json({ ok: true, duplicate: false });
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

