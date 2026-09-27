import "server-only";

import { MIN_PASSWORD_LENGTH } from "@/lib/config/features";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROMO_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export { MIN_PASSWORD_LENGTH };

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function normalizeBoundedString(
  value: unknown,
  maxLen: number
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function isValidPromoCode(value: string): boolean {
  return PROMO_CODE_RE.test(value);
}

export function isValidPromoKind(value: unknown): value is "link" | "code" {
  return value === "link" || value === "code";
}

export function isValidTrackKind(value: unknown): value is "copy" | "view" {
  return value === "copy" || value === "view";
}

export function parseOrderId(value: unknown): string | null {
  const id = normalizeBoundedString(value, 64);
  if (!id) return null;
  return isUuid(id) ? id : null;
}
