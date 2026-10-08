import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { RaiAcceptConfig } from "./config";
import { asRecord } from "./contract";
import { RaiAcceptError } from "./errors";
import { fetchRaiAcceptPaymentProof, type ExpectedPayment, type VerificationClient } from "./verification";

export interface VerificationJob extends Omit<ExpectedPayment,"provider_order_id"> {
  order_id:string; provider_order_id:string|null; verification_lease_id:string;
}
type Proof=Awaited<ReturnType<typeof fetchRaiAcceptPaymentProof>>;
export interface VerificationOutcome { payment_state:string; fulfillment_state:string; review_reason:string|null }
export interface VerificationStore {
  enqueue(config:RaiAcceptConfig,providerId:string,reference:string):Promise<void>;
  claim(config:RaiAcceptConfig,limit:number,orderId?:string):Promise<VerificationJob[]>;
  apply(job:VerificationJob,proof:Proof):Promise<VerificationOutcome>;
  fail(job:VerificationJob,code:string):Promise<void>;
}
const RPC_ERRORS=new Set(["provider_order_mismatch","local_snapshot_mismatch","successful_purchase_required","invalid_paid_timestamp",
  "provider_transaction_duplicate","lease_mismatch","forbidden","invalid_request"]);
export function createVerificationStore():VerificationStore {
  async function rpc(name:string,args:Record<string,unknown>) {
    let result:Record<string,unknown>;
    try {
      const response=await getSupabaseAdmin().rpc(name,args);
      if (response.error) throw new RaiAcceptError("raiaccept_verification_storage_unavailable");
      result=asRecord(response.data);
    } catch { throw new RaiAcceptError("raiaccept_verification_storage_unavailable"); }
    if (result.ok!==true) {
      const code=typeof result.error==="string" && RPC_ERRORS.has(result.error) ? result.error : "rejected";
      throw new RaiAcceptError(`raiaccept_verification_${code}`);
    }
    return result;
  }
  return {
    enqueue:async (config,providerId,reference)=>{
      await rpc("enqueue_raiaccept_verification",{p_environment:config.environment,p_merchant:config.merchantAccountId,
        p_provider_order_id:providerId,p_reference:reference});
    },
    claim:async (config,limit,orderId)=>{
      const result=await rpc("claim_raiaccept_verifications",{p_environment:config.environment,p_merchant:config.merchantAccountId,p_limit:limit,p_order_id:orderId??null});
      if (!Array.isArray(result.jobs) || result.jobs.length>limit) throw new RaiAcceptError("raiaccept_verification_storage_invalid");
      return result.jobs as VerificationJob[];
    },
    apply:async (job,proof)=>{
      const result=await rpc("apply_raiaccept_verification",{p_order_id:job.order_id,p_lease_id:job.verification_lease_id,
        p_order:proof.order,p_transaction:proof.transaction});
      return result as unknown as VerificationOutcome;
    },
    fail:async (job,code)=>{await rpc("fail_raiaccept_verification",{p_order_id:job.order_id,p_lease_id:job.verification_lease_id,p_code:code});},
  };
}

export async function runRaiAcceptRecovery(config:RaiAcceptConfig,client:VerificationClient,store:VerificationStore=createVerificationStore(),orderId?:string) {
  const jobs=await store.claim(config,orderId?1:3,orderId); const deadline=Date.now()+90_000;
  const report={claimed:jobs.length,verified:0,failed:0,manualReview:0,issues:[] as {orderId:string;code:string}[]};
  for (const job of jobs) {
    try {
      if (job.environment!==config.environment || job.merchant_account_id!==config.merchantAccountId) throw new RaiAcceptError("raiaccept_verification_scope_mismatch");
      if (!job.provider_order_id) throw new RaiAcceptError("raiaccept_order_identity_requires_review");
      if (Date.now()>deadline) throw new RaiAcceptError("raiaccept_verification_time_budget");
      const proof=await fetchRaiAcceptPaymentProof({...job,provider_order_id:job.provider_order_id},client);
      const result=await store.apply(job,proof);
      report.verified++;
      if (result.fulfillment_state==="manual_review" || result.review_reason) {
        report.manualReview++; report.issues.push({orderId:job.order_id,code:"raiaccept_payment_requires_review"});
      }
    } catch (error) {
      const code=error instanceof RaiAcceptError ? error.code : "raiaccept_verification_unexpected_failure";
      report.failed++; report.issues.push({orderId:job.order_id,code});
      try { await store.fail(job,code); }
      catch { report.issues.push({orderId:job.order_id,code:"raiaccept_verification_retry_persistence_failed"}); }
    }
  }
  return report;
}
