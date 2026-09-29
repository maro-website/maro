import "server-only";

/** Disabled legacy/future provider. Never a fallback for Paddle. */
export function legacyPaymentsEnabled(): boolean {
  return process.env.LEGACY_PAYMENTS_ENABLED === "true";
}
