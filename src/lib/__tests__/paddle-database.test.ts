import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { deriveMembershipStatus, isActivePlanStatus } from "@/lib/commerce/memberships";

// Real PostgreSQL execution of the actual commerce and Paddle migrations.
// Only pre-commerce prerequisites are fixtures; no SQL fulfillment is mocked.
let db: PGlite;
const user = "11111111-1111-4111-8111-111111111111";
const otherUser = "22222222-2222-4222-8222-222222222222";
const price = "pri_" + "a".repeat(26);
const customer = "ctm_" + "b".repeat(26);
const sub = "sub_" + "c".repeat(26);
const tx = "txn_" + "d".repeat(26);
const start = new Date();
const at = (days: number, seconds = 0) => new Date(start.getTime() + days * 86400000 + seconds * 1000).toISOString();
let seed: string;

async function apply(overrides: Record<string, unknown> = {}) {
  const event = { eventId: "evt_" + randomUUID(), eventType: "transaction.completed", occurredAt: at(0, 2),
    kind: "transaction", seedOrderId: seed, userId: user, transactionId: tx, subscriptionId: sub,
    customerId: customer, priceId: price, status: "completed", origin: "api", amount: 900,
    currency: "EUR", startsAt: at(0), endsAt: at(30), ...overrides };
  return (await db.query<{ result: Record<string, unknown> }>("select public.apply_paddle_event($1::jsonb) as result", [JSON.stringify(event)])).rows[0].result;
}
async function balance() {
  return (await db.query<{ credits: number }>("select credits from profiles where id=$1", [user])).rows[0].credits;
}
async function membership(): Promise<Record<string, unknown> & { expires_at: string }> {
  const row = (await db.query<Record<string, unknown>>("select * from memberships where paddle_subscription_id=$1", [sub])).rows[0];
  return { ...row, expires_at: (row.expires_at as Date).toISOString() };
}
async function reserve(item = "standard", uid = user) {
  return (await db.query<{ result: { order: { id: string }; created: boolean } }>(
    "select create_paddle_order($1,$2,$3,$4::jsonb) result", [uid, item, price, JSON.stringify({ legalConsent: true, fullName: "Test" })]
  )).rows[0].result;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create function public.has_admin_access() returns boolean language sql as $$ select false $$;
    create table profiles(id uuid primary key references auth.users(id), credits integer not null default 0, maro_plan text);
    create table credit_orders(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
      user_email text, credits integer not null default 0, amount_cents integer not null default 0,
      currency text not null default 'EUR', status text not null default 'pending', provider text,
      item_type text, item_id text, billing_snapshot jsonb, promo_code text, paid_at timestamptz, cancel_reason text,
      created_at timestamptz not null default now());
    create table credit_transactions(id uuid primary key default gen_random_uuid(), user_id uuid,
      type text, amount integer, balance_after integer, idempotency_key text, metadata jsonb,
      unique(user_id, idempotency_key, type));
  `);
  const legacy = readFileSync("supabase/migrations/0014_payments_maro_plan.sql", "utf8");
  const cancelSql = legacy.match(/create or replace function public\.cancel_credit_order\([\s\S]*?\$\$;/)?.[0];
  if (!cancelSql) throw new Error("legacy cancellation routine missing");
  await db.exec(cancelSql);
  for (const file of ["0037_commerce_memberships.sql", "0038_commerce_ledger_and_fulfillment.sql", "0040_commerce_rpc_privileges.sql", "0047_paddle_billing.sql"]) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
});
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("truncate credit_transactions, credit_orders, memberships, profiles, auth.users, paddle_webhook_events cascade");
  await db.query("insert into auth.users values($1,'test@example.test'),($2,'other@example.test')", [user, otherUser]);
  await db.query("insert into profiles(id,credits) values($1,17),($2,0)", [user, otherUser]);
  seed = (await reserve()).order.id;
  await db.query("update credit_orders set provider_transaction_id=$1,paddle_customer_id=$2 where id=$3", [tx, customer, seed]);
});

describe("Paddle atomic PostgreSQL fulfillment", () => {
  it("subscription.created links ownership but grants no credits or paid time", async () => {
    await apply({ kind: "subscription", eventType: "subscription.created", status: "active", occurredAt: at(0) });
    expect(await balance()).toBe(17);
    expect(new Date(String((await membership()).expires_at)).getTime()).toBe(start.getTime());
    await apply();
    expect(await balance()).toBe(117);
    expect((await membership()).renewal_mode).toBe("automatic");
  });
  it("completed transaction activates even when subscription.created arrives later", async () => {
    await apply();
    await apply({ kind: "subscription", eventType: "subscription.created", status: "active", occurredAt: at(0) });
    expect(await balance()).toBe(117);
    expect(new Date(String((await membership()).expires_at)).toISOString()).toBe(at(30));
  });
  it("deduplicates identical event IDs and distinct events for the same transaction", async () => {
    await apply({ eventId: "event-once" });
    expect((await apply({ eventId: "event-once" })).duplicate).toBe(true);
    expect((await apply()).duplicate_transaction).toBe(true);
    expect(await balance()).toBe(117);
  });
  it("deduplicates concurrent delivery", async () => {
    await Promise.all(Array.from({ length: 8 }, () => apply()));
    expect(await balance()).toBe(117);
    expect((await db.query("select * from credit_transactions")).rows).toHaveLength(1);
  });
  it("renews exactly once per period and accumulates unused credits", async () => {
    await apply();
    const renewal = { transactionId: "txn_renewal", origin: "subscription_recurring", startsAt: at(30), endsAt: at(60), occurredAt: at(30) };
    await apply(renewal);
    await apply(renewal);
    expect((await apply({ ...renewal, transactionId: "txn_duplicate_cycle" })).duplicate_period).toBe(true);
    expect(await balance()).toBe(217);
    expect(new Date(String((await membership()).expires_at)).toISOString()).toBe(at(60));
    expect((await db.query("select * from credit_orders where order_kind='plan_renewal'")).rows).toHaveLength(1);
  });
  it("handles out-of-order paid cycles without regressing paid-through", async () => {
    await apply();
    await apply({ transactionId: "txn_later", origin: "subscription_recurring", startsAt: at(60), endsAt: at(90), occurredAt: at(60) });
    await apply({ transactionId: "txn_earlier", origin: "subscription_recurring", startsAt: at(30), endsAt: at(60), occurredAt: at(30) });
    expect(await balance()).toBe(317);
    expect(new Date(String((await membership()).expires_at)).toISOString()).toBe(at(90));
  });
  it("retains paid time for scheduled cancellation and expires on actual cancellation", async () => {
    await apply();
    await apply({ kind: "subscription", status: "active", occurredAt: at(10), scheduledChange: { action: "cancel", effectiveAt: at(30) } });
    expect(new Date(String((await membership()).expires_at)).toISOString()).toBe(at(30));
    await apply({ kind: "subscription", status: "canceled", occurredAt: at(30), scheduledChange: null });
    expect((await membership()).paddle_status).toBe("canceled");
    await apply({ kind: "subscription", status: "active", occurredAt: at(15) });
    expect((await membership()).paddle_status).toBe("canceled");
  });
  it("immediate cancellation is not undone by delayed completed payment", async () => {
    await apply({ kind: "subscription", status: "canceled", occurredAt: at(1) });
    await apply();
    expect(new Date(String((await membership()).expires_at)).toISOString()).toBe(at(1));
    expect((await membership()).paddle_status).toBe("canceled");
    expect(await balance()).toBe(117);
  });
  it("past due grants no credits or extension; paid recovery adds one cycle", async () => {
    await apply();
    await apply({ kind: "subscription", status: "past_due", occurredAt: at(30), startsAt: at(30), endsAt: at(60) });
    expect(await balance()).toBe(117);
    expect(new Date(String((await membership()).expires_at)).toISOString()).toBe(at(30));
    await apply({ transactionId: "txn_recovered", origin: "subscription_recurring", startsAt: at(30), endsAt: at(60), occurredAt: at(31) });
    expect(await balance()).toBe(217);
    await apply({ kind: "subscription", status: "active", occurredAt: at(31, 1) });
    expect((await membership()).paddle_status).toBe("active");
  });
  it("an expired paid period loses entitlement without a cancellation event or cron", async () => {
    await apply({ startsAt: at(-60), endsAt: at(-30), occurredAt: at(-60) });
    const row = await membership();
    expect(isActivePlanStatus(deriveMembershipStatus({ expires_at: row.expires_at,
      plan_id: "standard", suspended: false, renewal_window_days: 7 }))).toBe(false);
    expect(await balance()).toBe(117);
  });
  it.each(["paused", "canceled"])("%s removes active paid access at event time", async (status) => {
    await apply(); await apply({ kind: "subscription", status, occurredAt: at(1) });
    expect(new Date(String((await membership()).expires_at)).toISOString()).toBe(at(1));
    expect(await balance()).toBe(117);
  });
  it.each([
    { amount: 899 }, { currency: "USD" }, { customerId: "ctm_other" }, { userId: otherUser },
    { priceId: "pri_other" }, { transactionId: "txn_forged" }, { endsAt: at(31) },
  ])("rejects mismatched payment and rolls back receipt %j", async (overrides) => {
    await expect(apply(overrides)).rejects.toThrow();
    expect(await balance()).toBe(17);
    expect((await db.query("select * from paddle_webhook_events")).rows).toHaveLength(0);
  });
  it("retries update before subscription binding rather than guessing ownership", async () => {
    await expect(apply({ kind: "subscription", status: "active", transactionId: undefined })).rejects.toThrow("not_bound");
    await apply();
    await apply({ kind: "subscription", status: "active", transactionId: undefined });
    expect(await balance()).toBe(117);
  });
  it("rolls back on a ledger failure, then recovers on replay", async () => {
    await db.exec("alter table credit_transactions add constraint test_failure check(amount < 100)");
    await expect(apply({ eventId: "retry-after-db-failure" })).rejects.toThrow();
    expect(await balance()).toBe(17);
    await db.exec("alter table credit_transactions drop constraint test_failure");
    await apply({ eventId: "retry-after-db-failure" });
    expect(await balance()).toBe(117);
  });
  it("blocks browser/test fulfillment of Paddle and cross-provider manual renewal", async () => {
    let result = await db.query<{ result: { error: string } }>("select fulfill_commerce_order($1,'test') result", [seed]);
    expect(result.rows[0].result.error).toBe("paddle_webhook_required");
    await apply();
    const legacy = (await db.query<{ id: string }>("insert into credit_orders(user_id,provider,order_kind) values($1,'test','plan_renewal') returning id", [user])).rows[0].id;
    result = await db.query("select fulfill_commerce_order($1,'test') result", [legacy]);
    expect(result.rows[0].result.error).toBe("paddle_managed_subscription");
  });
  it("keeps original Raiffeisen fulfillment working", async () => {
    const order = (await db.query<{ id: string }>(`insert into credit_orders(user_id,provider,order_kind,item_id,credits,amount_cents)
      values($1,'raiffeisen','plan_purchase','pro',500,3500) returning id`, [otherUser])).rows[0].id;
    const result = await db.query<{ result: { ok: boolean } }>("select fulfill_commerce_order($1,'bank-tx') result", [order]);
    expect(result.rows[0].result.ok).toBe(true);
  });
  it("preserves legacy cancellation but cannot locally cancel a Paddle checkout", async () => {
    const blocked = await db.query<{ result: { error: string } }>("select cancel_credit_order($1,'test') result", [seed]);
    expect(blocked.rows[0].result.error).toBe("paddle_managed_payment");
    const legacyOrder = (await db.query<{ id: string }>("insert into credit_orders(user_id,provider) values($1,'raiffeisen') returning id", [otherUser])).rows[0].id;
    await db.query("select cancel_credit_order($1,'test')", [legacyOrder]);
    expect((await db.query<{ status: string }>("select status from credit_orders where id=$1", [legacyOrder])).rows[0].status).toBe("cancelled");
  });
  it("cannot use one paid order to bind a second subscription", async () => {
    await apply();
    await expect(apply({ subscriptionId: "sub_another" })).rejects.toThrow("mapping_mismatch");
    expect(await balance()).toBe(117);
  });
  it("delayed cancellation wins even when a completed event has a later timestamp", async () => {
    await apply({ occurredAt: at(2) });
    await apply({ kind: "subscription", status: "canceled", occurredAt: at(1) });
    expect((await membership()).expires_at).toBe(at(1));
  });
  it("reuses a bound pending checkout and refuses a second plan", async () => {
    expect((await reserve()).order.id).toBe(seed);
    await expect(reserve("pro")).rejects.toThrow("pending");
    await apply();
    await expect(reserve()).rejects.toThrow("active_or_managed");
  });
  it("top-up is one-off, has no new subscription, and credits once", async () => {
    await apply();
    seed = (await reserve("topup-100")).order.id;
    await db.query("update credit_orders set provider_transaction_id='txn_topup',paddle_customer_id=$1 where id=$2", [customer, seed]);
    await apply({ transactionId: "txn_topup", subscriptionId: null, startsAt: null, endsAt: null });
    await apply({ transactionId: "txn_topup", subscriptionId: null, startsAt: null, endsAt: null });
    expect(await balance()).toBe(217);
    expect((await db.query("select * from memberships")).rows).toHaveLength(1);
  });
  it("financial RPCs and receipt table are not accessible to browser roles", async () => {
    const rows = await db.query<{ permitted: boolean }>(`select has_function_privilege('authenticated',
      'public.apply_paddle_event(jsonb)', 'execute') permitted`);
    expect(rows.rows[0].permitted).toBe(false);
    expect((await db.query<{ permitted: boolean }>(`select has_function_privilege('anon',
      'public.create_paddle_order(uuid,text,text,jsonb)', 'execute') permitted`)).rows[0].permitted).toBe(false);
    expect((await db.query<{ permitted: boolean }>(`select has_function_privilege('service_role',
      'public.fulfill_non_paddle_commerce_order(uuid,text)', 'execute') permitted`)).rows[0].permitted).toBe(false);
  });
});
