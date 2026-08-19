import type { CodeExchangeFailureCategory } from "@/lib/auth/pkceDiagnostics";

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

export function classifyCodeExchangeFailure(message: string): CodeExchangeFailureCategory {
  const lower = message.toLowerCase();

  if (
    lower.includes("pkce") &&
    (lower.includes("not found") ||
      lower.includes("missing") ||
      lower.includes("non-empty") ||
      lower.includes("should be non-empty"))
  ) {
    return "pkce_verifier_missing";
  }

  if (
    lower.includes("code verifier") &&
    (lower.includes("not found") || lower.includes("missing") || lower.includes("non-empty"))
  ) {
    return "pkce_verifier_missing";
  }

  if (lower.includes("verifier") && (lower.includes("mismatch") || lower.includes("invalid"))) {
    return "pkce_verifier_mismatch";
  }

  if (lower.includes("expired")) return "code_expired";
  if (lower.includes("already been used") || lower.includes("already used")) {
    return "code_already_used";
  }
  if (lower.includes("invalid grant")) return "invalid_grant";
  if (lower.includes("invalid") || lower.includes("not found")) return "invalid_code";

  return "unknown";
}

export function classifyCodeExchangeError(message: string): AuthCallbackErrorReason {
  const category = classifyCodeExchangeFailure(message);
  if (category === "code_expired") return "expired_link";
  if (
    category === "invalid_code" ||
    category === "code_already_used" ||
    category === "invalid_grant"
  ) {
    return "invalid_link";
  }
  if (category === "pkce_verifier_missing" || category === "pkce_verifier_mismatch") {
    return "code_exchange_failed";
  }
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
  exchangeFailureCategory?: CodeExchangeFailureCategory;
  pkceVerifierPresent?: boolean;
}): Record<string, string | boolean> {
  const meta: Record<string, string | boolean> = {
    reason: input.reason,
    flow: input.flow,
    otp_type: input.otpType ?? "unknown",
  };

  if (typeof input.pkceVerifierPresent === "boolean") {
    meta.pkce_verifier_present = input.pkceVerifierPresent;
  }
  if (input.exchangeFailureCategory) {
    meta.exchange_failure_category = input.exchangeFailureCategory;
  }

  return meta;
}
