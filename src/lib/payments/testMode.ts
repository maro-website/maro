import "server-only";

import {
  isPaymentModeValid,
  isProduction,
  paymentModeStrict,
  resolvePaymentMode,
} from "@/lib/config/serverEnv";

/**
 * Test payment completion is allowed only outside production with valid PAYMENT_MODE=test.
 * Production never permits test fulfillment — even if ALLOW_TEST_PAYMENTS=true.
 */
export function isTestPaymentAllowed(): boolean {
  if (isProduction()) return false;
  if (!isPaymentModeValid()) return false;
  return paymentModeStrict() === "test";
}

export function testPaymentBlockReason(): string {
  if (isProduction()) return "production_blocked";
  if (!isPaymentModeValid()) return "invalid_payment_mode";
  if (resolvePaymentMode() === "live") return "live_mode";
  return "forbidden";
}
