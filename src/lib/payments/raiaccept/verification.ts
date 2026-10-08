import "server-only";
import { asRecord, centsFromApiAmount, providerId, type RaiAcceptOrder } from "./contract";
import type { RaiAcceptConfig } from "./config";
import { RaiAcceptError } from "./errors";

export interface RaiAcceptTransaction {
  id: string; orderId: string; merchantAccountId: string; merchantReference: string; isProduction: boolean;
  amountCents: number; currency: "EUR"; type: "PURCHASE" | "REFUND"; status: string; statusCode: string;
  createdAt: string; updatedAt: string;
}
export function parseRaiAcceptTransaction(value: unknown, orderId: string, transactionId: string,
  config: Pick<RaiAcceptConfig,"environment"|"merchantAccountId">): RaiAcceptTransaction {
  const raw=asRecord(value); const tx=asRecord(raw.transaction); const order=asRecord(raw.order);
  const merchant=asRecord(raw.merchant); const invoice=asRecord(order.invoice);
  if (tx.isProduction !== (config.environment==="production")) throw new RaiAcceptError("raiaccept_environment_mismatch");
  if (merchant.merchantAccountId !== config.merchantAccountId) throw new RaiAcceptError("raiaccept_merchant_mismatch");
  if (providerId(tx.transactionId)!==transactionId || providerId(order.orderIdentification)!==orderId) throw new RaiAcceptError("raiaccept_transaction_id_mismatch");
  if (tx.transactionCurrency!=="EUR") throw new RaiAcceptError("raiaccept_currency_mismatch");
  if (!["PURCHASE","REFUND"].includes(String(tx.transactionType)) || !["DRAFT","PENDING","SUCCESS","FAILED"].includes(String(tx.status)) ||
      typeof tx.statusCode!=="string" || !/^\d{4}$/.test(tx.statusCode)) throw new RaiAcceptError("raiaccept_invalid_transaction_status");
  const timestamp=(value:unknown) => {
    if (typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) {
      throw new RaiAcceptError("raiaccept_invalid_transaction_timestamp");
    }
    return value;
  };
  const createdAt=timestamp(tx.createdOn); const updatedAt=timestamp(tx.updatedOn);
  if (Date.parse(updatedAt)<Date.parse(createdAt)) throw new RaiAcceptError("raiaccept_invalid_transaction_timestamp");
  // Return only the evidence needed by the ledger. Card/customer/token data is discarded.
  return {id:transactionId,orderId,merchantAccountId:config.merchantAccountId,merchantReference:providerId(invoice.merchantOrderReference),
    isProduction:tx.isProduction as boolean,amountCents:centsFromApiAmount(tx.transactionAmount),currency:"EUR",type:tx.transactionType as "PURCHASE"|"REFUND",
    status:tx.status as string,statusCode:tx.statusCode,createdAt,updatedAt};
}

export interface VerificationClient {
  getOrder(id:string):Promise<RaiAcceptOrder>;
  listTransactions(id:string):Promise<Record<string,unknown>[]>;
  getTransaction(orderId:string,transactionId:string):Promise<RaiAcceptTransaction>;
}
export interface ExpectedPayment {
  provider_order_id:string; merchant_reference:string; amount_cents:number; currency:string;
  environment:"sandbox"|"production"; merchant_account_id:string;
}
function assertExpected(order:RaiAcceptOrder, expected:ExpectedPayment) {
  if (order.id!==expected.provider_order_id || order.merchantReference!==expected.merchant_reference || order.amountCents!==expected.amount_cents ||
      order.currency!==expected.currency || order.merchantAccountId!==expected.merchant_account_id || order.isProduction!==(expected.environment==="production")) {
    throw new RaiAcceptError("raiaccept_verification_order_mismatch");
  }
}
/** This accepts authenticated API responses only. A webhook/redirect can never supply payment proof. */
export async function fetchRaiAcceptPaymentProof(expected:ExpectedPayment,client:VerificationClient) {
  const deadline=Date.now()+90_000;
  const initial=await client.getOrder(expected.provider_order_id); assertExpected(initial,expected);
  const discovered=await client.listTransactions(expected.provider_order_id);
  const unique=[...new Set(discovered.map(row=>providerId(row.transactionId)))];
  if (unique.length>20) throw new RaiAcceptError("raiaccept_transactions_require_review");
  const purchases:RaiAcceptTransaction[]=[]; let successfulRefund=false;
  // Bound bank concurrency and authenticate each detail; list items are only discovery.
  for (const id of unique) {
    if (Date.now()>deadline) throw new RaiAcceptError("raiaccept_verification_time_budget");
    const tx=await client.getTransaction(expected.provider_order_id,id);
    if (tx.orderId!==expected.provider_order_id || tx.merchantReference!==expected.merchant_reference || tx.merchantAccountId!==expected.merchant_account_id ||
        tx.currency!==expected.currency || tx.isProduction!==(expected.environment==="production")) throw new RaiAcceptError("raiaccept_verification_transaction_mismatch");
    if (tx.status==="SUCCESS" && tx.statusCode==="0000") {
      if (tx.type==="PURCHASE") {
        if (tx.amountCents!==expected.amount_cents) throw new RaiAcceptError("raiaccept_verification_amount_mismatch");
        purchases.push(tx);
      } else successfulRefund=true;
    }
  }
  if (Date.now()>deadline) throw new RaiAcceptError("raiaccept_verification_time_budget");
  const order=await client.getOrder(expected.provider_order_id); assertExpected(order,expected);
  if (successfulRefund && order.status==="PAID") throw new RaiAcceptError("raiaccept_refund_state_inconsistent");
  // Deterministic evidence selection; >1 successful purchase is marked for review by SQL.
  purchases.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
  return {order:{...order,purchaseCount:purchases.length},transaction:purchases[0]??null};
}

/** Untrusted notification fields only route a known order into durable verification. */
export function parseRaiAcceptNotification(value:unknown,config:Pick<RaiAcceptConfig,"environment"|"merchantAccountId">) {
  const raw=asRecord(value); const tx=asRecord(raw.transaction); const merchant=asRecord(raw.merchant); const order=asRecord(raw.order);
  if (tx.isProduction!==(config.environment==="production") || merchant.merchantAccountId!==config.merchantAccountId) {
    throw new RaiAcceptError("raiaccept_notification_scope_mismatch");
  }
  return {providerOrderId:providerId(order.orderIdentification),transactionId:providerId(tx.transactionId),
    merchantReference:providerId(asRecord(order.invoice).merchantOrderReference)};
}
