import { beforeAll,beforeEach,afterAll,describe,it,expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { createRaiAcceptTestDatabase } from "./helpers/raiaccept-database";
import type { CreditOrderRow } from "@/lib/payments/orders";
import { buildRaiAcceptPayload } from "@/lib/payments/raiaccept/contract";
import type { VerificationJob } from "@/lib/payments/raiaccept/recovery";

let db:PGlite;
const user="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222",merchant="P-007-MA-test";
const billing={fullName:"Sandbox Test",email:"sandbox@example.test",country:"Kosovo",city:"Prishtinë",legalConsent:true};
async function rpc(name:string,args:unknown[],types:string[]) {
  return (await db.query<{r:Record<string,unknown>}>(`select ${name}(${args.map((_,i)=>`$${i+1}::${types[i]}`).join(",")}) r`,
    args.map((arg,i)=>types[i]==="jsonb" && arg!==null ? JSON.stringify(arg):arg))).rows[0].r;
}
async function reserve(item="standard",uid=user) {
  const r=await rpc("reserve_raiaccept_checkout",[uid,randomUUID(),item,"sandbox",merchant,billing],["uuid","uuid","text","text","text","jsonb"]);
  if (!r.ok) throw new Error(String(r.error));
  return {order:r.order as CreditOrderRow,checkout:r.checkout as Record<string,unknown>};
}
async function prepare(item="standard",uid=user,identity=true) {
  const r=await reserve(item,uid); const c=r.checkout;
  const payload=buildRaiAcceptPayload(r.order,"https://sandbox.example.test","sandbox");
  const claimed=await rpc("transition_raiaccept_checkout",[r.order.id,uid,null,"claim_order",payload],["uuid","uuid","uuid","text","jsonb"]);
  const leased=claimed.checkout as Record<string,unknown>;
  const order={id:`BANK-${r.order.id}`,status:"PAID",isProduction:false,merchantAccountId:merchant,
    merchantReference:c.merchant_reference,amountCents:r.order.amount_cents,currency:"EUR",purchaseCount:1};
  if (identity) await rpc("transition_raiaccept_checkout",[r.order.id,uid,leased.lease_id,"bind_order",{...order,status:"DRAFT"}],["uuid","uuid","uuid","text","jsonb"]);
  else await db.query("update raiaccept_checkouts set creation_state='creation_unknown' where order_id=$1",[r.order.id]);
  const transaction={id:`TX-${r.order.id}`,orderId:order.id,merchantAccountId:merchant,merchantReference:c.merchant_reference,
    isProduction:false,amountCents:r.order.amount_cents,currency:"EUR",type:"PURCHASE",status:"SUCCESS",statusCode:"0000",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  return {r,order,transaction};
}
async function claim(id:string) {
  await db.query("update raiaccept_checkouts set next_check_at=now() where order_id=$1",[id]);
  const result=await rpc("claim_raiaccept_verifications",["sandbox",merchant,20],["text","text","integer"]);
  const job=(result.jobs as VerificationJob[]).find(row=>row.order_id===id); if (!job) throw new Error("No test lease"); return job;
}
async function apply(p:Awaited<ReturnType<typeof prepare>>,changes:{order?:Record<string,unknown>;transaction?:Record<string,unknown>|null}={}) {
  const job=await claim(p.r.order.id);
  return rpc("apply_raiaccept_verification",[job.order_id,job.verification_lease_id,{...p.order,...changes.order},
    changes.transaction===null ? null : {...p.transaction,...changes.transaction}],["uuid","uuid","jsonb","jsonb"]);
}
async function balance(uid=user) {return (await db.query<{credits:number}>("select credits from profiles where id=$1",[uid])).rows[0].credits;}
async function member(days=20,plan="standard") {return (await db.query<{id:string}>("insert into memberships(user_id,plan_id,expires_at) values($1,$2,now()+$3*interval '1 day') returning id",[user,plan,days])).rows[0].id;}
beforeAll(async()=>{db=await createRaiAcceptTestDatabase({receipts:true});});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
  await db.exec("truncate raiaccept_receipt_jobs,raiaccept_verified_payments,raiaccept_verification_queue,raiaccept_checkouts,credit_orders,credit_transactions,memberships,profiles,auth.users cascade; set request.jwt.claim.role='service_role'");
  await db.query("insert into auth.users values($1,'sandbox@example.test'),($2,'other@example.test')",[user,other]);
  await db.query("insert into profiles(id,credits) values($1,17),($2,0)",[user,other]);
  await db.exec("update commerce_plans set duration_days=30,included_credits=case id when 'standard' then 100 when 'pro' then 500 else 0 end");
});
describe("Authenticated RaiAccept evidence and atomic PostgreSQL fulfillment",()=>{
  it("renews the current shorter plan instead of an older suspended membership",async()=>{
    const old=await member(90,"business"); await db.query("update memberships set suspended=true where id=$1",[old]);
    const current=await member(3,"standard"); const p=await prepare("renew");
    expect(p.r.checkout.expected_membership_id).toBe(current);
    expect(await apply(p)).toMatchObject({ok:true});
    expect((await db.query("select suspended,expires_at>now()+interval '89 days' preserved from memberships where id=$1",[old])).rows[0]).toEqual({suspended:true,preserved:true});
    expect((await db.query<{renewed:boolean}>("select expires_at>now()+interval '32 days' renewed from memberships where id=$1",[current])).rows[0].renewed).toBe(true);
  });
  it("allows a new purchase after all old memberships were suspended by a manual change to free",async()=>{
    const old=await member(90,"business"); await db.query("update memberships set suspended=true where id=$1",[old]);
    const p=await prepare("standard"); expect(await apply(p)).toMatchObject({ok:true});
    expect((await db.query<{suspended:boolean}>("select suspended from memberships where id=$1",[old])).rows[0].suspended).toBe(true);
  });
  it("marks paid, grants the frozen credits/30 days and queues one receipt atomically",async()=>{
    const p=await prepare(); expect(await apply(p)).toMatchObject({ok:true,payment_state:"paid",fulfillment_state:"fulfilled",review_reason:null});
    expect(await balance()).toBe(117);
    const m=(await db.query<{payment_provider:string;renewal_mode:string;days:number}>("select payment_provider,renewal_mode,extract(epoch from expires_at-started_at)/86400 as days from memberships")).rows[0];
    expect(m).toMatchObject({payment_provider:"raiaccept",renewal_mode:"manual"}); expect(Number(m.days)).toBe(30);
    expect((await db.query("select * from raiaccept_receipt_jobs")).rows).toHaveLength(1);
    expect((await db.query("select * from credit_transactions")).rows).toHaveLength(1);
  });
  it("deduplicates repeated API verification without extra credit, time or receipt",async()=>{
    const p=await prepare(); await apply(p); await apply(p);
    expect(await balance()).toBe(117); expect((await db.query("select * from memberships")).rows).toHaveLength(1);
    expect((await db.query("select * from raiaccept_receipt_jobs")).rows).toHaveLength(1);
  });
  it("allows only one queued verification lease and rejects a stale lease",async()=>{
    const p=await prepare(); const job=await claim(p.r.order.id);
    const next=await rpc("claim_raiaccept_verifications",["sandbox",merchant,20],["text","text","integer"]); expect(next.jobs).toEqual([]);
    expect(await rpc("apply_raiaccept_verification",[job.order_id,randomUUID(),p.order,p.transaction],["uuid","uuid","jsonb","jsonb"])).toMatchObject({ok:false,error:"lease_mismatch"});
  });
  it.each([{amountCents:1},{currency:"USD"},{isProduction:true},{isProduction:"false"},{merchantAccountId:"other"},{merchantReference:"other"},{id:"wrong"}])(
    "rejects mismatched order evidence %j",async wrong=>{expect(await apply(await prepare(),{order:wrong})).toMatchObject({ok:false,error:"provider_order_mismatch"}); expect(await balance()).toBe(17);});
  it.each([{amountCents:1},{currency:"USD"},{isProduction:true},{type:"REFUND"},{status:"PENDING"},{statusCode:"0001"},{orderId:"wrong"},{merchantReference:"wrong"}])(
    "rejects mismatched transaction evidence %j",async wrong=>{expect(await apply(await prepare(),{transaction:wrong})).toMatchObject({ok:false,error:"successful_purchase_required"}); expect(await balance()).toBe(17);});
  it("does not accept PAID order status alone",async()=>{
    expect(await apply(await prepare(),{transaction:null})).toMatchObject({ok:false,error:"successful_purchase_required"}); expect(await balance()).toBe(17);
  });
  it("keeps CHECKOUT pending without granting or cancelling",async()=>{
    const p=await prepare(); expect(await apply(p,{order:{status:"CHECKOUT",purchaseCount:0},transaction:null})).toMatchObject({ok:true,payment_state:"unverified",fulfillment_state:"pending"});
    expect(await balance()).toBe(17);
  });
  it("only bank-verified terminal failure releases a membership hold",async()=>{
    const p=await prepare(); await apply(p,{order:{status:"FAILED",purchaseCount:0},transaction:null});
    expect((await db.query<{status:string}>("select status from credit_orders")).rows[0].status).toBe("failed");
    expect((await reserve()).order.id).not.toBe(p.r.order.id);
  });
  it("blocks generic fulfillment and browser cancellation for RaiAccept",async()=>{
    const p=await prepare();
    expect(await rpc("fulfill_commerce_order",[p.r.order.id,"forged"],["uuid","text"])).toMatchObject({ok:false,error:"raiaccept_verified_payment_required"});
    expect(await rpc("fulfill_credit_order",[p.r.order.id],["uuid"])).toMatchObject({ok:false,error:"raiaccept_verified_payment_required"});
    expect(await rpc("cancel_credit_order",[p.r.order.id,"browser_cancel"],["uuid","text"])).toMatchObject({ok:false,error:"raiaccept_bank_verification_required"});
    expect(await balance()).toBe(17);
  });
  it("uses frozen duration and credits even when the catalog later changes",async()=>{
    const p=await prepare(); await db.exec("update commerce_plans set duration_days=60,included_credits=999 where id='standard'"); await apply(p);
    expect(await balance()).toBe(117);
    expect(Number((await db.query<{days:number}>("select extract(epoch from expires_at-started_at)/86400 days from memberships")).rows[0].days)).toBe(30);
  });
  it("keeps a verified paid order in manual review when a plan appeared while paying",async()=>{
    const p=await prepare(); await member(); expect(await apply(p)).toMatchObject({ok:true,payment_state:"paid",fulfillment_state:"manual_review",review_reason:"plan_already_active"});
    expect(await balance()).toBe(17); expect((await db.query<{status:string}>("select status from credit_orders")).rows[0].status).toBe("paid");
    await db.exec("update memberships set expires_at=now()-interval '1 day'"); await apply(p); expect(await balance()).toBe(17);
  });
  it("upgrades exactly once without extending the membership expiry",async()=>{
    const id=await member(); const expiry=(await db.query<{expires_at:Date}>("select expires_at from memberships where id=$1",[id])).rows[0].expires_at;
    const p=await prepare("upgrade"); await apply(p); await apply(p);
    expect(await balance()).toBe(417); const m=(await db.query<{plan_id:string;expires_at:Date}>("select plan_id,expires_at from memberships where id=$1",[id])).rows[0];
    expect(m.plan_id).toBe("pro"); expect(m.expires_at.toISOString()).toBe(expiry.toISOString());
  });
  it("renews once from the frozen existing expiry",async()=>{
    const id=await member(3); const expiry=(await db.query<{expires_at:Date}>("select expires_at from memberships where id=$1",[id])).rows[0].expires_at;
    const p=await prepare("renew"); await apply(p); await apply(p); expect(await balance()).toBe(117);
    const after=(await db.query<{expires_at:Date}>("select expires_at from memberships where id=$1",[id])).rows[0].expires_at;
    expect(after.getTime()-expiry.getTime()).toBe(30*86400000);
  });
  it("records paid but reviews an expired top-up rather than losing the payment",async()=>{
    await member(); const p=await prepare("topup-100"); await db.exec("update memberships set expires_at=now()-interval '1 second'");
    expect(await apply(p)).toMatchObject({payment_state:"paid",fulfillment_state:"manual_review",review_reason:"topup_plan_changed"}); expect(await balance()).toBe(17);
  });
  it("reviews a changed renewal membership and duplicate successful charge",async()=>{
    await member(3); const p=await prepare("renew"); await db.exec("update memberships set expires_at=expires_at+interval '1 day'");
    expect(await apply(p)).toMatchObject({fulfillment_state:"manual_review",review_reason:"membership_changed"}); expect(await balance()).toBe(17);
  });
  it("records more than one successful purchase for review without granting twice",async()=>{
    const p=await prepare(); expect(await apply(p,{order:{purchaseCount:2}})).toMatchObject({payment_state:"paid",fulfillment_state:"manual_review",review_reason:"multiple_successful_purchases"}); expect(await balance()).toBe(17);
  });
  it("does not grant a payment already refunded before fulfillment",async()=>{
    const p=await prepare(); expect(await apply(p,{order:{status:"FULLY_REFUNDED"}})).toMatchObject({payment_state:"fully_refunded",fulfillment_state:"manual_review",review_reason:"refund_detected"}); expect(await balance()).toBe(17);
  });
  it("flags a post-fulfillment refund without blindly subtracting spent credits",async()=>{
    const p=await prepare(); await apply(p); await db.query("update profiles set credits=2 where id=$1",[user]);
    expect(await apply(p,{order:{status:"PARTIALLY_REFUNDED"}})).toMatchObject({payment_state:"partially_refunded",fulfillment_state:"fulfilled",review_reason:"refund_detected"}); expect(await balance()).toBe(2);
  });
  it("does not regress a recorded refund back to paid",async()=>{
    const p=await prepare(); await apply(p); await apply(p,{order:{status:"FULLY_REFUNDED"}});
    expect(await apply(p)).toMatchObject({payment_state:"fully_refunded",fulfillment_state:"fulfilled",review_reason:"bank_state_regression"});
    expect(await balance()).toBe(117);
  });
  it("records overflow risk as paid/manual review instead of rolling money out of the ledger",async()=>{
    const p=await prepare(); await db.query("update profiles set credits=2147483640 where id=$1",[user]);
    expect(await apply(p)).toMatchObject({payment_state:"paid",fulfillment_state:"manual_review",review_reason:"credit_balance_overflow"});
    expect(await balance()).toBe(2147483640);
  });
  it("rejects local snapshot tampering before giving credits",async()=>{
    const p=await prepare(); await db.query("update credit_orders set credits=999 where id=$1",[p.r.order.id]);
    expect(await apply(p)).toMatchObject({ok:false,error:"local_snapshot_mismatch"}); expect(await balance()).toBe(17);
  });
  it("cannot reuse one provider transaction for another account/order",async()=>{
    const p=await prepare(); await apply(p); const second=await prepare("standard",other);
    expect(await apply(second,{transaction:{id:p.transaction.id}})).toMatchObject({ok:false,error:"provider_transaction_duplicate"}); expect(await balance(other)).toBe(0);
  });
  it("rolls the entire financial grant back when ledger persistence fails",async()=>{
    const p=await prepare(); const job=await claim(p.r.order.id);
    await db.exec("create function fail_test_ledger() returns trigger language plpgsql as $$ begin raise exception 'synthetic_ledger_failure'; end $$; create trigger fail_test_ledger before insert on credit_transactions for each row execute function fail_test_ledger()");
    try {
      await expect(rpc("apply_raiaccept_verification",[job.order_id,job.verification_lease_id,p.order,p.transaction],["uuid","uuid","jsonb","jsonb"])).rejects.toThrow("synthetic_ledger_failure");
      expect(await balance()).toBe(17); expect((await db.query("select * from memberships")).rows).toHaveLength(0);
      expect((await db.query("select * from raiaccept_verified_payments")).rows).toHaveLength(0);
      expect((await db.query("select * from raiaccept_receipt_jobs")).rows).toHaveLength(0);
      expect((await db.query<{status:string}>("select status from credit_orders")).rows[0].status).toBe("pending");
    } finally {await db.exec("drop trigger fail_test_ledger on credit_transactions; drop function fail_test_ledger()");}
  });
  it("stores/coalesces notification signals without granting and keeps arrivals during verification dirty",async()=>{
    const p=await prepare();
    for(let i=0;i<3;i++) await rpc("enqueue_raiaccept_verification",["sandbox",merchant,p.order.id,p.order.merchantReference],["text","text","text","text"]);
    expect((await db.query("select * from raiaccept_verification_queue")).rows).toHaveLength(1); expect(await balance()).toBe(17);
    const job=await claim(p.r.order.id);
    await rpc("enqueue_raiaccept_verification",["sandbox",merchant,p.order.id,p.order.merchantReference],["text","text","text","text"]);
    await rpc("apply_raiaccept_verification",[job.order_id,job.verification_lease_id,p.order,p.transaction],["uuid","uuid","jsonb","jsonb"]);
    const q=(await db.query<{version:number;processed_version:number}>("select version,processed_version from raiaccept_verification_queue")).rows[0];
    expect(Number(q.version)).toBeGreaterThan(Number(q.processed_version));
  });
  it("recovers a lost order ID from a notification only after authenticated matching evidence",async()=>{
    const p=await prepare("standard",user,false);
    await rpc("enqueue_raiaccept_verification",["sandbox",merchant,p.order.id,p.order.merchantReference],["text","text","text","text"]);
    const job=await claim(p.r.order.id); expect(job.provider_order_id).toBe(p.order.id);
    expect(await rpc("apply_raiaccept_verification",[job.order_id,job.verification_lease_id,p.order,p.transaction],["uuid","uuid","jsonb","jsonb"])).toMatchObject({fulfillment_state:"fulfilled"}); expect(await balance()).toBe(117);
  });
  it("denies anon/authenticated access to evidence, inbox, receipt jobs and RPCs",async()=>{
    for(const role of ["anon","authenticated"]) {
      for(const table of ["raiaccept_verified_payments","raiaccept_verification_queue","raiaccept_receipt_jobs"]) {
        expect((await db.query<{allowed:boolean}>("select has_table_privilege($1,$2,'SELECT') allowed",[role,table])).rows[0].allowed).toBe(false);
      }
      expect((await db.query<{allowed:boolean}>("select has_function_privilege($1,'apply_raiaccept_verification(uuid,uuid,jsonb,jsonb)','EXECUTE') allowed",[role])).rows[0].allowed).toBe(false);
    }
  });
  it("restricts an owned verification claim to its explicit order",async()=>{
    const first=await prepare(); const second=await prepare("standard",other);
    const claimed=await rpc("claim_raiaccept_verifications",["sandbox",merchant,1,first.r.order.id],["text","text","integer","uuid"]);
    expect(claimed.jobs).toHaveLength(1);
    const untouched=(await db.query<{verification_lease_id:string|null}>("select verification_lease_id from raiaccept_checkouts where order_id=$1",[second.r.order.id])).rows[0];
    expect(untouched.verification_lease_id).toBeNull();
  });
  it("freezes receipt payload and prevents concurrent/double delivery claims",async()=>{
    const p=await prepare();await apply(p);
    const claimed=await rpc("claim_raiaccept_receipts",["sandbox",merchant,3],["text","text","integer"]);
    const job=(claimed.jobs as {order_id:string;lease_id:string}[])[0];expect(job.order_id).toBe(p.r.order.id);
    expect((await rpc("claim_raiaccept_receipts",["sandbox",merchant,3],["text","text","integer"])).jobs).toEqual([]);
    const frozen={to:"receipt@example.test",text:"exact frozen receipt"};
    expect((await rpc("prepare_raiaccept_receipt",[job.order_id,job.lease_id,frozen],["uuid","uuid","jsonb"])).payload).toEqual(frozen);
    expect((await rpc("prepare_raiaccept_receipt",[job.order_id,job.lease_id,{text:"changed"}],["uuid","uuid","jsonb"])).payload).toEqual(frozen);
    await rpc("finish_raiaccept_receipt",[job.order_id,job.lease_id,true,"provider-message",null],["uuid","uuid","boolean","text","text"]);
    expect((await rpc("claim_raiaccept_receipts",["sandbox",merchant,3],["text","text","integer"])).jobs).toEqual([]);
  });
  it("recovers a lost receipt send ACK with the same payload and rejects the stale lease",async()=>{
    const p=await prepare();await apply(p);
    const claimReceipts=()=>rpc("claim_raiaccept_receipts",["sandbox",merchant,3],["text","text","integer"]);
    const first=((await claimReceipts()).jobs as {order_id:string;lease_id:string}[])[0];
    await rpc("prepare_raiaccept_receipt",[first.order_id,first.lease_id,{text:"same-request"}],["uuid","uuid","jsonb"]);
    await db.exec("update raiaccept_receipt_jobs set lease_started_at=now()-interval '3 minutes'");
    const second=((await claimReceipts()).jobs as {order_id:string;lease_id:string;request_payload:unknown}[])[0];
    expect(second.lease_id).not.toBe(first.lease_id);expect(second.request_payload).toEqual({text:"same-request"});
    expect(await rpc("finish_raiaccept_receipt",[first.order_id,first.lease_id,true,"late",null],["uuid","uuid","boolean","text","text"])).toMatchObject({ok:false,error:"lease_mismatch"});
  });
  it("stops ambiguous email retries before the provider idempotency window expires",async()=>{
    const p=await prepare();await apply(p);await db.exec("update raiaccept_receipt_jobs set state='failed',first_attempt_at=now()-interval '24 hours'");
    expect((await rpc("claim_raiaccept_receipts",["sandbox",merchant,3],["text","text","integer"])).jobs).toEqual([]);
    const row=(await db.query<{last_error:string;next_attempt_at:Date|null}>("select last_error,next_attempt_at from raiaccept_receipt_jobs")).rows[0];
    expect(row.last_error).toBe("delivery_requires_review");expect(row.next_attempt_at).toBeNull();
  });
});
