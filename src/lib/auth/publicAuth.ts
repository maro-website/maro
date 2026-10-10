import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { readJsonBody } from "@/lib/security/requestLimits";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { isProduction } from "@/lib/config/serverEnv";
import { isValidEmail } from "@/lib/security/validation";

export const CONFIRMATION_NOTICE = { ok: true, needsEmailConfirmation: true };
export const RECOVERY_NOTICE = { ok: true, message: "Nëse ekziston një llogari me këtë email, do të marrësh udhëzime për rivendosjen e fjalëkalimit." };
export function authJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export function authFailure(error: { code?: string; status?: number } | null) {
  if (!error) return null;
  if (["user_already_exists", "email_exists", "email_not_confirmed", "user_not_found"].includes(error.code ?? "")) return null;
  if (error.code === "weak_password") return authJson({ error: "weak-password" }, 400);
  if (error.code === "email_address_invalid") return authJson({ error: "invalid-email" }, 400);
  if (error.status === 429) return authJson({ error: "rate_limited" }, 429);
  return authJson({ error: "auth_temporarily_unavailable" }, 503);
}

/** Bounded email requests with existing strict IP and hashed-recipient rate limits. */
export async function readPublicAuthRequest(req: Request, flow: "signup" | "resend" | "forgot-password") {
  const ip = clientIp(req);
  const limit = await enforceRateLimit(req, `auth:${flow}`, ip, flow === "signup" ? 10 : 5, 3600, "strict");
  if (!limit.allowed) {
    const response = authJson({ error: "rate_limited", retry_after: limit.retryAfter }, 429);
    response.headers.set("Retry-After", String(limit.retryAfter));
    return { response };
  }
  const parsed = await readJsonBody(req, 8192);
  if (!parsed.ok) return { response: parsed.response };
  if (!parsed.body || typeof parsed.body !== "object" || Array.isArray(parsed.body)) return { response: authJson({ error: "bad-json" }, 400) };
  const body = parsed.body as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email) || email.length > 254) return { response: authJson({ error: "invalid-email" }, 400) };
  const ts = await verifyTurnstileToken(typeof body.turnstileToken === "string" ? body.turnstileToken : null, ip, { required: isProduction() });
  if (!ts.ok) return { response: authJson({ error: ts.reason }, 403) };
  const recipientLimit = await enforceRateLimit(req, `auth:email:${flow}`, createHash("sha256").update(email).digest("hex"), 3, 3600, "strict");
  if (!recipientLimit.allowed) {
    const response = authJson({ error: "rate_limited", retry_after: recipientLimit.retryAfter }, 429);
    response.headers.set("Retry-After", String(recipientLimit.retryAfter));
    return { response };
  }
  return { body, email, ip };
}
