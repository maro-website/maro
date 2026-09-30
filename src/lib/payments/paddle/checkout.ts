import "server-only";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { BillingSnapshot, CreditOrderRow } from "@/lib/payments/orders";
import { getPaddle, paddleCheckoutUrl, paddlePriceId } from "./config";

export async function createPaddleCheckout(user: User, itemId: string, billing: BillingSnapshot) {
  const paddle = getPaddle();
  const admin = getSupabaseAdmin();
  const priceId = paddlePriceId(itemId);
  const plan = itemId === "standard" || itemId === "pro";
  // Fail closed on DB errors: never sell a fallback plan after a catalog outage.
  const { data: catalog, error: catalogError } = await admin.from(plan ? "commerce_plans" : "commerce_topups")
    .select("*").eq("id", itemId).eq("enabled", true).single();
  if (catalogError || !catalog || catalog.contact_only) throw new Error("paddle_catalog_unavailable");
  const price = await paddle.prices.get(priceId);
  if (price.status !== "active" || price.unitPrice.currencyCode !== catalog.currency ||
      Number(price.unitPrice.amount) !== catalog.price_cents || price.taxMode !== "internal" ||
      price.trialPeriod || price.unitPriceOverrides.length ||
      (plan ? price.billingCycle?.interval !== "day" || price.billingCycle.frequency !== catalog.duration_days
        : price.billingCycle !== null)) throw new Error("paddle_catalog_mismatch");
  const { data: result, error } = await admin.rpc("create_paddle_order", {
    p_user: user.id, p_item: itemId, p_price: priceId, p_billing: { ...billing, email: user.email },
  });
  if (error || !result?.order) throw new Error("paddle_order_unavailable");
  const order = result.order as CreditOrderRow & { paddle_customer_id?: string };
  if (order.amount_cents !== Number(price.unitPrice.amount) || order.currency !== price.unitPrice.currencyCode) {
    throw new Error("paddle_order_price_changed");
  }
  if (!result.created) {
    if (!order.provider_transaction_id) throw new Error("paddle_checkout_in_progress");
    const tx = await paddle.transactions.get(order.provider_transaction_id);
    if (!["draft", "ready", "completed", "paid"].includes(tx.status)) throw new Error("paddle_checkout_unavailable");
    return { orderId: order.id, transactionId: tx.id };
  }
  // Reuse only a customer already bound by the server to this authenticated user.
  const { data: previous, error: previousError } = await admin.from("credit_orders")
    .select("paddle_customer_id").eq("user_id", user.id).eq("provider", "paddle")
    .not("paddle_customer_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (previousError) throw new Error("paddle_customer_lookup_failed");
  let customerId: string | undefined = previous?.paddle_customer_id;
  if (!customerId) {
    // Recover a customer created before an interrupted response. Email alone is
    // never ownership evidence: require the server-written account identifier.
    const candidates = await paddle.customers.list({ email: [user.email!], perPage: 100 }).next();
    const owned = candidates.find((customer) => customer.customData?.maro_user_id === user.id && customer.status === "active");
    if (candidates.length && !owned) throw new Error("paddle_customer_ownership_mismatch");
    customerId = owned?.id ?? (await paddle.customers.create({
      email: user.email!, name: billing.fullName, customData: { maro_user_id: user.id },
    })).id;
  }
  const { error: customerError } = await admin.from("credit_orders")
    .update({ paddle_customer_id: customerId }).eq("id", order.id).eq("user_id", user.id);
  if (customerError) throw new Error("paddle_customer_binding_failed");
  const checkoutUrl = new URL(paddleCheckoutUrl());
  checkoutUrl.searchParams.set("order", order.id);
  const useAccountDefault = checkoutUrl.hostname === "localhost";
  const tx = await paddle.transactions.create({
    items: [{ priceId, quantity: 1 }], customerId, currencyCode: "EUR", collectionMode: "automatic",
    customData: { maro_app: "maro", maro_order_id: order.id, maro_user_id: user.id },
    // Sandbox localhost uses the account's default payment link. An explicit
    // localhost override is rejected by Paddle's approved-domain validation.
    ...(useAccountDefault ? {} : { checkout: { url: checkoutUrl.toString() } }),
  });
  const { data: bound, error: bindError } = await admin.from("credit_orders").update({
    provider_transaction_id: tx.id, paddle_customer_id: customerId,
  }).eq("id", order.id).eq("user_id", user.id).eq("provider", "paddle")
    .eq("status", "pending").is("provider_transaction_id", null).select("id").single();
  if (bindError || !bound) throw new Error("paddle_checkout_binding_failed");
  return { orderId: order.id, transactionId: tx.id };
}
