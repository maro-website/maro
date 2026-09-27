import "server-only";

import { NextResponse } from "next/server";
import { isSignupEnabled } from "@/lib/config/features";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export type PaymentMode = "test" | "live";
export type PaymentModeStatus = PaymentMode | "invalid";

/** Resolve payment mode; unknown/empty values are invalid in production. */
export function resolvePaymentMode(): PaymentModeStatus {
  const raw = process.env.PAYMENT_MODE?.trim().toLowerCase();
  if (!raw) return isProduction() ? "invalid" : "test";
  if (raw === "live" || raw === "test") return raw;
  return "invalid";
}

/** Fail-closed payment mode for server decisions (invalid → live in production). */
export function paymentModeStrict(): PaymentMode {
  const mode = resolvePaymentMode();
  if (mode === "invalid") return isProduction() ? "live" : "test";
  return mode;
}

export function isPaymentModeValid(): boolean {
  return resolvePaymentMode() !== "invalid";
}

export function isTurnstileRequired(): boolean {
  return isSignupEnabled() && isProduction();
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isAuthEmailHookConfigured(): boolean {
  return Boolean(process.env.SUPABASE_AUTH_HOOK_SECRET?.trim());
}

export function infraUnavailableResponse(): NextResponse {
  return NextResponse.json({ error: "not-configured" }, { status: 503 });
}

export function denyProtectedOperationWithoutSupabase(
  configured: boolean
): { denied: true; response: NextResponse } | { denied: false } {
  if (!configured && isProduction()) {
    return { denied: true, response: infraUnavailableResponse() };
  }
  return { denied: false };
}

export type SecurityConfigStatus = {
  supabaseServer: "OK" | "MISSING";
  turnstile: "CONFIGURED" | "DISABLED" | "MISSING";
  cronSecret: "CONFIGURED" | "DISABLED" | "MISSING";
  resend: "CONFIGURED" | "MISSING";
  authEmailHook: "CONFIGURED" | "MISSING";
  paymentMode: PaymentModeStatus;
  testPayments: "ENABLED" | "DISABLED";
};

/** Non-secret security configuration snapshot for admin surfaces. */
export function getSecurityConfigStatus(): SecurityConfigStatus {
  return {
    supabaseServer: isSupabaseServerConfigured() ? "OK" : "MISSING",
    turnstile: isTurnstileConfigured()
      ? "CONFIGURED"
      : isTurnstileRequired()
        ? "MISSING"
        : "DISABLED",
    cronSecret: isCronSecretConfigured()
      ? "CONFIGURED"
      : isProduction()
        ? "MISSING"
        : "DISABLED",
    resend: isResendConfigured() ? "CONFIGURED" : "MISSING",
    authEmailHook: isAuthEmailHookConfigured() ? "CONFIGURED" : "MISSING",
    paymentMode: resolvePaymentMode(),
    testPayments: isProduction() ? "DISABLED" : resolvePaymentMode() === "test" ? "ENABLED" : "DISABLED",
  };
}
