/** Safe internal redirect paths — client + server safe (no server-only). */

export const DEFAULT_AUTH_REDIRECT = "/";

/**
 * Allow only same-origin relative paths.
 * Rejects external URLs, protocol-relative paths, and javascript: payloads.
 */
export function sanitizeInternalRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_AUTH_REDIRECT
): string {
  if (value == null || typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

  const lower = trimmed.toLowerCase();
  if (lower.includes("://") || lower.startsWith("javascript:") || lower.startsWith("data:")) {
    return fallback;
  }
  if (trimmed.includes("\\")) return fallback;
  if (/%2f%2f/i.test(trimmed) || /%5c/i.test(trimmed)) return fallback;

  // Strip fragments — not used for post-auth navigation
  const withoutHash = trimmed.split("#")[0] || fallback;
  if (!withoutHash.startsWith("/")) return fallback;

  return withoutHash;
}

export function defaultPostAuthPathForOtpType(type: string): string {
  switch (type) {
    case "recovery":
      return "/reset-password";
    case "email_change":
      return "/account";
    case "signup":
    case "email":
      return "/";
    default:
      return DEFAULT_AUTH_REDIRECT;
  }
}
