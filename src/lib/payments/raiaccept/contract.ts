import "server-only";
import type { CreditOrderRow } from "@/lib/payments/orders";
import type { RaiAcceptConfig, RaiAcceptEnvironment } from "./config";
import { validatedAppOrigin } from "./config";
import { RaiAcceptError } from "./errors";

const ID = /^[A-Za-z0-9_-]{1,150}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ORDER_STATUSES = ["DRAFT", "CHECKOUT", "PAID", "PARTIALLY_REFUNDED", "FULLY_REFUNDED", "FAILED", "CANCELED", "ABANDONED"] as const;
export type RaiAcceptOrderStatus = typeof ORDER_STATUSES[number];
export interface RaiAcceptPayload {
  invoice: { amount: number; currency: "EUR"; description: string; merchantOrderReference: string;
    items: { description: string; numberOfItems: 1; price: number }[] };
  consumer?: { firstName?: string; lastName?: string; email: string; ipAddress?: string };
  billingAddress?: { firstName?: string; lastName?: string; city: string };
  paymentMethodPreference: "CARD";
  recurring: { recurringModel: "NONE" };
  urls: { successUrl: string; cancelUrl: string; failUrl: string; notificationUrl: string };
}
export interface RaiAcceptOrder {
  id: string;
  status: RaiAcceptOrderStatus;
  isProduction: boolean;
  merchantAccountId: string;
  merchantReference: string;
  amountCents: number;
  currency: string;
}

export function providerId(value: unknown): string {
  if (typeof value !== "string" || !ID.test(value)) throw new RaiAcceptError("raiaccept_invalid_provider_id");
  return value;
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RaiAcceptError("raiaccept_invalid_response");
  return value as Record<string, unknown>;
}

export function centsFromApiAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RaiAcceptError("raiaccept_invalid_amount");
  }
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new RaiAcceptError("raiaccept_invalid_amount");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 2_147_483_647) throw new RaiAcceptError("raiaccept_invalid_amount");
  return cents;
}

export function parseRaiAcceptOrder(value: unknown, config: Pick<RaiAcceptConfig, "merchantAccountId" | "environment">): RaiAcceptOrder {
  const raw = asRecord(value);
  const merchant = asRecord(raw.merchant);
  const invoice = asRecord(raw.invoice);
  if (typeof raw.isProduction !== "boolean" || raw.isProduction !== (config.environment === "production")) {
    throw new RaiAcceptError("raiaccept_environment_mismatch");
  }
  if (merchant.merchantAccountId !== config.merchantAccountId) throw new RaiAcceptError("raiaccept_merchant_mismatch");
  if (!ORDER_STATUSES.includes(raw.status as RaiAcceptOrderStatus)) throw new RaiAcceptError("raiaccept_invalid_order_status");
  if (invoice.currency !== "EUR") throw new RaiAcceptError("raiaccept_currency_mismatch");
  return { id: providerId(raw.orderIdentification), status: raw.status as RaiAcceptOrderStatus,
    isProduction: raw.isProduction, merchantAccountId: config.merchantAccountId,
    merchantReference: providerId(invoice.merchantOrderReference),
    amountCents: centsFromApiAmount(invoice.amount), currency: "EUR" };
}

export function assertOrderMatchesPayload(order: RaiAcceptOrder, payload: RaiAcceptPayload): void {
  if (order.merchantReference !== payload.invoice.merchantOrderReference ||
      order.amountCents !== centsFromApiAmount(payload.invoice.amount) || order.currency !== payload.invoice.currency) {
    throw new RaiAcceptError("raiaccept_order_snapshot_mismatch");
  }
}

export function parseRaiAcceptCheckout(value: unknown): { sessionId: string; redirectUrl: string } {
  const raw = asRecord(value);
  const sessionId = providerId(raw.sessionId);
  let url: URL;
  try { url = new URL(raw.paymentRedirectURL as string); }
  catch { throw new RaiAcceptError("raiaccept_invalid_checkout_url"); }
  if (url.protocol !== "https:" || url.origin !== "https://payment.raiaccept.com" || url.username || url.password ||
      url.pathname !== "/checkout" || url.hash || [...url.searchParams.keys()].length !== 1 || url.searchParams.getAll("paymentSession").length !== 1 ||
      url.searchParams.get("paymentSession") !== sessionId) throw new RaiAcceptError("raiaccept_invalid_checkout_url");
  return { sessionId, redirectUrl: url.toString() };
}

export function buildRaiAcceptPayload(order: CreditOrderRow, origin: string, environment: RaiAcceptEnvironment): RaiAcceptPayload {
  const appOrigin = validatedAppOrigin(origin, environment);
  const snapshot = order.commercial_snapshot;
  const billing = order.billing_snapshot;
  if (!UUID.test(order.id) || order.provider !== "raiaccept" || order.status !== "pending" || !order.user_id ||
      !Number.isInteger(order.amount_cents) || order.amount_cents <= 0 || order.amount_cents > 2_147_483_647 || order.currency !== "EUR" ||
      !snapshot || snapshot.price_cents !== order.amount_cents || snapshot.currency !== order.currency ||
      snapshot.credits_snapshot !== order.credits || snapshot.order_kind !== order.order_kind ||
      !Number.isInteger(order.credits) || order.credits <= 0 || !order.order_kind) {
    throw new RaiAcceptError("raiaccept_invalid_order_snapshot");
  }
  // Promotions must affect the frozen amount before becoming available in this flow.
  if (order.promo_code) throw new RaiAcceptError("raiaccept_promo_not_supported");
  if (!billing?.legalConsent || !billing.fullName?.trim() || !billing.city?.trim() || !billing.country?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email)) throw new RaiAcceptError("raiaccept_invalid_billing");
  const names = billing.fullName.trim().split(/\s+/);
  const firstName = names.shift()!.slice(0, 32);
  const lastName = names.join(" ").slice(0, 32);
  const label = (snapshot.plan_name_snapshot ?? `${order.credits} kredite Maro`).slice(0, 100);
  const amount = order.amount_cents / 100;
  const merchantOrderReference = `MARO-${environment === "production" ? "P" : "S"}-${order.id}`;
  const returnUrl = (result: string) => `${appOrigin}/pay/raiaccept/return?orderId=${order.id}&result=${result}`;
  return {
    invoice: { amount, currency: "EUR", description: label, merchantOrderReference,
      items: [{ description: label, numberOfItems: 1, price: amount }] },
    consumer: { firstName, ...(lastName ? { lastName } : {}), email: billing.email },
    // Country is recommended, not required. Preserve the actual country in the
    // billing snapshot; add its bank mapping only after Kosovo's accepted code is verified.
    billingAddress: { firstName, ...(lastName ? { lastName } : {}), city: billing.city.slice(0, 50) },
    paymentMethodPreference: "CARD", recurring: { recurringModel: "NONE" },
    urls: { successUrl: returnUrl("success"), cancelUrl: returnUrl("cancel"), failUrl: returnUrl("fail"),
      notificationUrl: `${appOrigin}/api/payments/raiaccept/webhook` },
  };
}
