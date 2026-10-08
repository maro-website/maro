import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRaiAcceptPaymentProof, parseRaiAcceptNotification, parseRaiAcceptTransaction, type ExpectedPayment, type VerificationClient } from "@/lib/payments/raiaccept/verification";
import { runRaiAcceptRecovery, type VerificationJob, type VerificationStore } from "@/lib/payments/raiaccept/recovery";
import type { RaiAcceptConfig } from "@/lib/payments/raiaccept/config";
import type { RaiAcceptOrder } from "@/lib/payments/raiaccept/contract";
import { RaiAcceptError } from "@/lib/payments/raiaccept/errors";

const config:RaiAcceptConfig={environment:"sandbox",merchantAccountId:"P-007-MA-TEST",username:"fixture",password:"fixture",appOrigin:"https://sandbox.example.test"};
const expected:ExpectedPayment={provider_order_id:"P-007-ORD-TEST",merchant_reference:"MARO-S-TEST",amount_cents:900,currency:"EUR",
  environment:"sandbox",merchant_account_id:config.merchantAccountId};
function rawTransaction() {
  return {transaction:{transactionId:"P-007-TR-TEST",transactionAmount:9,transactionCurrency:"EUR",isProduction:false,
    transactionType:"PURCHASE",status:"SUCCESS",statusCode:"0000",createdOn:"2026-10-08T12:00:00Z",updatedOn:"2026-10-08T12:00:01Z"},
    merchant:{merchantAccountId:config.merchantAccountId},order:{orderIdentification:expected.provider_order_id,invoice:{merchantOrderReference:expected.merchant_reference}},
    card:{cardToken:"discard-this-token",maskedCardNumber:"discard-this-card"},consumer:{email:"discard@example.test"}};
}
function transaction() { return parseRaiAcceptTransaction(rawTransaction(),expected.provider_order_id,"P-007-TR-TEST",config); }
function order():RaiAcceptOrder { return {id:expected.provider_order_id,status:"PAID",isProduction:false,merchantAccountId:config.merchantAccountId,
  merchantReference:expected.merchant_reference,amountCents:900,currency:"EUR"}; }
function client():VerificationClient {
  return {getOrder:vi.fn().mockResolvedValue(order()),listTransactions:vi.fn().mockResolvedValue([{transactionId:"P-007-TR-TEST"}]),
    getTransaction:vi.fn().mockResolvedValue(transaction())};
}
afterEach(()=>vi.restoreAllMocks());

describe("RaiAccept authenticated transaction evidence",()=>{
  it("retains only minimal ledger evidence from the documented detail response",()=>{
    const parsed=transaction(); expect(parsed.amountCents).toBe(900); expect(parsed.status).toBe("SUCCESS");
    expect(JSON.stringify(parsed)).not.toContain("discard"); expect(parsed).not.toHaveProperty("card");
  });
  it.each([true,"false",0,undefined])("requires exact Boolean Sandbox environment %j",isProduction=>{
    const raw=rawTransaction(); Object.assign(raw.transaction,{isProduction});
    expect(()=>parseRaiAcceptTransaction(raw,expected.provider_order_id,"P-007-TR-TEST",config)).toThrow("environment_mismatch");
  });
  it.each([{transactionCurrency:"USD"},{transactionType:"AUTHORIZATION"},{status:"PAID"},{statusCode:"0"},
    {transactionAmount:8.999},{transactionAmount:0},{transactionId:"ANOTHER"},{createdOn:"2026-10-08"},
    {updatedOn:"2026-10-08T11:00:00Z"}])("rejects malformed transaction details %j",change=>{
    const raw=rawTransaction(); Object.assign(raw.transaction,change);
    expect(()=>parseRaiAcceptTransaction(raw,expected.provider_order_id,"P-007-TR-TEST",config)).toThrow();
  });
  it("rejects another merchant or order in the authenticated detail",()=>{
    const raw=rawTransaction(); raw.merchant.merchantAccountId="OTHER";
    expect(()=>parseRaiAcceptTransaction(raw,expected.provider_order_id,"P-007-TR-TEST",config)).toThrow("merchant_mismatch");
    raw.merchant.merchantAccountId=config.merchantAccountId; raw.order.orderIdentification="OTHER";
    expect(()=>parseRaiAcceptTransaction(raw,expected.provider_order_id,"P-007-TR-TEST",config)).toThrow("transaction_id_mismatch");
  });
  it("uses list entries only for discovery and fetches each authenticated detail once",async()=>{
    const api=client(); vi.mocked(api.listTransactions).mockResolvedValue([{transactionId:"P-007-TR-TEST",status:"FAILED",transactionAmount:1},
      {transactionId:"P-007-TR-TEST"}]);
    const proof=await fetchRaiAcceptPaymentProof(expected,api);
    expect(proof.order.purchaseCount).toBe(1); expect(proof.transaction?.amountCents).toBe(900);
    expect(api.getTransaction).toHaveBeenCalledExactlyOnceWith(expected.provider_order_id,"P-007-TR-TEST");
    expect(api.getOrder).toHaveBeenCalledTimes(2);
  });
  it("does not infer a successful purchase from a PAID order or forged list fields",async()=>{
    const api=client(); vi.mocked(api.getTransaction).mockResolvedValue({...transaction(),status:"FAILED",statusCode:"1001"});
    const proof=await fetchRaiAcceptPaymentProof(expected,api); expect(proof.transaction).toBeNull(); expect(proof.order.purchaseCount).toBe(0);
  });
  it.each([{id:"OTHER"},{merchantReference:"OTHER"},{amountCents:899},{currency:"USD"},{merchantAccountId:"OTHER"},{isProduction:true}])(
    "rejects mismatched bank order before transaction discovery %j",async change=>{
      const api=client(); vi.mocked(api.getOrder).mockResolvedValue({...order(),...change});
      await expect(fetchRaiAcceptPaymentProof(expected,api)).rejects.toThrow("verification_order_mismatch"); expect(api.listTransactions).not.toHaveBeenCalled();
    });
  it.each([{orderId:"OTHER"},{merchantReference:"OTHER"},{amountCents:899},{currency:"USD"},{merchantAccountId:"OTHER"},{isProduction:true}])(
    "rejects mismatched transaction evidence %j",async change=>{
      const api=client(); vi.mocked(api.getTransaction).mockResolvedValue({...transaction(),...change} as ReturnType<typeof transaction>);
      await expect(fetchRaiAcceptPaymentProof(expected,api)).rejects.toThrow("mismatch");
    });
  it("rechecks final order state after reading transaction details",async()=>{
    const api=client(); vi.mocked(api.getOrder).mockResolvedValueOnce(order()).mockResolvedValueOnce({...order(),status:"FULLY_REFUNDED"});
    expect((await fetchRaiAcceptPaymentProof(expected,api)).order.status).toBe("FULLY_REFUNDED");
  });
  it("refuses a refund detail while the bank still reports PAID",async()=>{
    const api=client(); vi.mocked(api.getTransaction).mockResolvedValue({...transaction(),type:"REFUND"});
    await expect(fetchRaiAcceptPaymentProof(expected,api)).rejects.toThrow("refund_state_inconsistent");
  });
  it("exposes multiple successful purchases for SQL review with deterministic selection",async()=>{
    const api=client(); vi.mocked(api.listTransactions).mockResolvedValue([{transactionId:"B"},{transactionId:"A"}]);
    vi.mocked(api.getTransaction).mockImplementation(async(_order,id)=>({...transaction(),id}));
    const proof=await fetchRaiAcceptPaymentProof(expected,api); expect(proof.order.purchaseCount).toBe(2); expect(proof.transaction?.id).toBe("A");
  });
  it("bounds discovery before making many detail requests",async()=>{
    const api=client(); vi.mocked(api.listTransactions).mockResolvedValue(Array.from({length:21},(_,i)=>({transactionId:`T${i}`})));
    await expect(fetchRaiAcceptPaymentProof(expected,api)).rejects.toThrow("transactions_require_review"); expect(api.getTransaction).not.toHaveBeenCalled();
  });
  it("enforces the bank verification time budget",async()=>{
    const api=client(); vi.spyOn(Date,"now").mockReturnValueOnce(0).mockReturnValue(90_001);
    await expect(fetchRaiAcceptPaymentProof(expected,api)).rejects.toThrow("time_budget"); expect(api.getTransaction).not.toHaveBeenCalled();
  });
  it("reduces a webhook to routing identifiers and never payment proof",()=>{
    const hint=parseRaiAcceptNotification(rawTransaction(),config);
    expect(hint).toEqual({providerOrderId:expected.provider_order_id,transactionId:"P-007-TR-TEST",merchantReference:expected.merchant_reference});
    expect(JSON.stringify(hint)).not.toContain("SUCCESS"); expect(JSON.stringify(hint)).not.toContain("discard");
    const raw=rawTransaction(); raw.transaction.isProduction=true;
    expect(()=>parseRaiAcceptNotification(raw,config)).toThrow("notification_scope_mismatch");
  });
});

describe("RaiAccept awaited durable recovery",()=>{
  const job:VerificationJob={...expected,order_id:"11111111-1111-4111-8111-111111111111",verification_lease_id:"22222222-2222-4222-8222-222222222222"};
  function store():VerificationStore { return {enqueue:vi.fn(),claim:vi.fn().mockResolvedValue([job]),
    apply:vi.fn().mockResolvedValue({payment_state:"paid",fulfillment_state:"fulfilled",review_reason:null}),fail:vi.fn().mockResolvedValue(undefined)}; }
  it("awaits SQL application after bank verification",async()=>{
    const db=store(); let finish:()=>void=()=>{}; let resolved=false;
    vi.mocked(db.apply).mockImplementation(()=>new Promise(resolve=>{finish=()=>resolve({payment_state:"paid",fulfillment_state:"fulfilled",review_reason:null});}));
    const result=runRaiAcceptRecovery(config,client(),db).then(report=>{resolved=true;return report;});
    await vi.waitFor(()=>expect(db.apply).toHaveBeenCalledOnce()); expect(resolved).toBe(false); finish();
    expect(await result).toMatchObject({claimed:1,verified:1,failed:0}); expect(db.fail).not.toHaveBeenCalled();
  });
  it("leaves paid eligibility failures visible for manual resolution",async()=>{
    const db=store(); vi.mocked(db.apply).mockResolvedValue({payment_state:"paid",fulfillment_state:"manual_review",review_reason:"membership_changed"});
    expect(await runRaiAcceptRecovery(config,client(),db)).toMatchObject({manualReview:1,issues:[{orderId:job.order_id,code:"raiaccept_payment_requires_review"}]});
  });
  it.each([{provider_order_id:null},{environment:"production"},{merchant_account_id:"OTHER"}])("never queries the bank with an unscoped identity %j",async change=>{
    const db=store(); const api=client(); vi.mocked(db.claim).mockResolvedValue([{...job,...change} as VerificationJob]);
    expect((await runRaiAcceptRecovery(config,api,db)).failed).toBe(1); expect(api.getOrder).not.toHaveBeenCalled(); expect(db.apply).not.toHaveBeenCalled();
    expect(db.fail).toHaveBeenCalledOnce();
  });
  it("sanitizes unexpected failures and persists a retry before returning",async()=>{
    const db=store(); const api=client(); vi.mocked(api.getOrder).mockRejectedValue(new Error("secret-fixture-body"));
    const report=await runRaiAcceptRecovery(config,api,db); expect(JSON.stringify(report)).not.toContain("secret-fixture");
    expect(db.fail).toHaveBeenCalledWith(job,"raiaccept_verification_unexpected_failure"); expect(db.apply).not.toHaveBeenCalled();
  });
  it("reports a failed retry write while the database lease remains recoverable",async()=>{
    const db=store(); const api=client(); vi.mocked(api.getOrder).mockRejectedValue(new RaiAcceptError("raiaccept_timeout"));
    vi.mocked(db.fail).mockRejectedValue(new Error("secret-database-body"));
    const report=await runRaiAcceptRecovery(config,api,db); expect(report.issues).toContainEqual({orderId:job.order_id,code:"raiaccept_verification_retry_persistence_failed"});
    expect(JSON.stringify(report)).not.toContain("secret-database");
  });
});
