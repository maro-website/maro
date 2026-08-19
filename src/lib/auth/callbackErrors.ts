/** User-facing auth callback error codes (query param auth_error). */

export type AuthCallbackErrorReason =
  | "not_configured"
  | "missing_token"
  | "malformed_callback"
  | "invalid_type"
  | "expired_link"
  | "invalid_link"
  | "verification_failed"
  | "code_exchange_failed"
  | "provider_error";

export function classifyVerifyOtpError(message: string): AuthCallbackErrorReason {
  const lower = message.toLowerCase();
  if (lower.includes("expired")) return "expired_link";
  if (
    lower.includes("invalid") ||
    lower.includes("not found") ||
    lower.includes("already been used") ||
    lower.includes("already used")
  ) {
    return "invalid_link";
  }
  return "verification_failed";
}

export function classifyCodeExchangeError(message: string): AuthCallbackErrorReason {
  const lower = message.toLowerCase();
  if (lower.includes("expired")) return "expired_link";
  if (lower.includes("invalid") || lower.includes("not found")) return "invalid_link";
  return "code_exchange_failed";
}

export function classifySupabaseRedirectError(
  error: string | null,
  errorCode: string | null
): AuthCallbackErrorReason {
  const combined = `${error ?? ""} ${errorCode ?? ""}`.toLowerCase();
  if (!combined.trim()) return "provider_error";
  if (combined.includes("expired") || combined.includes("otp_expired")) return "expired_link";
  if (combined.includes("invalid")) return "invalid_link";
  return "provider_error";
}

/** Safe server log metadata — never include tokens or full callback URLs. */
export function callbackFailureLogMeta(input: {
  reason: AuthCallbackErrorReason;
  flow: "code_exchange" | "verify_otp" | "provider_redirect" | "missing_params";
  otpType?: string | null;
}): Record<string, string> {
  return {
    reason: input.reason,
    flow: input.flow,
    otp_type: input.otpType ?? "unknown",
  };
}
