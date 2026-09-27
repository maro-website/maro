/** Client-safe feature flags (NEXT_PUBLIC_* only). */

export const MIN_PASSWORD_LENGTH = 10;

export function isSignupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SIGNUP_ENABLED === "true";
}

/** Client-safe payment mode hint. Server decisions use paymentModeStrict() in serverEnv.ts. */
export function paymentMode(): "test" | "live" {
  return process.env.PAYMENT_MODE === "live" ? "live" : "test";
}
