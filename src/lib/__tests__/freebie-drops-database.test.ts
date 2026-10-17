import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actor = "11111111-1111-4111-8111-111111111111";
const alice = "22222222-2222-4222-8222-222222222222";
const bob = "33333333-3333-4333-8333-333333333333";
const migration = readFileSync("supabase/migrations/0064_freebie_code_drops.sql", "utf8");
const editingMigration = readFileSync("supabase/migrations/0066_edit_delete_freebie_drops.sql", "utf8");
const interestMigration = readFileSync("supabase/migrations/0072_freebie_exhausted_interest.sql", "utf8");
const adminMigration = readFileSync("supabase/migrations/0061_admin_user_management.sql", "utf8");
type Result = { ok: boolean; error?: string; credits?: number; balance?: number; already?: boolean; drop_id?: string; required?: number; current?: number; plan_id?: string };

async function setup(withEditing = true) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create table profiles(id uuid primary key references auth.users(id) on delete cascade,email text,
      access_role text,is_admin boolean default false,credits integer not null default 23,maro_plan text);
    create table commerce_plans(id text primary key,enabled boolean default true);
    create table memberships(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,
      plan_id text references commerce_plans(id),started_at timestamptz,expires_at timestamptz,renewal_mode text,suspended boolean default false);
    create table audit_events(id uuid default gen_random_uuid(),actor_id uuid,action text,target_type text,target_id text,
      before_state jsonb,after_state jsonb,metadata jsonb);
    create table credit_transactions(id uuid default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,
      type text,amount integer,balance_after integer,idempotency_key text,metadata jsonb,unique(user_id,idempotency_key,type));
    create table generation_jobs(id uuid default gen_random_uuid(),user_id uuid,status text,finished_at timestamptz);
    create table raiaccept_checkouts(user_id uuid,holds_membership boolean);
    create table admin_user_deletion_locks(user_id uuid references auth.users(id) on delete cascade);
    create table user_notifications(user_id uuid,dedupe_key text,kind text,title text,body text,action_href text,metadata jsonb,unique(user_id,dedupe_key));
    grant usage on schema auth,public to anon,authenticated,service_role;
    set request.jwt.claim.role='service_role';
    insert into auth.users values('${actor}',now()),('${alice}',now()),('${bob}',now());
    insert into profiles(id,email,access_role) values('${actor}','admin@example.invalid','administrator'),
      ('${alice}','alice@example.invalid',null),('${bob}','bob@example.invalid',null);
    insert into commerce_plans values('standard',true),('pro',true),('business',true);
  `);
  await db.exec(adminMigration.slice(adminMigration.indexOf("create function public.admin_can_manage_users"), adminMigration.indexOf("create table public.user_storage_overrides")));
  await db.exec(adminMigration.slice(adminMigration.indexOf("create function public.maro_notify_manual_credits"), adminMigration.indexOf("-- A suspended older membership")));
  await db.exec(migration);
  if (withEditing) { await db.exec(editingMigration); await db.exec(interestMigration); }
  return db;
}
async function claim(db: PGlite, code = "TRAMPOLINE", user = alice) {
  return (await db.query<{ result: Result }>("select claim_freebie_drop($1,$2) result", [user, code])).rows[0].result;
}
async function create(db: PGlite, code: string, options: { credits?: number; claims?: number; activity?: number; target?: string; plan?: string; days?: number; actor?: string; id?: string; start?: string; end?: string; title?: string } = {}) {
  return (await db.query<{ result: Result }>("select admin_create_freebie_drop($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) result", [
    options.actor ?? actor, options.id ?? crypto.randomUUID(), code, options.title ?? "Promotion test",
    options.credits ?? 10, options.claims ?? (options.target ? 1 : 100), options.activity ?? 0,
    options.target ?? null, options.plan ?? null, options.plan ? options.days ?? 30 : null,
    options.start ?? new Date(Date.now() - 1000).toISOString(), options.end ?? null,
  ])).rows[0].result;
}
async function snapshot(db: PGlite, code: string, user = alice) {
  return (await db.query("select p.credits,p.maro_plan,d.claims_count,(select count(*) from credit_transactions where user_id=$2) transactions,(select count(*) from freebie_claims where user_id=$2) claims from freebie_drops d,profiles p where d.code=$1 and p.id=$2", [code, user])).rows[0];
}

async function currentDrop(db: PGlite, code = "TRAMPOLINE") {
  return (await db.query<{ id: string; title: string; credits: number; max_claims: number; min_generations_7d: number; plan_id: string | null; plan_days: number | null; expires_at: Date | null; updated_at: string; claims_count: number; credits_given: number }>(
    "select id,title,credits,max_claims,min_generations_7d,plan_id,plan_days,expires_at,updated_at::text,claims_count,credits_given from freebie_drops where code=$1 and deleted_at is null", [code])).rows[0];
}
async function edit(db: PGlite, options: { code?: string; credits?: number; claims?: number; expected?: string; actor?: string } = {}) {
  const d = await currentDrop(db, options.code);
  return (await db.query<{ result: Result }>("select admin_update_freebie_drop($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result", [
    options.actor ?? actor, d.id, d.title, options.credits ?? d.credits, options.claims ?? d.max_claims,
    d.min_generations_7d, d.plan_id, d.plan_days, d.expires_at, options.expected ?? d.updated_at,
  ])).rows[0].result;
}
async function remove(db: PGlite, d: Awaited<ReturnType<typeof currentDrop>>, code = "TRAMPOLINE", admin = actor) {
  return (await db.query<{ result: Result }>("select admin_delete_freebie_drop($1,$2,$3,$4) result", [admin, d.id, code, d.updated_at])).rows[0].result;
}

describe("free credit Code Drops", () => {
  it("counts unique late accounts separately from repeated attempts, without granting rewards", async () => {
    const db = await setup();
    try {
      await create(db, "FULL-DROP", { claims: 1 });
      expect(await claim(db, "FULL-DROP")).toMatchObject({ ok: true });
      const before = await currentDrop(db, "FULL-DROP");
      for (let i=0;i<3;i++) expect(await claim(db, "FULL-DROP", bob)).toMatchObject({ error: "claims_exhausted" });
      expect(await claim(db, "FULL-DROP", actor)).toMatchObject({ error: "claims_exhausted" });
      expect(await claim(db, "FULL-DROP", alice)).toMatchObject({ error: "already_claimed" });
      expect((await db.query("select missed_users,missed_attempts,claims_count,credits_given,updated_at::text from freebie_drops where id=$1", [before.id])).rows[0]).toMatchObject({ missed_users: 2, missed_attempts: 4, claims_count: 1, credits_given: 10, updated_at: before.updated_at });
      const rows = (await db.query<{ user_id: string; attempts: number; first_attempt_at: Date; last_attempt_at: Date }>("select * from freebie_exhausted_attempts where drop_id=$1 order by attempts desc", [before.id])).rows;
      expect(rows).toHaveLength(2); expect(rows[0]).toMatchObject({ user_id: bob, attempts: 3 });
      expect(new Date(rows[0].last_attempt_at).getTime()).toBeGreaterThanOrEqual(new Date(rows[0].first_attempt_at).getTime());
      expect((await db.query("select credits from profiles where id=$1", [bob])).rows[0]).toEqual({ credits: 23 });
      expect((await db.query("select count(*) n from credit_transactions")).rows[0]).toEqual({ n: 1 });
      expect((await db.query("select count(*) n from freebie_claims")).rows[0]).toEqual({ n: 1 });
      await edit(db, { code: "FULL-DROP", claims: 2 });
      expect(await claim(db, "FULL-DROP", bob)).toMatchObject({ ok: true });
      expect((await db.query("select missed_users,missed_attempts,claims_count from freebie_drops where id=$1", [before.id])).rows[0]).toMatchObject({ missed_users: 2, missed_attempts: 4, claims_count: 2 });
      await db.exec(`delete from auth.users where id='${actor}'`);
      expect((await db.query("select count(*) n from freebie_exhausted_attempts where user_id is null")).rows[0]).toEqual({ n: 1 });
      await db.exec("set role authenticated");
      await expect(db.query("select * from freebie_exhausted_attempts")).rejects.toThrow(/permission denied/i);
    } finally { await db.close(); }
  });

  it("does not record invalid, paused, expired, future, wrong-account, unconfirmed or unauthorized attempts", async () => {
    const db = await setup();
    try {
      await create(db, "PERSONAL-FULL", { target: alice }); await claim(db, "PERSONAL-FULL");
      expect(await claim(db, "PERSONAL-FULL", bob)).toMatchObject({ error: "wrong_account" });
      await create(db, "LATE-CHECK", { claims: 1 }); await claim(db, "LATE-CHECK");
      await db.exec("update freebie_drops set active=false where code='LATE-CHECK'");
      expect(await claim(db, "LATE-CHECK", bob)).toMatchObject({ error: "code_inactive" });
      await db.exec("update freebie_drops set active=true,starts_at=now()-interval '2 days',expires_at=now()-interval '1 day' where code='LATE-CHECK'");
      expect(await claim(db, "LATE-CHECK", bob)).toMatchObject({ error: "code_expired" });
      await db.exec("update freebie_drops set starts_at=now()+interval '1 day',expires_at=null where code='LATE-CHECK'");
      expect(await claim(db, "LATE-CHECK", bob)).toMatchObject({ error: "not_started" });
      await db.exec("update freebie_drops set starts_at=now()-interval '1 day' where code='LATE-CHECK'");
      await db.exec(`update auth.users set email_confirmed_at=null where id='${bob}'`);
      expect(await claim(db, "LATE-CHECK", bob)).toMatchObject({ error: "email_unconfirmed" });
      expect(await claim(db, "MISSING-DROP")).toMatchObject({ error: "invalid_code" });
      await db.exec("set request.jwt.claim.role='authenticated'");
      expect(await claim(db, "LATE-CHECK", actor)).toMatchObject({ error: "forbidden" });
      expect((await db.query("select count(*) n from freebie_exhausted_attempts")).rows[0]).toEqual({ n: 0 });
    } finally { await db.close(); }
  });
  it("edits future rewards while keeping earlier balances, claims and real credit totals", async () => {
    const db = await setup();
    try {
      expect(await claim(db)).toMatchObject({ ok: true, credits: 10, balance: 33 });
      expect(await edit(db, { credits: 15 })).toMatchObject({ ok: true });
      expect(await claim(db)).toMatchObject({ error: "already_claimed" });
      expect(await claim(db, "TRAMPOLINE", bob)).toMatchObject({ ok: true, credits: 15, balance: 38 });
      expect(await currentDrop(db)).toMatchObject({ credits: 15, claims_count: 2, credits_given: 25 });
      expect((await db.query("select credits from freebie_claims order by claimed_at")).rows).toEqual([{ credits: 10 }, { credits: 15 }]);
      expect((await db.query("select sum(amount) total from credit_transactions")).rows[0]).toEqual({ total: 25 });
    } finally { await db.close(); }
  });

  it("backfills real credit totals for claims made before the editing migration", async () => {
    const db = await setup(false);
    try {
      await claim(db);
      await db.exec(editingMigration);
      expect(await currentDrop(db)).toMatchObject({ claims_count: 1, credits_given: 10 });
      expect(await edit(db, { credits: 15 })).toMatchObject({ ok: true });
      expect(await currentDrop(db)).toMatchObject({ claims_count: 1, credits_given: 10 });
    } finally { await db.close(); }
  });

  it("blocks stale edits/deletes and limits below used claims without changing rewards", async () => {
    const db = await setup();
    try {
      const before = await currentDrop(db);
      await claim(db);
      expect(await edit(db, { credits: 15, expected: before.updated_at })).toMatchObject({ error: "drop_changed" });
      expect(await remove(db, before)).toMatchObject({ error: "drop_changed" });
      await claim(db, "TRAMPOLINE", bob);
      expect(await edit(db, { claims: 1 })).toMatchObject({ error: "claims_below_used" });
      await create(db, "PERSONAL-EDIT", { target: alice });
      expect(await edit(db, { code: "PERSONAL-EDIT", claims: 2 })).toMatchObject({ error: "invalid_request" });
      expect(await edit(db, { credits: 15, actor: alice })).toMatchObject({ error: "forbidden" });
      expect(await currentDrop(db)).toMatchObject({ credits: 10, max_claims: 100, credits_given: 20 });
    } finally { await db.close(); }
  });

  it("releases a deleted code for a new promotion and preserves old claims and ledger", async () => {
    const db = await setup();
    try {
      await claim(db);
      expect(await create(db, "TRAMPOLINE")).toMatchObject({ error: "code_exists" });
      const old = await currentDrop(db);
      expect(await remove(db, old, "OTHER-CODE")).toMatchObject({ error: "confirmation_mismatch" });
      expect(await remove(db, old, "TRAMPOLINE", alice)).toMatchObject({ error: "forbidden" });
      expect(await remove(db, old)).toMatchObject({ ok: true, already: false });
      expect(await remove(db, old)).toMatchObject({ ok: true, already: true });
      expect(await claim(db)).toMatchObject({ error: "invalid_code" });
      const toggle = await db.query<{ result: Result }>("select admin_set_freebie_active($1,$2,true) result", [actor, old.id]);
      expect(toggle.rows[0].result).toMatchObject({ error: "drop_not_found" });
      expect(await create(db, "TRAMPOLINE", { credits: 15 })).toMatchObject({ ok: true });
      expect(await claim(db)).toMatchObject({ ok: true, credits: 15, balance: 48 });
      expect(await currentDrop(db)).toMatchObject({ credits: 15, claims_count: 1, credits_given: 15 });
      expect((await db.query("select credits from freebie_claims where drop_id=$1", [old.id])).rows).toEqual([{ credits: 10 }]);
      expect((await db.query("select sum(amount) total,count(*) count from credit_transactions")).rows[0]).toEqual({ total: 25, count: 2 });
      expect((await db.query("select count(*) count from audit_events where action='freebies.deleted'")).rows[0]).toEqual({ count: 1 });
    } finally { await db.close(); }
  });

  it("rolls back edit/delete if audit fails and rejects retrying a deleted creation", async () => {
    const db = await setup();
    try {
      const retry = { id: crypto.randomUUID(), start: new Date(Date.now() - 1000).toISOString() };
      await create(db, "DELETE-RETRY", retry);
      await db.exec("alter table audit_events add constraint reject_admin_audit check(action not in ('freebies.updated','freebies.deleted'))");
      await expect(edit(db, { credits: 15 })).rejects.toThrow("reject_admin_audit");
      await expect(remove(db, await currentDrop(db))).rejects.toThrow("reject_admin_audit");
      expect(await currentDrop(db)).toMatchObject({ credits: 10 });
      expect(await create(db, "TRAMPOLINE")).toMatchObject({ error: "code_exists" });
      await db.exec("alter table audit_events drop constraint reject_admin_audit");
      await remove(db, await currentDrop(db, "DELETE-RETRY"), "DELETE-RETRY");
      expect(await create(db, "DELETE-RETRY", retry)).toMatchObject({ error: "drop_deleted" });
      await db.exec("set role authenticated; set request.jwt.claim.role='authenticated'");
      await expect(db.query("select admin_update_freebie_drop($1,$2,'Edited',15,100,0,null,null,null,now())", [actor, retry.id])).rejects.toThrow("permission denied");
      await expect(db.query("select admin_delete_freebie_drop($1,$2,'DELETE-RETRY',now())", [actor, retry.id])).rejects.toThrow("permission denied");
    } finally { await db.close(); }
  });

  it("caps the requested promotion at 100 claims / 1000 credits, including competing requests", async () => {
    const db = await setup();
    try {
      const ids = (await db.query<{ id: string }>("insert into auth.users select gen_random_uuid(),now() from generate_series(1,101) returning id")).rows.map(row => row.id);
      await db.query("insert into profiles(id,credits) select id,0 from auth.users where id=any($1)", [ids]);
      const results = await Promise.all(ids.map(id => claim(db, "  trampoline  ", id)));
      expect(results.filter(result => result.ok)).toHaveLength(100);
      expect(results.filter(result => result.error === "claims_exhausted")).toHaveLength(1);
      expect((await db.query("select claims_count,max_claims,credits from freebie_drops where code='TRAMPOLINE'")).rows[0]).toEqual({ claims_count: 100, max_claims: 100, credits: 10 });
      expect((await db.query("select sum(amount) total,count(*) count from credit_transactions")).rows[0]).toEqual({ total: 1000, count: 100 });
      expect((await db.query<{ count: number }>("select count(*) count from user_notifications")).rows[0].count).toBe(100);
      const winner = ids[results.findIndex(result => result.ok)];
      expect(await claim(db, "TRAMPOLINE", winner)).toMatchObject({ ok: false, error: "already_claimed" });
      expect((await db.query<{ total: number }>("select sum(amount) total from credit_transactions")).rows[0].total).toBe(1000);
    } finally { await db.close(); }
  });

  it("binds a personal link to its recipient and keeps it private after recipient deletion", async () => {
    const db = await setup();
    try {
      expect(await create(db, "ALICE-20C", { credits: 20, target: alice })).toMatchObject({ ok: true });
      expect(await claim(db, "ALICE-20C", bob)).toMatchObject({ error: "wrong_account" });
      expect(await claim(db, "ALICE-20C")).toMatchObject({ ok: true, credits: 20, balance: 43 });
      expect(await claim(db, "ALICE-20C")).toMatchObject({ error: "already_claimed" });
      await create(db, "UNUSED-PERSONAL", { target: alice });
      await db.query("delete from auth.users where id=$1", [alice]);
      expect(await claim(db, "UNUSED-PERSONAL", bob)).toMatchObject({ error: "wrong_account" });
      expect((await db.query<{ claims_count: number }>("select claims_count from freebie_drops where code='ALICE-20C'")).rows[0].claims_count).toBe(1);
    } finally { await db.close(); }
  });

  it("counts only completed generations inside the last seven days", async () => {
    const db = await setup();
    try {
      await create(db, "ACTIVE-TWO", { activity: 2 });
      await db.query("insert into generation_jobs(user_id,status,finished_at) values($1,'failed',now()),($1,'completed',now()-interval '8 days'),($1,'completed',now()+interval '1 day'),($1,'completed',now()-interval '1 hour')", [alice]);
      expect(await claim(db, "ACTIVE-TWO")).toMatchObject({ error: "activity_required", required: 2, current: 1 });
      expect(await snapshot(db, "ACTIVE-TWO")).toMatchObject({ credits: 23, claims_count: 0, transactions: 0, claims: 0 });
      await db.query("insert into generation_jobs(user_id,status,finished_at) values($1,'completed',now()-interval '1 minute')", [alice]);
      expect(await claim(db, "ACTIVE-TWO")).toMatchObject({ ok: true, balance: 33 });
    } finally { await db.close(); }
  });

  it("rejects disabled, future, expired and unverified claims without consuming a place", async () => {
    const db = await setup();
    try {
      expect(await claim(db, "BAD-CODE")).toMatchObject({ error: "invalid_code" });
      expect(await claim(db, "'")).toMatchObject({ error: "invalid_code" });
      await db.exec("update freebie_drops set active=false where code='TRAMPOLINE'");
      expect(await claim(db)).toMatchObject({ error: "code_inactive" });
      await create(db, "FUTURE", { start: new Date(Date.now() + 86400000).toISOString() });
      expect(await claim(db, "FUTURE")).toMatchObject({ error: "not_started" });
      await create(db, "EXPIRED", { start: new Date(Date.now() - 172800000).toISOString(), end: new Date(Date.now() - 86400000).toISOString() });
      expect(await claim(db, "EXPIRED")).toMatchObject({ error: "code_expired" });
      await db.exec("update freebie_drops set active=true where code='TRAMPOLINE'");
      await db.query("update auth.users set email_confirmed_at=null where id=$1", [alice]);
      expect(await claim(db)).toMatchObject({ error: "email_unconfirmed" });
      await db.query("update auth.users set email_confirmed_at=now() where id=$1", [alice]);
      await db.query("insert into admin_user_deletion_locks values($1)", [alice]);
      expect(await claim(db)).toMatchObject({ error: "account_unavailable" });
      expect(await snapshot(db, "TRAMPOLINE")).toMatchObject({ credits: 23, claims_count: 0, transactions: 0, claims: 0 });
    } finally { await db.close(); }
  });

  it("grants only configured credits with a manual plan and preserves current plans and pending payments", async () => {
    const db = await setup();
    try {
      await create(db, "PLAN-GIFT", { plan: "pro", days: 14, credits: 20 });
      await db.query("insert into memberships values(gen_random_uuid(),$1,'standard',now(),now()+interval '2 days','automatic',false)", [alice]);
      expect(await claim(db, "PLAN-GIFT")).toMatchObject({ error: "existing_plan" });
      await db.exec("update memberships set expires_at=now()-interval '1 day'");
      await db.query("insert into raiaccept_checkouts values($1,true)", [alice]);
      expect(await claim(db, "PLAN-GIFT")).toMatchObject({ error: "active_payment" });
      expect(await snapshot(db, "PLAN-GIFT")).toMatchObject({ credits: 23, claims_count: 0 });
      await db.exec("delete from raiaccept_checkouts");
      expect(await claim(db, "PLAN-GIFT")).toMatchObject({ ok: true, credits: 20, balance: 43, plan_id: "pro" });
      expect((await db.query("select plan_id,renewal_mode,extract(epoch from expires_at-started_at)/86400 days from memberships where plan_id='pro'")).rows[0]).toEqual({ plan_id: "pro", renewal_mode: "manual", days: "14.0000000000000000" });
      expect((await db.query<{ count: number }>("select count(*) count from user_notifications")).rows[0].count).toBe(2);
    } finally { await db.close(); }
  });

  it("rolls back the credits, claim, quota and plan if the ledger or audit cannot persist", async () => {
    const db = await setup();
    try {
      await create(db, "ROLLBACK", { plan: "standard" });
      await db.exec("alter table credit_transactions add constraint reject_ledger check(false)");
      await expect(claim(db, "ROLLBACK")).rejects.toThrow("reject_ledger");
      expect(await snapshot(db, "ROLLBACK")).toMatchObject({ credits: 23, maro_plan: null, claims_count: 0, transactions: 0, claims: 0 });
      expect((await db.query<{ count: number }>("select count(*) count from memberships")).rows[0].count).toBe(0);
      await db.exec("alter table credit_transactions drop constraint reject_ledger; alter table audit_events add constraint reject_claim_audit check(action<>'freebies.claimed')");
      await expect(claim(db, "ROLLBACK")).rejects.toThrow("reject_claim_audit");
      expect(await snapshot(db, "ROLLBACK")).toMatchObject({ credits: 23, maro_plan: null, claims_count: 0, transactions: 0, claims: 0 });
      expect((await db.query<{ count: number }>("select count(*) count from user_notifications")).rows[0].count).toBe(0);
    } finally { await db.close(); }
  });

  it("retries creation safely, validates personal limits and gates both RPCs and tables", async () => {
    const db = await setup();
    try {
      const options = { id: crypto.randomUUID(), start: new Date(Date.now() - 1000).toISOString() };
      expect(await create(db, "RETRY", options)).toMatchObject({ ok: true, already: false });
      expect(await create(db, "RETRY", options)).toMatchObject({ ok: true, already: true });
      expect(await create(db, "RETRY", { ...options, credits: 99 })).toMatchObject({ error: "idempotency_conflict" });
      expect(await create(db, "RETRY")).toMatchObject({ error: "code_exists" });
      expect(await create(db, "INVALID-PERSONAL", { target: alice, claims: 2 })).toMatchObject({ error: "invalid_request" });
      expect(await create(db, "WRONG-ACTOR", { actor: alice })).toMatchObject({ error: "forbidden" });
      await db.exec("set role authenticated; set request.jwt.claim.role='authenticated'");
      await expect(claim(db)).rejects.toThrow("permission denied");
      await expect(create(db, "FORGED")).rejects.toThrow("permission denied");
      await expect(db.query("select * from freebie_drops")).rejects.toThrow("permission denied");
      await expect(db.query("select * from freebie_claims")).rejects.toThrow("permission denied");
      await db.exec("reset role; set role anon; set request.jwt.claim.role='anon'");
      await expect(claim(db)).rejects.toThrow("permission denied");
    } finally { await db.close(); }
  });
});
