import "server-only";
import type { RaiAcceptConfig } from "./config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getOrderById,serializeOrder,type CreditOrderRow } from "@/lib/payments/orders";
import { sendViaResend,type ResendSendInput } from "@/lib/email/provider/resend";
import { escapeHtml } from "@/lib/email/variables";
import { asRecord } from "./contract";

export function buildRaiAcceptReceipt(order:CreditOrderRow,origin:string):ResendSendInput {
  const data=serializeOrder(order);const to=order.billing_snapshot?.email??order.user_email??"";
  if (order.provider!=="raiaccept"||order.status!=="paid"||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("receipt_invalid_order");
  const subject="Pagesa jote në maro.al u konfirmua";
  const text=`Pagesa për ${data.label} u konfirmua.\nShuma: ${(order.amount_cents/100).toFixed(2)} ${order.currency}\nKredite: ${order.credits}\nPorosia: ${order.id}\nFatura dhe historiku: ${origin}/account?tab=orders\nPër ndihmë: info@maro.al`;
  return {from:"maro <info@maro.al>",replyTo:"info@maro.al",to,subject,text,
    html:`<html lang="sq"><body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:24px"><h1>Pagesa u konfirmua</h1><p>${escapeHtml(data.label)}</p><p>${(order.amount_cents/100).toFixed(2)} ${escapeHtml(order.currency)} · ${order.credits} kredite</p><p>Porosia: ${escapeHtml(order.id)}</p><p><a href="${escapeHtml(origin)}/account?tab=orders">Fatura dhe porositë e mia</a></p><p>maro.al · info@maro.al</p></body></html>`,
    idempotencyKey:`raiaccept-receipt-${order.id}`};
}
export async function deliverRaiAcceptReceipts(config:RaiAcceptConfig) {
  async function rpc(name:string,args:Record<string,unknown>) {
    const {data,error}=await getSupabaseAdmin().rpc(name,args);if (error) throw new Error("receipt_storage_unavailable");
    const result=asRecord(data);if (result.ok!==true) throw new Error("receipt_storage_rejected");return result;
  }
  const claimed=await rpc("claim_raiaccept_receipts",{p_environment:config.environment,p_merchant:config.merchantAccountId,p_limit:3});
  if (!Array.isArray(claimed.jobs)||claimed.jobs.length>3) throw new Error("receipt_storage_invalid");
  const report={claimed:claimed.jobs.length,sent:0,failed:0};
  for(const raw of claimed.jobs) {
    const job=asRecord(raw);const args={p_order_id:job.order_id,p_lease:job.lease_id};
    try {
      const order=await getOrderById(String(job.order_id));if (!order) throw new Error("receipt_order_missing");
      const frozen=await rpc("prepare_raiaccept_receipt",{...args,p_payload:buildRaiAcceptReceipt(order,config.appOrigin)});
      // Freeze the exact request before sending; provider retries share the same idempotency key and payload.
      const result=await sendViaResend(asRecord(frozen.payload) as unknown as ResendSendInput);
      await rpc("finish_raiaccept_receipt",{...args,p_sent:result.success,p_message_id:result.providerMessageId??null,
        p_error:result.success?null:`receipt_${(result.errorCategory??"unknown").toLowerCase()}`});
      if (result.success) report.sent++;else report.failed++;
    } catch {
      report.failed++;
      try {await rpc("finish_raiaccept_receipt",{...args,p_sent:false,p_error:"receipt_delivery_failed"});} catch { /* Lease expiry recovers a lost ACK. */ }
    }
  }
  return report;
}
