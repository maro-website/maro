import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, supabaseRouteHandlerConfigured } from "@/lib/supabase/routeHandler";
import { parseEmailOtpType } from "@/lib/email/authUrls";
import {
  DEFAULT_AUTH_REDIRECT,
  sanitizeInternalRedirectPath,
  defaultPostAuthPathForOtpType,
} from "@/lib/auth/safeRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authErrorRedirect(req: NextRequest, reason: string): NextResponse {
  const signIn = new URL("/sign-in", req.url);
  signIn.searchParams.set("auth_error", reason);
  const res = NextResponse.redirect(signIn);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function successRedirect(req: NextRequest, destination: string): NextResponse {
  const res = NextResponse.redirect(new URL(destination, req.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * Canonical email token callback.
 * token_hash flows use verifyOtp — never exchangeCodeForSession.
 * PKCE `code` query param (non-email) may use exchangeCodeForSession separately.
 */
export async function GET(req: NextRequest) {
  if (!supabaseRouteHandlerConfigured()) {
    return authErrorRedirect(req, "not_configured");
  }

  const { searchParams } = req.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const typeRaw = searchParams.get("type");
  const nextRaw = searchParams.get("next");
  const code = searchParams.get("code");

  // PKCE OAuth/code exchange — separate from token_hash email verification.
  if (!tokenHash && code) {
    const fallback = sanitizeInternalRedirectPath(nextRaw, DEFAULT_AUTH_REDIRECT);
    let response = successRedirect(req, fallback);
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return authErrorRedirect(req, "code_exchange_failed");
    }
    return response;
  }

  if (!tokenHash) {
    return authErrorRedirect(req, "missing_token");
  }

  const otpType = parseEmailOtpType(typeRaw);
  if (!otpType) {
    return authErrorRedirect(req, "invalid_type");
  }

  const destination = sanitizeInternalRedirectPath(
    nextRaw,
    defaultPostAuthPathForOtpType(otpType)
  );

  let response = successRedirect(req, destination);
  const supabase = createSupabaseRouteHandlerClient(req, response);

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  });

  if (error) {
    const reason =
      error.message.toLowerCase().includes("expired") ? "expired_link" : "verification_failed";
    return authErrorRedirect(req, reason);
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}
