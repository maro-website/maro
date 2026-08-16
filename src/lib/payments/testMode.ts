import { paymentMode } from "@/lib/config/features";

/**
 * Test payment completion is allowed only when explicitly in test payment mode.
 * In live mode (`PAYMENT_MODE=live`), test fulfillment is always rejected.
 *
 * Optional override for staging: set ALLOW_TEST_PAYMENTS=true with PAYMENT_MODE=test.
 */
export function isTestPaymentAllowed(): boolean {
  if (paymentMode() !== "test") return false;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_PAYMENTS !== "true") {
    return false;
  }
  return true;
}

export function testPaymentBlockReason(): string {
  if (paymentMode() === "live") return "live_mode";
  if (process.env.NODE_ENV === "production") return "production_requires_allow_test_payments";
  return "forbidden";
}
