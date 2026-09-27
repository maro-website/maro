import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildPublicUrl } from "@/lib/config/appOrigin";
import { createSupabaseRouteHandlerClient, supabaseRouteHandlerConfigured } from "@/lib/supabase/routeHandler";
import { parseEmailOtpType } from "@/lib/email/authUrls";
import {
  callbackFailureLogMeta,
  classifyCodeExchangeError,
  classifyCodeExchangeFailure,
  classifySupabaseRedirectError,
  classifyVerifyOtpError,
  type AuthCallbackErrorReason,
} from "@/lib/auth/callbackErrors";
import { requestHasPkceVerifierCookie } from "@/lib/auth/pkceDiagnostics";
import {
  DEFAULT_AUTH_REDIRECT,
  sanitizeInternalRedirectPath,
  defaultPostAuthPathForOtpType,
} from "@/lib/auth/safeRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authErrorRedirect(reason: AuthCallbackErrorReason): NextResponse {
  const signIn = new URL(buildPublicUrl("/sign-in"));
  signIn.searchParams.set("auth_error", reason);
  const res = NextResponse.redirect(signIn);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

function successRedirect(destination: string): NextResponse {
  const res = NextResponse.redirect(buildPublicUrl(destination));
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

function resolveDestination(
  nextRaw: string | null,
  typeRaw: string | null,
  fallback: string = DEFAULT_AUTH_REDIRECT
): string {
  const otpType = parseEmailOtpType(typeRaw);
  const defaultForType = otpType ? defaultPostAuthPathForOtpType(otpType) : fallback;
  return sanitizeInternalRedirectPath(nextRaw, defaultForType);
}

/**
 * Canonical email/auth callback.
 *
 * Built-in Supabase mailer (hook OFF):
 *   Email → Supabase /auth/v1/verify → redirect_to with ?code= (PKCE)
 *   → exchangeCodeForSession(code) → session cookies → /reset-password
 *
 * Maro Send Email Hook (hook ON):
 *   Email → https://maro.al/auth/callback?token_hash=…&type=…
 *   → verifyOtp({ token_hash, type }) — never exchangeCodeForSession for token_hash
 */
export async function GET(req: NextRequest) {
  if (!supabaseRouteHandlerConfigured()) {
    return authErrorRedirect("not_configured");
  }

  const { searchParams } = req.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const typeRaw = searchParams.get("type");
  const nextRaw = searchParams.get("next");
  const code = searchParams.get("code");
  if ((code && tokenHash) || (typeRaw && !parseEmailOtpType(typeRaw)) ||
      (nextRaw && !sanitizeInternalRedirectPath(nextRaw, ""))) {
    return authErrorRedirect("malformed_callback");
  }

  const providerError = searchParams.get("error");
  const providerErrorCode = searchParams.get("error_code");
  if (providerError || providerErrorCode) {
    const reason = classifySupabaseRedirectError(providerError, providerErrorCode);
    console.warn("[auth/callback]", callbackFailureLogMeta({ reason, flow: "provider_redirect", otpType: typeRaw }));
    return authErrorRedirect(reason);
  }

  // Built-in Supabase mailer PKCE handoff — prefer code before token_hash.
  if (code) {
    const destination = typeRaw === "recovery" ? "/reset-password" : resolveDestination(nextRaw, typeRaw);
    const pkceVerifierPresent = requestHasPkceVerifierCookie(req.cookies.getAll());
    let response = successRedirect(destination);
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code).catch(() => ({ error: { message: "exchange failed" } }));
    if (error) {
      const exchangeFailureCategory = classifyCodeExchangeFailure(error.message);
      const reason = classifyCodeExchangeError(error.message);
      console.warn(
        "[auth/callback]",
        callbackFailureLogMeta({
          reason,
          flow: "code_exchange",
          otpType: typeRaw,
          exchangeFailureCategory,
          pkceVerifierPresent,
        })
      );
      return authErrorRedirect(reason);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  // Signed email hook links verify directly without depending on browser PKCE state.
  if (!tokenHash) {
    console.warn("[auth/callback]", callbackFailureLogMeta({ reason: "missing_token", flow: "missing_params", otpType: typeRaw }));
    return authErrorRedirect("missing_token");
  }

  const otpType = parseEmailOtpType(typeRaw);
  if (!otpType) {
    return authErrorRedirect("invalid_type");
  }

  const destination = otpType === "recovery" ? "/reset-password" : resolveDestination(nextRaw, typeRaw, defaultPostAuthPathForOtpType(otpType));

  let response = successRedirect(destination);
  const supabase = createSupabaseRouteHandlerClient(req, response);

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  }).catch(() => ({ error: { message: "verification failed" } }));

  if (error) {
    const reason = classifyVerifyOtpError(error.message);
    console.warn("[auth/callback]", callbackFailureLogMeta({ reason, flow: "verify_otp", otpType }));
    return authErrorRedirect(reason);
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}
