import "server-only";

/** Internal-only PKCE exchange failure categories (never expose raw provider text). */
export type CodeExchangeFailureCategory =
  | "pkce_verifier_missing"
  | "pkce_verifier_mismatch"
  | "code_expired"
  | "code_already_used"
  | "invalid_grant"
  | "invalid_code"
  | "unknown";

const PKCE_VERIFIER_COOKIE_SUFFIX = "-code-verifier";

/**
 * Supabase auth-js storage key suffix for PKCE verifier cookies.
 * Pattern: `sb-{projectRef}-auth-token-code-verifier` or
 * `sb-{projectRef}-auth-token-flow-{flowId}-code-verifier`.
 */
export function isSupabasePkceVerifierCookieName(name: string): boolean {
  return name.includes(PKCE_VERIFIER_COOKIE_SUFFIX);
}

export function requestHasPkceVerifierCookie(
  cookies: ReadonlyArray<{ name: string; value?: string }>
): boolean {
  return cookies.some((cookie) => isSupabasePkceVerifierCookieName(cookie.name));
}

export function responseSetsPkceVerifierCookie(
  setCookieHeaders: ReadonlyArray<string>
): boolean {
  return setCookieHeaders.some((header) => {
    const name = header.split("=")[0]?.trim() ?? "";
    return isSupabasePkceVerifierCookieName(name);
  });
}
