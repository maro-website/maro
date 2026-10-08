import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { BillingSnapshot, CreditOrderRow } from "@/lib/payments/orders";
import type { RaiAcceptConfig } from "./config";
import type { RaiAcceptClient } from "./client";
import { asRecord, buildRaiAcceptPayload, parseRaiAcceptCheckout, type RaiAcceptPayload } from "./contract";
import { RaiAcceptError } from "./errors";

export interface CheckoutIntent {
  order_id: string;
  user_id: string;
  environment: "sandbox" | "production";
  merchant_account_id: string;
  creation_state: "reserved" | "creating" | "created" | "creation_unknown" | "rejected";
  session_state: "not_started" | "creating" | "ready" | "creation_unknown" | "rejected";
  provider_order_id: string | null;
  request_payload: RaiAcceptPayload | null;
  lease_id: string | null;
  session_id: string | null;
  redirect_url: string | null;
}
type RpcResult = { ok: true; checkout: CheckoutIntent; order?: CreditOrderRow; claimed?: boolean } |
  { ok: false; error: string };
export interface CheckoutStore {
  reserve(userId: string, key: string, item: string, config: RaiAcceptConfig, billing: BillingSnapshot): Promise<RpcResult>;
  transition(intent: CheckoutIntent, action: string, data?: unknown): Promise<RpcResult>;
}
export type CheckoutResult = { orderId: string; state: "ready"; redirectUrl: string } |
  { orderId: string; state: "pending" | "review" | "rejected" } | { error: string };

const RESERVATION_ERRORS = new Set(["invalid_request", "invalid_billing", "invalid_item", "user_not_found",
  "idempotency_conflict", "topup_requires_active_plan", "paddle_managed_subscription", "order_in_progress",
  "plan_already_active", "renewal_not_available", "renewal_already_fulfilled", "upgrade_not_eligible"]);

export function createCheckoutStore(): CheckoutStore {
  async function rpc(name: string, args: Record<string, unknown>): Promise<RpcResult> {
    let data: unknown;
    try {
      const response = await getSupabaseAdmin().rpc(name, args);
      if (response.error) throw new RaiAcceptError("raiaccept_checkout_storage_unavailable");
      data = response.data;
    } catch { throw new RaiAcceptError("raiaccept_checkout_storage_unavailable"); }
    const value = asRecord(data);
    if (value.ok === false && typeof value.error === "string") return { ok: false, error: value.error };
    if (value.ok !== true || !value.checkout || typeof value.checkout !== "object") {
      throw new RaiAcceptError("raiaccept_checkout_storage_invalid");
    }
    return value as RpcResult;
  }
  return {
    reserve: (userId, key, item, config, billing) => rpc("reserve_raiaccept_checkout", {
      p_user_id: userId, p_request_key: key, p_item_id: item, p_environment: config.environment,
      p_merchant: config.merchantAccountId, p_billing: billing,
    }),
    transition: (intent, action, data = {}) => rpc("transition_raiaccept_checkout", {
      p_order_id: intent.order_id, p_user_id: intent.user_id, p_lease_id: intent.lease_id,
      p_action: action, p_data: data,
    }),
  };
}

function checkedIntent(result: RpcResult, userId: string, config: RaiAcceptConfig, orderId?: string): CheckoutIntent {
  if (!result.ok) throw new RaiAcceptError("raiaccept_checkout_transition_rejected");
  const intent = result.checkout;
  if (intent.user_id !== userId || intent.environment !== config.environment ||
      intent.merchant_account_id !== config.merchantAccountId || (orderId && intent.order_id !== orderId)) {
    throw new RaiAcceptError("raiaccept_checkout_ownership_mismatch");
  }
  return intent;
}

function publicResult(intent: CheckoutIntent): CheckoutResult {
  if (intent.creation_state === "rejected") return { orderId: intent.order_id, state: "rejected" };
  if (intent.session_state === "ready" && intent.session_id && intent.redirect_url) {
    const session = parseRaiAcceptCheckout({ sessionId: intent.session_id, paymentRedirectURL: intent.redirect_url });
    return { orderId: intent.order_id, state: "ready", redirectUrl: session.redirectUrl };
  }
  return { orderId: intent.order_id, state: intent.creation_state === "creation_unknown" ||
    intent.session_state === "creation_unknown" ? "review" : "pending" };
}

function safeFailure(error: unknown) {
  return error instanceof RaiAcceptError ? {
    code: error.httpStatus ? `raiaccept_http_${error.httpStatus}` : error.code,
    uncertain: error.indeterminate,
  } : { code: "raiaccept_unexpected_failure", uncertain: true };
}

/** Persist an exclusive lease BEFORE each bank POST. A lost response never causes a second POST. */
export async function startRaiAcceptCheckout(input: {
  userId: string; requestKey: string; itemId: string; billing: BillingSnapshot;
}, config: RaiAcceptConfig, client: Pick<RaiAcceptClient, "createOrder" | "createCheckout">,
store: CheckoutStore = createCheckoutStore()): Promise<CheckoutResult> {
  const reservation = await store.reserve(input.userId, input.requestKey, input.itemId, config, input.billing);
  if (!reservation.ok) return { error: RESERVATION_ERRORS.has(reservation.error) ? reservation.error : "checkout_unavailable" };
  let intent = checkedIntent(reservation, input.userId, config);
  if (intent.creation_state === "reserved") {
    const order = reservation.order;
    if (!order || order.id !== intent.order_id || order.user_id !== input.userId) {
      throw new RaiAcceptError("raiaccept_checkout_snapshot_missing");
    }
    const payload = buildRaiAcceptPayload(order, config.appOrigin, config.environment);
    const claim = await store.transition(intent, "claim_order", payload);
    intent = checkedIntent(claim, input.userId, config, intent.order_id);
    if (claim.ok && claim.claimed === true) {
      if (!intent.lease_id) throw new RaiAcceptError("raiaccept_checkout_lease_missing");
      try {
        const providerOrder = await client.createOrder(payload);
        intent = checkedIntent(await store.transition(intent, "bind_order", providerOrder), input.userId, config, intent.order_id);
      } catch (error) {
        // A DB acknowledgement may also be lost AFTER the bank created the order.
        const failure = safeFailure(error);
        if (error instanceof RaiAcceptError && error.code.startsWith("raiaccept_checkout_")) failure.uncertain = true;
        const recorded = await store.transition(intent, "order_error", failure);
        if (recorded.ok) return publicResult(checkedIntent(recorded, input.userId, config, intent.order_id));
        throw new RaiAcceptError("raiaccept_checkout_storage_unavailable");
      }
    }
  }
  if (intent.creation_state === "created" && intent.session_state === "not_started") {
    const claim = await store.transition(intent, "claim_session");
    intent = checkedIntent(claim, input.userId, config, intent.order_id);
    if (claim.ok && claim.claimed === true) {
      if (!intent.provider_order_id || !intent.request_payload || !intent.lease_id) {
        throw new RaiAcceptError("raiaccept_checkout_snapshot_missing");
      }
      try {
        // Reuse the stored payload, including callbacks and billing, without a new quote.
        const session = await client.createCheckout(intent.provider_order_id, intent.request_payload);
        intent = checkedIntent(await store.transition(intent, "bind_session", session), input.userId, config, intent.order_id);
      } catch (error) {
        const recorded = await store.transition(intent, "session_error", { ...safeFailure(error), uncertain: true });
        if (recorded.ok) return publicResult(checkedIntent(recorded, input.userId, config, intent.order_id));
        throw new RaiAcceptError("raiaccept_checkout_storage_unavailable");
      }
    }
  }
  return publicResult(intent);
}
