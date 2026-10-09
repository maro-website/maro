import "server-only";
import type { RaiAcceptConfig } from "./config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getOrderById,serializeOrder,type CreditOrderRow } from "@/lib/payments/orders";
import { sendViaResend,type ResendSendInput } from "@/lib/email/provider/resend";
import { renderEmailLayout } from "@/lib/email/layout";
import { asRecord } from "./contract";

export function buildRaiAcceptReceipt(order:CreditOrderRow,origin:string):ResendSendInput {
  const data=serializeOrder(order);const to=order.billing_snapshot?.email??order.user_email??"";
  if (order.provider!=="raiaccept"||order.status!=="paid"||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("receipt_invalid_order");
  const subject="Pagesa jote në maro.al u konfirmua";
  const home = new URL(origin);
  if (home.protocol!=="https:"||home.username||home.password) throw new Error("receipt_invalid_origin");
  const ordersUrl = new URL("/account?tab=orders",home.origin).href;
  const amount = `${(order.amount_cents/100).toFixed(2)} ${order.currency}`;
  const date = new Date(order.paid_at??order.created_at).toLocaleString("sq-AL",{timeZone:"Europe/Tirane",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
  const text=`Pagesa për ${data.label} u konfirmua.\nShuma: ${amount}\nKredite: ${order.credits}\nData: ${date}\nPorosia: ${order.id}\nShiko dhe shkarko faturën PDF te Porositë e mia: ${ordersUrl}\nVazhdo në maro: ${home.origin}\nPër ndihmë: info@maro.al`;
  return {from:"maro <info@maro.al>",replyTo:"info@maro.al",to,subject,text,
    html:renderEmailLayout({heading:"Pagesa u kry me sukses.",paragraphs:["Faleminderit që zgjodhe maro. Blerja jote u konfirmua dhe kreditet janë shtuar në llogarinë tënde."],
      cta:{label:"Shiko faturën PDF",url:ordersUrl},footerNote:"Faturën mund ta shkarkosh te “Porositë e mia”, pasi të hysh në llogarinë tënde."},
      {previewText:`${amount} · ${order.credits} kredite. Pagesa jote u konfirmua.`,assetOrigin:home.origin,
        receipt:{label:data.label,amount,credits:String(order.credits),reference:order.id,date},
        secondaryCta:{label:"Vazhdo në maro",url:home.origin}}),
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
