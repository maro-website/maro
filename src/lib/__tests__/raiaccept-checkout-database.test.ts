import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { createRaiAcceptTestDatabase } from "./helpers/raiaccept-database";
import { buildRaiAcceptPayload } from "@/lib/payments/raiaccept/contract";
import type { CreditOrderRow } from "@/lib/payments/orders";
import { startRaiAcceptCheckout, type CheckoutStore, type CheckoutIntent } from "@/lib/payments/raiaccept/checkout";
import type { RaiAcceptConfig } from "@/lib/payments/raiaccept/config";
import { RaiAcceptError } from "@/lib/payments/raiaccept/errors";

let db: PGlite;
const user = "11111111-1111-4111-8111-111111111111";
const otherUser = "22222222-2222-4222-8222-222222222222";
const merchant = "P-007-MA-test";
const billing = { fullName: "Sandbox Test", email: "sandbox@example.test", country: "Kosovo", city: "Prishtinë", legalConsent: true };
type Result = { ok: boolean; error?: string; created?: boolean; claimed?: boolean; checkout: CheckoutIntent & Record<string, unknown>; order: CreditOrderRow };
async function reserve(item = "standard", key: string = randomUUID(), uid = user, details: unknown = billing, env = "sandbox") {
  return (await db.query<{ result: Result }>("select reserve_raiaccept_checkout($1,$2,$3,$4,$5,$6::jsonb) result",
    [uid, key, item, env, merchant, JSON.stringify(details)])).rows[0].result;
}
async function transition(c: CheckoutIntent, action: string, data: unknown = {}, overrides: { user?: string; lease?: string } = {}) {
  return (await db.query<{ result: Result }>("select transition_raiaccept_checkout($1,$2,$3,$4,$5::jsonb) result",
    [c.order_id, overrides.user ?? c.user_id, overrides.lease ?? c.lease_id, action, JSON.stringify(data)])).rows[0].result;
}
async function claim() {
  const reservation = await reserve();
  const payload = buildRaiAcceptPayload(reservation.order, "https://sandbox.example.test", "sandbox");
  const claimed = await transition(reservation.checkout, "claim_order", payload);
  return { reservation, payload, c: claimed.checkout };
}
function proof(c: CheckoutIntent & Record<string, unknown>) {
  return { id: "P-007-ORD-test", status: "DRAFT", isProduction: false, merchantAccountId: merchant,
    merchantReference: c.merchant_reference, amountCents: 900, currency: "EUR" };
}
async function member(plan = "standard", days = 20, extra = "") {
  return (await db.query<{ id: string }>(`insert into memberships(user_id,plan_id,expires_at${extra ? ",payment_provider,paddle_status" : ""})
    values($1,$2,now()+$3*interval '1 day'${extra ? ", 'paddle','past_due'" : ""}) returning id`, [user, plan, days])).rows[0].id;
}
beforeAll(async () => { db = await createRaiAcceptTestDatabase(); });
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("truncate raiaccept_checkouts,credit_orders,credit_transactions,memberships,profiles,auth.users cascade; set request.jwt.claim.role='service_role'");
  await db.query("insert into auth.users values($1,'sandbox@example.test'),($2,'other@example.test')", [user, otherUser]);
  await db.query("insert into profiles(id,credits) values($1,17),($2,0)", [user, otherUser]);
  await db.exec("update commerce_plans set price_cents=case id when 'standard' then 900 when 'pro' then 3500 else 0 end");
});

describe("RaiAccept durable checkout SQL", () => {
  it("freezes the server quote, country and manual plan duration without granting anything", async () => {
    const r = await reserve();
    expect(r.ok).toBe(true);
    expect(r.order).toMatchObject({ amount_cents: 900, credits: 100, provider: "raiaccept", status: "pending",
      commercial_snapshot: { currency: "EUR", duration_days: 30, renewal_window_days: 7 } });
    expect(r.checkout).toMatchObject({ amount_cents: 900, environment: "sandbox", holds_membership: true, billing_snapshot: billing });
    expect((await db.query<{credits:number}>("select credits from profiles where id=$1", [user])).rows[0].credits).toBe(17);
    expect((await db.query("select * from memberships")).rows).toHaveLength(0);
  });
  it("replays the identical key after a catalog change without repricing or adding another order", async () => {
    const key = randomUUID(); const first = await reserve("standard", key);
    await db.exec("update commerce_plans set price_cents=1500 where id='standard'");
    const replay = await reserve("standard", key);
    expect(replay.created).toBe(false); expect(replay.order.id).toBe(first.order.id);
    expect(replay.order.amount_cents).toBe(900);
    expect((await db.query("select * from credit_orders")).rows).toHaveLength(1);
  });
  it("rejects a reused key with changed billing or item", async () => {
    const key = randomUUID(); await reserve("standard", key);
    expect((await reserve("pro", key)).error).toBe("idempotency_conflict");
    expect((await reserve("standard", key, user, { ...billing, email: "different@example.test" })).error).toBe("idempotency_conflict");
  });
  it("returns the same reservation to queued simultaneous submissions", async () => {
    const key = randomUUID(); const rows = await Promise.all(Array.from({ length: 8 }, () => reserve("standard", key)));
    expect(new Set(rows.map(r => r.order.id)).size).toBe(1);
    expect(rows.filter(r => r.created)).toHaveLength(1);
  });
  it("holds a membership intent against a new request key", async () => {
    await reserve(); expect((await reserve("pro")).error).toBe("order_in_progress");
  });
  it("rejects top-up without a valid plan and a second plan while active", async () => {
    expect((await reserve("topup-100")).error).toBe("topup_requires_active_plan");
    await member(); expect((await reserve()).error).toBe("plan_already_active");
  });
  it.each([["pro",3500,500],["topup-100",900,100],["topup-200",1700,200],["topup-500",4000,500],["topup-1000",7500,1000]])(
    "uses the canonical %s quote", async (item, amount, credits) => {
      if (String(item).startsWith("topup")) await member();
      expect((await reserve(String(item))).order).toMatchObject({ amount_cents: amount, credits });
    });
  it("freezes an upgrade delta and the original membership expiry", async () => {
    const id = await member(); const r = await reserve("upgrade");
    expect(r.order).toMatchObject({ amount_cents: 2600, credits: 400, order_kind: "plan_upgrade" });
    expect(r.checkout.expected_membership_id).toBe(id); expect(r.checkout.expected_membership_expires_at).toBeTruthy();
  });
  it("only reserves renewal within the renewal window", async () => {
    await member(); expect((await reserve("renew")).error).toBe("renewal_not_available");
    await db.exec("update memberships set expires_at=now()+interval '3 days'");
    expect((await reserve("renew")).order.order_kind).toBe("plan_renewal");
  });
  it("preserves Paddle subscription ownership even if its status is past_due", async () => {
    await member("standard",20,"paddle");
    expect((await reserve("renew")).error).toBe("paddle_managed_subscription");
  });
  it("rejects invalid consent, environment and contact-only product", async () => {
    expect((await reserve("standard",randomUUID(),user,{...billing,legalConsent:false})).error).toBe("invalid_billing");
    expect((await reserve("standard",randomUUID(),user,billing,"other")).error).toBe("invalid_request");
    expect((await reserve("business")).error).toBe("invalid_item");
  });
  it("persists the exact payload before the exclusive order claim", async () => {
    const { reservation, payload, c } = await claim();
    expect(c.request_payload).toEqual(payload); expect(c.creation_state).toBe("creating"); expect(c.lease_id).toBeTruthy();
    const duplicates = await Promise.all(Array.from({ length: 8 }, () => transition(reservation.checkout,"claim_order",payload)));
    expect(duplicates.every(r => !r.claimed)).toBe(true);
  });
  it("rejects a payload with a browser-supplied amount", async () => {
    const r = await reserve(); const payload = buildRaiAcceptPayload(r.order,"https://sandbox.example.test","sandbox");
    payload.invoice.amount=1; expect((await transition(r.checkout,"claim_order",payload)).error).toBe("payload_mismatch");
  });
  it.each([ { amountCents: 1 }, { isProduction: true }, { isProduction: "false" }, { currency: "USD" },
    { merchantAccountId: "other" }, { merchantReference: "other" }, { status: "PAID" } ])("rejects forged bank order proof %j", async wrong => {
    const { c } = await claim(); expect((await transition(c,"bind_order",{...proof(c),...wrong})).error).toBe("provider_order_mismatch");
  });
  it("checks the lease and owner before binding", async () => {
    const { c } = await claim();
    expect((await transition(c,"bind_order",proof(c),{lease:randomUUID()})).error).toBe("lease_mismatch");
    expect((await transition(c,"bind_order",proof(c),{user:otherUser})).error).toBe("not_found");
  });
  it("binds a validated order and only one session claim", async () => {
    const { c } = await claim(); const bound = await transition(c,"bind_order",proof(c));
    expect((await db.query<{provider_order_id:string}>("select provider_order_id from credit_orders where id=$1",[c.order_id])).rows[0].provider_order_id).toBe("P-007-ORD-test");
    const claims = await Promise.all(Array.from({length:8},()=>transition(bound.checkout,"claim_session")));
    expect(claims.filter(r=>r.claimed)).toHaveLength(1);
    const session = claims.find(r=>r.claimed)!.checkout;
    expect((await transition(session,"bind_session",{sessionId:"safe",redirectUrl:"https://evil.example.test/checkout?paymentSession=safe"})).error).toBe("provider_session_mismatch");
    expect((await transition(session,"bind_session",{sessionId:"safe",redirectUrl:"https://payment.raiaccept.com/checkout?paymentSession=safe"})).checkout.session_state).toBe("ready");
  });
  it("keeps an indeterminate order pending and forbids a new bank attempt", async () => {
    const { c, payload } = await claim(); const r = await transition(c,"order_error",{code:"raiaccept_timeout",uncertain:true});
    expect(r.checkout.creation_state).toBe("creation_unknown"); expect(r.checkout.holds_membership).toBe(true);
    expect((await transition(r.checkout,"claim_order",payload)).claimed).toBe(false);
    expect((await reserve("pro")).error).toBe("order_in_progress");
  });
  it("allows a fresh intent after a definitive bank order rejection", async () => {
    const { c } = await claim(); const r = await transition(c,"order_error",{code:"raiaccept_http_400",uncertain:false});
    expect(r.checkout.holds_membership).toBe(false);
    expect((await db.query<{status:string}>("select status from credit_orders where id=$1",[c.order_id])).rows[0].status).toBe("failed");
    expect((await reserve()).ok).toBe(true);
  });
  it("never cancels the bank order on a checkout session error", async () => {
    const { c } = await claim(); const bound = await transition(c,"bind_order",proof(c));
    const session = (await transition(bound.checkout,"claim_session")).checkout;
    const r = await transition(session,"session_error",{code:"raiaccept_http_400",uncertain:false});
    expect(r.checkout).toMatchObject({ creation_state:"created",session_state:"creation_unknown",holds_membership:true });
    expect((await db.query<{status:string}>("select status from credit_orders where id=$1",[c.order_id])).rows[0].status).toBe("pending");
  });
  it("limits financial RPC privileges and denies browser reads", async () => {
    for (const role of ["anon","authenticated"]) {
      const row = (await db.query<{ allowed: boolean }>("select has_function_privilege($1,'reserve_raiaccept_checkout(uuid,uuid,text,text,text,jsonb)','EXECUTE') allowed",[role])).rows[0];
      expect(row.allowed).toBe(false);
      expect((await db.query<{ allowed: boolean }>("select has_table_privilege($1,'raiaccept_checkouts','SELECT') allowed",[role])).rows[0].allowed).toBe(false);
    }
    expect((await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where oid='raiaccept_checkouts'::regclass")).rows[0].relrowsecurity).toBe(true);
    await db.exec("set request.jwt.claim.role='authenticated'"); expect((await reserve()).error).toBe("forbidden");
  });
});

const config: RaiAcceptConfig = { environment:"sandbox",merchantAccountId:merchant,appOrigin:"https://sandbox.example.test",username:"fixture",password:"fixture" };
function orchestration() {
  const input = { userId:user,requestKey:randomUUID(),itemId:"standard",billing };
  const store: CheckoutStore = {
    reserve: async (uid,key,item,_cfg,details) => storeResult(await reserve(item,key,uid,details)),
    transition: async (c,action,data) => storeResult(await transition(c,action,data)),
  };
  const client = {
    createOrder: vi.fn(async (payload: ReturnType<typeof buildRaiAcceptPayload>) => ({
      id:"P-007-ORD-test",status:"DRAFT" as const,isProduction:false,merchantAccountId:merchant,
      merchantReference:payload.invoice.merchantOrderReference,amountCents:payload.invoice.amount*100,currency:"EUR",
    })),
    createCheckout: vi.fn(async (_id: string,_payload: ReturnType<typeof buildRaiAcceptPayload>) => ({ sessionId:"session-safe",redirectUrl:"https://payment.raiaccept.com/checkout?paymentSession=session-safe" })),
  };
  const start = () => startRaiAcceptCheckout(input,config,client,store);
  return { input,store,client,start };
}
function storeResult(result: Result): Awaited<ReturnType<CheckoutStore["reserve"]>> {
  return result.ok ? {ok:true,checkout:result.checkout,order:result.order,claimed:result.claimed} : {ok:false,error:result.error ?? "fixture_error"};
}
describe("RaiAccept orchestration with actual SQL persistence and simulated bank", () => {
  it("creates one order/session and replays its stored URL", async () => {
    const {start,client} = orchestration(); const first = await start();
    expect(first).toMatchObject({state:"ready",redirectUrl:"https://payment.raiaccept.com/checkout?paymentSession=session-safe"});
    expect(await start()).toEqual(first);
    expect(client.createOrder).toHaveBeenCalledTimes(1); expect(client.createCheckout).toHaveBeenCalledTimes(1);
    expect(client.createCheckout.mock.calls[0][1]).toEqual(client.createOrder.mock.calls[0][0]);
  });
  it("queues eight concurrent submissions without a second bank POST", async () => {
    const {start,client} = orchestration(); const results = await Promise.all(Array.from({length:8},start));
    expect(new Set(results.map(result=>"orderId" in result ? result.orderId : "error")).size).toBe(1);
    expect(client.createOrder).toHaveBeenCalledTimes(1); expect(client.createCheckout).toHaveBeenCalledTimes(1);
    expect((await start())).toMatchObject({state:"ready"});
  });
  it("does not retry a bank POST whose response was lost", async () => {
    const {start,client} = orchestration(); client.createOrder.mockRejectedValueOnce(new RaiAcceptError("raiaccept_timeout",undefined,true));
    expect(await start()).toMatchObject({state:"review"}); expect(await start()).toMatchObject({state:"review"});
    expect(client.createOrder).toHaveBeenCalledTimes(1); expect(client.createCheckout).not.toHaveBeenCalled();
  });
  it("retains the exclusive lease after a failed database bind", async () => {
    const {start,client,store} = orchestration(); const original = store.transition;
    store.transition = async (intent,action,data) => {
      if (action==="bind_order") throw new RaiAcceptError("raiaccept_checkout_storage_unavailable");
      return original(intent,action,data);
    };
    expect(await start()).toMatchObject({state:"review"}); expect(await start()).toMatchObject({state:"review"});
    expect(client.createOrder).toHaveBeenCalledTimes(1); expect(client.createCheckout).not.toHaveBeenCalled();
  });
  it("recovers a committed order after a lost DB acknowledgement without recreating it", async () => {
    const {start,client,store} = orchestration(); const original = store.transition;
    store.transition = async (intent,action,data) => {
      const result = await original(intent,action,data);
      if (action==="bind_order") throw new RaiAcceptError("raiaccept_checkout_storage_unavailable");
      return result;
    };
    await expect(start()).rejects.toMatchObject({code:"raiaccept_checkout_storage_unavailable"});
    expect(await start()).toMatchObject({state:"ready"}); expect(client.createOrder).toHaveBeenCalledTimes(1);
  });
  it("returns the committed session after a lost DB acknowledgement", async () => {
    const {start,client,store} = orchestration(); const original = store.transition;
    store.transition = async (intent,action,data) => {
      const result = await original(intent,action,data);
      if (action==="bind_session") throw new RaiAcceptError("raiaccept_checkout_storage_unavailable");
      return result;
    };
    await expect(start()).rejects.toMatchObject({code:"raiaccept_checkout_storage_unavailable"});
    expect(await start()).toMatchObject({state:"ready"}); expect(client.createCheckout).toHaveBeenCalledTimes(1);
  });
  it("never repeats a failed session POST or marks its order failed", async () => {
    const {start,client} = orchestration(); client.createCheckout.mockRejectedValueOnce(new RaiAcceptError("raiaccept_http_error",400));
    expect(await start()).toMatchObject({state:"review"}); expect(await start()).toMatchObject({state:"review"});
    expect(client.createCheckout).toHaveBeenCalledTimes(1);
    expect((await db.query<{status:string}>("select status from credit_orders")).rows[0].status).toBe("pending");
  });
  it("replays a definitive rejection without another bank attempt", async () => {
    const {start,client} = orchestration(); client.createOrder.mockRejectedValueOnce(new RaiAcceptError("raiaccept_http_error",400));
    expect(await start()).toMatchObject({state:"rejected"}); expect(await start()).toMatchObject({state:"rejected"});
    expect(client.createOrder).toHaveBeenCalledTimes(1);
  });
  it("rejects an owner mismatch before contacting the bank", async () => {
    const {start,store,client} = orchestration(); const original=store.reserve;
    store.reserve = async (...args) => {
      const result=await original(...args); if (result.ok) result.checkout.user_id=otherUser; return result;
    };
    await expect(start()).rejects.toMatchObject({code:"raiaccept_checkout_ownership_mismatch"});
    expect(client.createOrder).not.toHaveBeenCalled();
  });
});
