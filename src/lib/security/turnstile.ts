import "server-only";

import { isTurnstileRequired } from "@/lib/config/serverEnv";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
  options: { required?: boolean } = {}
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (options.required ?? isTurnstileRequired()) {
      return { ok: false, reason: "turnstile_not_configured" };
    }
    return { ok: true };
  }
  if (!token?.trim() || token.length > 2048) {
    return { ok: false, reason: "turnstile_required" };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  });

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as { success?: boolean };
    if (res.ok && data.success === true) return { ok: true };
    return { ok: false, reason: "turnstile_failed" };
  } catch {
    return { ok: false, reason: "turnstile_error" };
  }
}
