import "server-only";

import type { EmailOtpType } from "@supabase/supabase-js";
import { getAppOrigin } from "@/lib/config/appOrigin";
import {
  defaultPostAuthPathForOtpType,
  sanitizeInternalRedirectPath,
} from "@/lib/auth/safeRedirect";

const VALID_OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export function isValidEmailOtpType(value: string): value is EmailOtpType {
  return VALID_OTP_TYPES.has(value);
}

export function parseEmailOtpType(value: string | null | undefined): EmailOtpType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isValidEmailOtpType(normalized) ? (normalized as EmailOtpType) : null;
}

export interface AuthCallbackUrlInput {
  tokenHash: string;
  type: EmailOtpType;
  next?: string | null;
}

/**
 * Build Maro-controlled auth callback URLs for email CTAs.
 * URLs exist only in memory during render/send — never persisted to logs/outbox.
 */
export function buildAuthCallbackUrl(input: AuthCallbackUrlInput): string {
  const tokenHash = input.tokenHash.trim();
  if (!tokenHash) {
    throw new Error("auth_callback:missing_token_hash");
  }

  const fallbackNext = defaultPostAuthPathForOtpType(input.type);
  const next = sanitizeInternalRedirectPath(input.next, fallbackNext);

  const url = new URL("/auth/callback", getAppOrigin());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", input.type);
  if (next && next !== "/") {
    url.searchParams.set("next", next);
  }

  return url.toString();
}

/** Map hook email_action_type to verifyOtp type (subset implemented in Phase 1A). */
export function hookActionToOtpType(action: string): EmailOtpType | null {
  switch (action) {
    case "signup":
      return "signup";
    case "recovery":
      return "recovery";
    case "email_change":
      return "email_change";
    default:
      return null;
  }
}
