import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { isSignupEnabled } from "@/lib/config/features";
import { isDisposableEmail, normalizeEmail } from "@/lib/security/disposableEmails";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function uaHash(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  return createHash("sha256").update(ua).digest("hex").slice(0, 32);
}

export async function POST(req: Request) {
  if (!isSignupEnabled()) {
    return NextResponse.json({ error: "signup_disabled" }, { status: 403 });
  }
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  let body: { name?: string; email?: string; password?: string; turnstileToken?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "weak-password" }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "disposable-email" }, { status: 400 });
  }

  const ip = clientIp(req);
  const ts = await verifyTurnstileToken(body.turnstileToken, ip);
  if (!ts.ok) {
    return NextResponse.json({ error: ts.reason }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: name || email.split("@")[0] },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json({ error: "email-taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = created.user?.id;
  if (userId) {
    await admin.from("signup_signals").insert({
      user_id: userId,
      ip,
      user_agent_hash: uaHash(req),
    });
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirmation: true,
  });
}
