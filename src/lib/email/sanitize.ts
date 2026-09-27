/** Canonical sanitizer for email payloads, logs, and outbox metadata. */

const SECRET_KEY_PATTERN =
  /^(token|token_hash|tokenhash|otp|password|secret|api_key|apikey|authorization|confirmation_url|recovery_url|magic_link_url|action_url)$/i;

const SECRET_VALUE_PATTERNS = [
  /token_hash=/i,
  /type=recovery/i,
  /type=signup/i,
  /type=email_change/i,
  /type=magiclink/i,
  /access_token=/i,
  /refresh_token=/i,
];

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

function looksLikeSecretValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.length > 500) return true;
  return SECRET_VALUE_PATTERNS.some((re) => re.test(value));
}

/** Redact sensitive keys/values from a flat string map (template variables). */
export function sanitizeEmailVariables(
  variables: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (isSecretKey(key) || looksLikeSecretValue(value)) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Redact nested objects for log/outbox metadata (mirrors admin audit conventions). */
export function sanitizeEmailMetadata(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!value) return null;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (isSecretKey(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof val === "string" && looksLikeSecretValue(val)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      out[key] = sanitizeEmailMetadata(val as Record<string, unknown>);
      continue;
    }
    out[key] = val;
  }
  return out;
}

/** Extract recipient domain for logs — never persist full address when avoidable. */
export function recipientDomainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at >= email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

/** Ensure outbox payload contains no auth secrets before persistence. */
export function buildSanitizedOutboxPayload(
  variables: Record<string, string>
): Record<string, string> {
  return sanitizeEmailVariables(variables);
}
