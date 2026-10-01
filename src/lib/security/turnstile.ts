import "server-only";

import { isTurnstileRequired } from "@/lib/config/serverEnv";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (isTurnstileRequired()) {
      return { ok: false, reason: "turnstile_not_configured" };
    }
    return { ok: true };
  }
  if (!token?.trim()) {
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
    });
    const data = (await res.json()) as { success?: boolean };
    if (data.success) return { ok: true };
    return { ok: false, reason: "turnstile_failed" };
  } catch {
    return { ok: false, reason: "turnstile_error" };
  }
}
