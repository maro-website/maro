import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPublicUrl } from "@/lib/config/appOrigin";
import { isTurnstileConfigured, isTurnstileRequired } from "@/lib/config/serverEnv";
import { normalizeEmail } from "@/lib/security/disposableEmails";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { isValidEmail } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_OK = {
  ok: true,
  message: "Nëse ekziston një llogari me këtë email, do të marrësh udhëzime për rivendosjen e fjalëkalimit.",
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await enforceRateLimit(req, "auth:forgot-password", ip, 5, 3600, "strict");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter), "Cache-Control": "no-store" },
      }
    );
  }

  let body: { email?: string; turnstileToken?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!email || !isValidEmail(email)) {
    // Generic response — do not reveal validation details
    return NextResponse.json(GENERIC_OK, { headers: { "Cache-Control": "no-store" } });
  }

  if (isTurnstileRequired() && isTurnstileConfigured()) {
    const ts = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!ts.ok) {
      return NextResponse.json({ error: ts.reason }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(GENERIC_OK, { headers: { "Cache-Control": "no-store" } });
  }

  const redirectTo = buildPublicUrl("/auth/callback", {
    type: "recovery",
    next: "/reset-password",
  });

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  return NextResponse.json(GENERIC_OK, { headers: { "Cache-Control": "no-store" } });
}
