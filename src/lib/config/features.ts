/** Client-safe feature flags (NEXT_PUBLIC_* only). */

export function isSignupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SIGNUP_ENABLED === "true";
}

export function paymentMode(): "test" | "live" {
  return process.env.PAYMENT_MODE === "live" ? "live" : "test";
}
