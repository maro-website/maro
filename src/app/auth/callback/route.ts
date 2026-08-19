import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildPublicUrl } from "@/lib/config/appOrigin";
import { createSupabaseRouteHandlerClient, supabaseRouteHandlerConfigured } from "@/lib/supabase/routeHandler";
import { parseEmailOtpType } from "@/lib/email/authUrls";
import {
  callbackFailureLogMeta,
  classifyCodeExchangeError,
  classifySupabaseRedirectError,
  classifyVerifyOtpError,
  type AuthCallbackErrorReason,
} from "@/lib/auth/callbackErrors";
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
  return res;
}

function successRedirect(destination: string): NextResponse {
  const res = NextResponse.redirect(buildPublicUrl(destination));
  res.headers.set("Cache-Control", "no-store");
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
 * Future Maro Send Email Hook (hook ON):
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

  const providerError = searchParams.get("error");
  const providerErrorCode = searchParams.get("error_code");
  if (providerError || providerErrorCode) {
    const reason = classifySupabaseRedirectError(providerError, providerErrorCode);
    console.warn("[auth/callback]", callbackFailureLogMeta({ reason, flow: "provider_redirect", otpType: typeRaw }));
    return authErrorRedirect(reason);
  }

  // Built-in Supabase mailer PKCE handoff — prefer code before token_hash.
  if (code) {
    const destination = resolveDestination(nextRaw, typeRaw);
    let response = successRedirect(destination);
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const reason = classifyCodeExchangeError(error.message);
      console.warn("[auth/callback]", callbackFailureLogMeta({ reason, flow: "code_exchange", otpType: typeRaw }));
      return authErrorRedirect(reason);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  // Future custom hook + direct token_hash links.
  if (!tokenHash) {
    console.warn("[auth/callback]", callbackFailureLogMeta({ reason: "missing_token", flow: "missing_params", otpType: typeRaw }));
    return authErrorRedirect("missing_token");
  }

  const otpType = parseEmailOtpType(typeRaw);
  if (!otpType) {
    return authErrorRedirect("invalid_type");
  }

  const destination = resolveDestination(nextRaw, typeRaw, defaultPostAuthPathForOtpType(otpType));

  let response = successRedirect(destination);
  const supabase = createSupabaseRouteHandlerClient(req, response);

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  });

  if (error) {
    const reason = classifyVerifyOtpError(error.message);
    console.warn("[auth/callback]", callbackFailureLogMeta({ reason, flow: "verify_otp", otpType }));
    return authErrorRedirect(reason);
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}
