import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actor = "11111111-1111-4111-8111-111111111111";
const user = "22222222-2222-4222-8222-222222222222";
const grantId = "33333333-3333-4333-8333-333333333333";
const migration = readFileSync("supabase/migrations/0052_admin_manual_plan.sql", "utf8");

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table profiles(id uuid primary key,email text,access_role text,is_admin boolean default false,credits integer,maro_plan text,plan text,fort_until timestamptz);
    create table commerce_plans(id text primary key,enabled boolean default true);
    create table memberships(id uuid primary key,user_id uuid references profiles(id),plan_id text references commerce_plans(id),
      started_at timestamptz,expires_at timestamptz,renewal_mode text,suspended boolean default false);
    create table audit_events(id uuid default gen_random_uuid(),actor_id uuid,action text,target_type text,target_id text,
      after_state jsonb,metadata jsonb,created_at timestamptz default now());
    create table credit_orders(id uuid); create table credit_transactions(id uuid);
    create function has_admin_access() returns boolean language sql stable security definer as
      $$select coalesce((select access_role in ('super_admin','administrator','developer','editor') or is_admin from profiles where id=auth.uid()),false)$$;
    alter table profiles enable row level security;
    create policy profiles_own_select on profiles for select using(auth.uid()=id or has_admin_access());
    alter table memberships enable row level security;
    create policy memberships_user_select on memberships for select using(auth.uid()=user_id or has_admin_access());
    alter table audit_events enable row level security;
    create policy audit_events_admin_select on audit_events for select using(has_admin_access());
    grant usage on schema auth,public to authenticated,anon,service_role;
    grant select on profiles,memberships,audit_events to authenticated;
    set request.jwt.claim.role='service_role';
    insert into profiles values('${actor}','admin@example.invalid','administrator',false,100,null,'free',null),
      ('${user}','user@example.invalid',null,false,23,null,'free',null);
    insert into commerce_plans values('standard',true),('pro',true),('business',true);
  `);
  await db.exec(migration);
  return db;
}

async function grant(db: PGlite, opts: { plan?: string; days?: number; note?: string; id?: string; actor?: string; user?: string } = {}) {
  return (await db.query<{ result: { ok: boolean; error?: string; already?: boolean; expires_at?: string } }>(
    "select admin_grant_plan($1,$2,$3,$4,$5,$6) result",
    [opts.actor ?? actor, opts.user ?? user, opts.plan ?? "pro", opts.days ?? 30, opts.note ?? "Plan i falur për bashkëpunim", opts.id ?? grantId],
  )).rows[0].result;
}

describe("manual admin plan access", () => {
  it.each(["standard", "pro", "business"])("grants %s with private provenance without touching credits, payments or Fort", async plan => {
    const db = await setup();
    try {
      expect(await grant(db, { plan })).toMatchObject({ ok: true, already: false });
      expect((await db.query("select credits,maro_plan,plan,fort_until from profiles where id=$1", [user])).rows)
        .toEqual([{ credits: 23, maro_plan: plan, plan: "free", fort_until: null }]);
      expect((await db.query("select plan_id,renewal_mode,suspended,extract(epoch from expires_at-started_at)/86400 days from memberships")).rows)
        .toEqual([{ plan_id: plan, renewal_mode: "manual", suspended: false, days: "30.0000000000000000" }]);
      const audit = (await db.query<{ metadata: unknown; actor_id: string; target_id: string }>("select actor_id,target_id,metadata from audit_events")).rows[0];
      expect(audit).toMatchObject({ actor_id: actor, target_id: grantId,
        metadata: { source: "manual", note: "Plan i falur për bashkëpunim", actor_email: "admin@example.invalid", credits_granted: 0 } });
      expect((await db.query("select * from credit_orders")).rows).toEqual([]);
      expect((await db.query("select * from credit_transactions")).rows).toEqual([]);
    } finally { await db.close(); }
  });

  it("retries the same request once and rejects changed content or overlapping plans", async () => {
    const db = await setup();
    try {
      const first = await grant(db);
      expect(await grant(db)).toMatchObject({ ok: true, already: true, expires_at: first.expires_at });
      expect(await grant(db, { note: "Ndryshim pas retry" })).toMatchObject({ ok: false, error: "idempotency_conflict" });
      expect(await grant(db, { id: "44444444-4444-4444-8444-444444444444", plan: "standard" }))
        .toMatchObject({ ok: false, error: "existing_plan" });
      expect((await db.query<{ count: number }>("select count(*) count from memberships")).rows[0].count).toBe(1);
      expect((await db.query<{ count: number }>("select count(*) count from audit_events")).rows[0].count).toBe(1);
    } finally { await db.close(); }
  });

  it("preserves a current paid membership and permits a new grant after expiry", async () => {
    const db = await setup();
    try {
      await db.query("insert into memberships values($1,$2,'standard',now(),now()+interval '10 days','automatic',false)",
        ["44444444-4444-4444-8444-444444444444", user]);
      expect(await grant(db)).toMatchObject({ ok: false, error: "existing_plan" });
      await db.exec("update memberships set expires_at=now()-interval '1 day'");
      expect(await grant(db, { days: 7 })).toMatchObject({ ok: true });
      expect((await db.query<{ count: number }>("select count(*) count from memberships")).rows[0].count).toBe(2);
    } finally { await db.close(); }
  });

  it("rolls back the membership and cache if private audit persistence fails", async () => {
    const db = await setup();
    try {
      await db.exec("alter table audit_events add constraint reject_audit check(false)");
      await expect(grant(db)).rejects.toThrow("reject_audit");
      expect((await db.query("select * from memberships")).rows).toEqual([]);
      expect((await db.query("select credits,maro_plan from profiles where id=$1", [user])).rows)
        .toEqual([{ credits: 23, maro_plan: null }]);
    } finally { await db.close(); }
  });

  it("owners can read their membership but cannot see the private note or call the grant RPC", async () => {
    const db = await setup();
    try {
      await grant(db);
      await db.exec(`set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${user}'`);
      expect((await db.query("select * from audit_events")).rows).toEqual([]);
      const membership = (await db.query<{ plan_id: string }>("select * from memberships")).rows[0];
      expect(membership.plan_id).toBe("pro");
      expect(JSON.stringify(membership)).not.toContain("bashkëpunim");
      await expect(grant(db)).rejects.toThrow("permission denied");
      await db.exec("reset role; set role anon; set request.jwt.claim.role='anon'");
      await expect(grant(db)).rejects.toThrow("permission denied");
    } finally { await db.close(); }
  });

  it("rejects non-managers, disabled plans, invalid durations, notes and nonexistent accounts", async () => {
    const db = await setup();
    try {
      expect(await grant(db, { actor: user })).toMatchObject({ ok: false, error: "forbidden" });
      await db.exec("update profiles set access_role='editor',is_admin=true where access_role='administrator'");
      expect(await grant(db)).toMatchObject({ ok: false, error: "forbidden" });
      await db.exec("update profiles set access_role='administrator',is_admin=false where access_role='editor'; update commerce_plans set enabled=false where id='pro'");
      expect(await grant(db)).toMatchObject({ ok: false, error: "invalid_plan" });
      for (const days of [0, 366]) expect(await grant(db, { plan: "standard", days })).toMatchObject({ ok: false, error: "invalid_duration" });
      expect(await grant(db, { plan: "standard", note: "  " })).toMatchObject({ ok: false, error: "invalid_note" });
      expect(await grant(db, { plan: "standard", user: grantId })).toMatchObject({ ok: false, error: "user_not_found" });
      expect((await db.query("select * from memberships")).rows).toEqual([]);
    } finally { await db.close(); }
  });
});
