import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync("supabase/migrations/0047_paddle_billing.sql", "utf8");
const userId = "11111111-1111-4111-8111-111111111111";

function extractRoutine(file, pattern, label) {
  const sql = readFileSync(file, "utf8").match(pattern)?.[0];
  if (!sql) throw new Error(`missing_${label}_routine`);
  return sql;
}

// These reproduce the read-only audited production logic. They are intentionally
// local rehearsal inputs: migration 0047 must leave their bodies unchanged.
const productionReserve = String.raw`
create or replace function public.reserve_credits(p_user uuid, p_amount integer, p_job_id uuid, p_idempotency_key text default null)
returns integer language plpgsql security definer set search_path = public as $function$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.user_id <> p_user or j.status not in ('pending','reserved','processing') or p_amount <= 0 then return -1; end if;
  if j.metadata->>'v1_durable' = 'true' and p_amount is distinct from (j.metadata#>>'{v1_request,model,customerCredits}')::integer then return -1; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is not null then
    if r.user_id <> p_user or r.amount <> p_amount then return -1; end if;
    select credits into bal from public.profiles where id=p_user;
    return bal;
  end if;
  select credits into bal from public.profiles where id=p_user for update;
  if bal is null or bal < p_amount then return -1; end if;
  update public.profiles set credits=credits-p_amount, credits_reserved=credits_reserved+p_amount where id=p_user returning credits into bal;
  insert into public.credit_transactions(user_id,job_id,type,amount,balance_after,idempotency_key) values(p_user,p_job_id,'reserve',p_amount,bal,p_idempotency_key);
  update public.generation_jobs set status='reserved',credits_reserved=p_amount where id=p_job_id;
  return bal;
end $function$;
`;

const productionRelease = String.raw`
create or replace function public.release_credit_reserve(p_job_id uuid, p_idempotency_key text default null)
returns boolean language plpgsql security definer set search_path = public as $function$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null then return false; end if;
  if j.status='completed' or exists(select 1 from public.credit_transactions where job_id=p_job_id and type='charge') then return false; end if;
  if exists(select 1 from public.credit_transactions where job_id=p_job_id and type in ('release','refund')) then return true; end if;
  if j.metadata->>'v1_durable'='true' and exists(select 1 from public.generations where job_id=p_job_id) then return false; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is not null then
    update public.profiles set credits=credits+r.amount,credits_reserved=credits_reserved-r.amount where id=r.user_id and credits_reserved>=r.amount returning credits into bal;
    if not found then raise exception 'reservation_accounting_mismatch'; end if;
    insert into public.credit_transactions(user_id,job_id,type,amount,balance_after,idempotency_key) values(r.user_id,p_job_id,'release',r.amount,bal,p_idempotency_key);
  end if;
  if j.status not in ('failed','cancelled') then
    update public.generation_jobs set status='failed',credits_reserved=0,finished_at=now(),error=coalesce(error,'generation_failed') where id=p_job_id;
  end if;
  return true;
end $function$;
`;

async function functionHash(db, name) {
  const result = await db.query(
    "select md5(p.prosrc) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1",
    [name],
  );
  return result.rows[0]?.hash ?? null;
}

async function columns(db, table) {
  const result = await db.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
      create function public.has_admin_access() returns boolean language sql as $$ select false $$;
      create table public.profiles(
        id uuid primary key references auth.users(id),
        credits integer not null default 0,
        credits_reserved integer not null default 0,
        maro_plan text
      );
      create table public.credit_orders(
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id), user_email text,
        credits integer not null default 0, amount_cents integer not null default 0,
        currency text not null default 'EUR', status text not null default 'pending',
        provider text, item_type text, item_id text, billing_snapshot jsonb,
        promo_code text, paid_at timestamptz, cancel_reason text,
        created_at timestamptz not null default now()
      );
      create table public.credit_transactions(
        id uuid primary key default gen_random_uuid(), user_id uuid, job_id uuid,
        type text, amount integer, balance_after integer, idempotency_key text,
        metadata jsonb default '{}'::jsonb, created_at timestamptz default now(),
        unique(user_id,idempotency_key,type)
      );
      create table public.generation_jobs(
        id uuid primary key, user_id uuid, status text,
        credits_reserved integer not null default 0,
        metadata jsonb default '{}'::jsonb, finished_at timestamptz, error text
      );
      create table public.generations(job_id uuid);
    `);

    const legacyCancel = extractRoutine(
      "supabase/migrations/0014_payments_maro_plan.sql",
      /create or replace function public\.cancel_credit_order\([\s\S]*?\$\$;/,
      "cancel",
    );
    await db.exec(legacyCancel);
    for (const file of [
      "0037_commerce_memberships.sql",
      "0038_commerce_ledger_and_fulfillment.sql",
      "0040_commerce_rpc_privileges.sql",
    ]) {
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    }
    await db.exec(productionReserve);
    await db.exec(productionRelease);
    await db.exec(`
      revoke all on function public.reserve_credits(uuid,integer,uuid,text) from public, anon, authenticated;
      revoke all on function public.release_credit_reserve(uuid,text) from public, anon, authenticated;
      grant execute on function public.reserve_credits(uuid,integer,uuid,text) to service_role;
      grant execute on function public.release_credit_reserve(uuid,text) to service_role;
      insert into auth.users values ('${userId}','rehearsal@example.test');
      insert into public.profiles(id,credits) values ('${userId}',10);
      insert into public.memberships(user_id,plan_id,expires_at)
        values ('${userId}','standard',now()+interval '20 days');
      insert into public.credit_orders(id,user_id,credits,amount_cents,provider,item_type,item_id,order_kind)
        values
          ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${userId}',100,900,'raiffeisen','topup','topup-100','topup'),
          ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${userId}',0,0,'raiffeisen','legacy','legacy',null);
    `);

    const before = {
      reserve: await functionHash(db, "reserve_credits"),
      release: await functionHash(db, "release_credit_reserve"),
      fulfill: await functionHash(db, "fulfill_commerce_order"),
      cancel: await functionHash(db, "cancel_credit_order"),
    };
    const beforeCounts = await db.query(
      "select (select count(*) from profiles) profiles,(select count(*) from memberships) memberships,(select count(*) from credit_orders) orders,(select credits from profiles where id=$1) credits",
      [userId],
    );

    await db.exec("begin");
    try {
      await db.exec(migration);

      const membershipColumns = await columns(db, "memberships");
      const orderColumns = await columns(db, "credit_orders");
      for (const name of [
        "payment_provider", "paddle_subscription_id", "paddle_customer_id",
        "paddle_price_id", "paddle_origin_order_id", "paddle_status",
        "paddle_event_at", "paddle_scheduled_change", "paddle_paid_through",
      ]) assert(membershipColumns.includes(name), `missing_membership_column:${name}`);
      for (const name of [
        "paddle_customer_id", "paddle_subscription_id", "paddle_price_id",
        "paddle_period_start", "paddle_period_end",
      ]) assert(orderColumns.includes(name), `missing_order_column:${name}`);

      const paddleTable = await db.query(
        "select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='paddle_webhook_events'",
      );
      assert.equal(paddleTable.rows[0]?.relrowsecurity, true);
      const permissions = (await db.query(`select
        has_table_privilege('service_role','public.paddle_webhook_events','SELECT,INSERT,UPDATE,DELETE') service_table,
        has_table_privilege('anon','public.paddle_webhook_events','SELECT') anon_table,
        has_function_privilege('service_role','public.create_paddle_order(uuid,text,text,jsonb)','EXECUTE') service_create,
        has_function_privilege('authenticated','public.create_paddle_order(uuid,text,text,jsonb)','EXECUTE') authenticated_create,
        has_function_privilege('service_role','public.apply_paddle_event(jsonb)','EXECUTE') service_apply,
        has_function_privilege('anon','public.apply_paddle_event(jsonb)','EXECUTE') anon_apply,
        has_function_privilege('service_role','public.fulfill_non_paddle_commerce_order(uuid,text)','EXECUTE') service_legacy_fulfill,
        has_function_privilege('service_role','public.cancel_non_paddle_credit_order(uuid,text)','EXECUTE') service_legacy_cancel`)).rows[0];
      assert.equal(permissions.service_table, true);
      assert.equal(permissions.anon_table, false);
      assert.equal(permissions.service_create, true);
      assert.equal(permissions.authenticated_create, false);
      assert.equal(permissions.service_apply, true);
      assert.equal(permissions.anon_apply, false);
      assert.equal(permissions.service_legacy_fulfill, false);
      assert.equal(permissions.service_legacy_cancel, false);
      const paidCycle = await db.query(
        "select indexdef from pg_indexes where schemaname='public' and indexname='paddle_paid_cycle_once'",
      );
      assert.equal(paidCycle.rows.length, 1);

      assert.equal(await functionHash(db, "reserve_credits"), before.reserve);
      assert.equal(await functionHash(db, "release_credit_reserve"), before.release);
      assert.equal(await functionHash(db, "fulfill_non_paddle_commerce_order"), before.fulfill);
      assert.equal(await functionHash(db, "cancel_non_paddle_credit_order"), before.cancel);
      assert(await functionHash(db, "create_paddle_order"));
      assert(await functionHash(db, "apply_paddle_event"));

      const fulfilled = await db.query(
        "select public.fulfill_commerce_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rehearsal-tx') result",
      );
      assert.equal(fulfilled.rows[0].result.ok, true);
      const canceled = await db.query(
        "select public.cancel_credit_order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rehearsal') result",
      );
      assert.equal(canceled.rows[0].result.ok, true);
      await db.exec(`insert into public.credit_orders(id,user_id,provider,status)
        values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','${userId}','paddle','pending')`);
      const blocked = await db.query(
        "select public.fulfill_commerce_order('cccccccc-cccc-4ccc-8ccc-cccccccccccc','forbidden') result",
      );
      assert.equal(blocked.rows[0].result.error, "paddle_webhook_required");
    } finally {
      await db.exec("rollback");
    }

    assert.equal((await columns(db, "memberships")).includes("paddle_subscription_id"), false);
    assert.equal((await columns(db, "credit_orders")).includes("paddle_period_start"), false);
    assert.equal((await db.query("select to_regclass('public.paddle_webhook_events') present")).rows[0].present, null);
    assert.equal(await functionHash(db, "reserve_credits"), before.reserve);
    assert.equal(await functionHash(db, "release_credit_reserve"), before.release);
    assert.equal(await functionHash(db, "fulfill_commerce_order"), before.fulfill);
    assert.equal(await functionHash(db, "cancel_credit_order"), before.cancel);
    assert.equal(await functionHash(db, "create_paddle_order"), null);
    assert.deepEqual(
      (await db.query(
        "select (select count(*) from profiles) profiles,(select count(*) from memberships) memberships,(select count(*) from credit_orders) orders,(select credits from profiles where id=$1) credits",
        [userId],
      )).rows,
      beforeCounts.rows,
    );

    console.log(JSON.stringify({
      migration: "0047_paddle_billing.sql",
      representativeSchema: "production-audited commerce and credit prerequisites",
      apply: "PASS",
      rollback: "PASS",
      rlsAndRpcPermissions: "PASS",
      productionReserveReleasePreserved: true,
      legacyBodiesPreservedBehindWrappers: true,
      paddleFulfillmentRequiresWebhook: true,
      representativeDataRestored: true,
    }, null, 2));
  } finally {
    await db.close();
  }
}

await main();
