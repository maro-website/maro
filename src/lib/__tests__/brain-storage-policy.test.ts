import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const migration = readFileSync("supabase/migrations/0050_brain_retention_account_storage.sql", "utf8");
// Disposable PostgreSQL schema. The production migration itself is applied unchanged.
export const policyFixture = `create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage;
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
  create table public.memberships(user_id uuid,plan_id text,started_at timestamptz,expires_at timestamptz,suspended boolean default false);
  create table public.workspaces(id text primary key,owner_id uuid,name text,brain_profile jsonb default '{}',brand_name text,brand_logo_url text,icon_url text);
  create table public.workspace_sources(id text primary key,workspace_id text references workspaces(id),owner_id uuid,file_url text);
  create table public.public_creations(slug text,user_id uuid);
  create table storage.objects(bucket_id text,name text,metadata jsonb,user_metadata jsonb,primary key(bucket_id,name));
  alter table public.workspaces enable row level security;
  create policy workspaces_owner_all on public.workspaces for all using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
  alter table public.workspace_sources enable row level security;
  create policy workspace_sources_owner_all on public.workspace_sources for all using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
  grant usage on schema public,auth to authenticated;
  grant select,insert,update,delete on public.workspaces,public.workspace_sources to authenticated;
  set request.jwt.claim.role='service_role';
  insert into public.workspaces values('a','${alice}','A','{}',null,null,'keep-icon'),('b','${alice}','B','{}',null,null,null),('foreign','${bob}','Foreign','{}',null,null,null);`;

async function setup() {
  const db = new PGlite();
  await db.exec(policyFixture);
  await db.exec(migration);
  return db;
}
async function upload(db: PGlite, name: string, size: number, bucket = "generations", ownerMetadata: string | null = null) {
  return db.query("insert into storage.objects values($1,$2,jsonb_build_object('size',$3::bigint),$4::jsonb)",
    [bucket, name, size, ownerMetadata]);
}
async function paid(db: PGlite, user = alice, plan = "standard") {
  await db.query("insert into memberships(user_id,plan_id,started_at,expires_at) values($1,$2,now()-interval '1 day',now()+interval '29 days')", [user, plan]);
  await db.query("select maro_account_policy($1)", [user]);
}
async function expiredBrain(db: PGlite, age: string) {
  await db.exec(`set maro.brain_retention='on';
    update workspaces set brain_profile='{"brand":{"name":"Saved","logoStorageRef":"storage:generations/${alice}/workspace-assets/a/logo.png"}}',
      brand_name='Saved',brand_logo_url='storage:generations/${alice}/workspace-assets/a/logo.png',brain_retention_anchor_at=now()-interval '${age}' where id='a';
    insert into workspace_sources values('source','a','${alice}','storage:generations/${alice}/workspace-assets/a/photo.png');
    set maro.brain_retention='';`);
}

describe("account storage and paid Brain database policy", () => {
  it("counts every workspace, nested generation, avatar and published copy under one quota", async () => {
    const db = await setup();
    try {
      await paid(db);
      await upload(db, `${alice}/job/output.png`, 400000000);
      await upload(db, `${alice}/workspace-assets/a/photo.png`, 300000000);
      await upload(db, `${alice}/project-assets/b.png`, 100000000);
      await upload(db, `public/avatars/${alice}/photo.jpg`, 100000000, "maro-public");
      await db.exec(`insert into public_creations values('legacy-publish','${alice}')`);
      await upload(db, "public/explore/legacy-publish/asset.png", 100000000, "maro-public");
      const policy = await db.query<{ policy: { usedBytes: number; limitBytes: number } }>("select maro_account_policy($1) policy", [alice]);
      expect(policy.rows[0].policy).toMatchObject({ usedBytes: 1000000000, limitBytes: 1000000000 });
      await expect(upload(db, `${alice}/job-two/output.png`, 1)).rejects.toThrow("storage_quota_exceeded");
      await upload(db, `${bob}/own.png`, 1000000000);
      await expect(upload(db, "public/explore/new-publish/asset.png", 1, "maro-public", JSON.stringify({ maro_owner_id: alice }))).rejects.toThrow("storage_quota_exceeded");
    } finally { await db.close(); }
  });

  it("uses 5 GB for Pro and permits shrinking/removal after a downgrade", async () => {
    const db = await setup();
    try {
      await paid(db, alice, "pro");
      await upload(db, `${alice}/large.png`, 5000000000);
      await expect(upload(db, `${alice}/over.png`, 1)).rejects.toThrow("storage_quota_exceeded");
      await db.exec("update memberships set expires_at=now()-interval '1 second'");
      await expect(upload(db, `${alice}/after-expiry.png`, 1)).rejects.toThrow("storage_quota_exceeded");
      await db.query("update storage.objects set metadata=jsonb_build_object('size',2000000000::bigint) where name=$1", [`${alice}/large.png`]);
      await db.query("delete from storage.objects where name=$1", [`${alice}/large.png`]);
      await upload(db, `${alice}/replacement.png`, 1000000000);
      await db.query("insert into storage.objects values('generations',$1,'{\"size\":999999999}',null) on conflict(bucket_id,name) do update set metadata=excluded.metadata", [`${alice}/replacement.png`]);
    } finally { await db.close(); }
  });

  it("denies unpaid Brain writes/uploads while preserving workspace rename and owner isolation", async () => {
    const db = await setup();
    try {
      await db.exec(`set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${alice}'`);
      await expect(db.exec("update workspaces set brain_profile='{\"brand\":{\"name\":\"Denied\"}}' where id='a'")).rejects.toThrow("brain_plan_required");
      await db.exec("update workspaces set name='Renamed',brain_reset_at=now(),brain_retention_anchor_at=null where id='a'");
      expect((await db.query("select name,brain_reset_at from workspaces where id='a'")).rows).toEqual([{ name: "Renamed", brain_reset_at: null }]);
      await expect(db.query("select maro_account_policy($1)", [bob])).rejects.toThrow("unauthorized");
      await db.exec("reset role; set request.jwt.claim.role='service_role'");
      await expect(upload(db, `${alice}/workspace-assets/a/free.png`, 1)).rejects.toThrow("brain_plan_required");
      await paid(db);
      await db.exec(`set role authenticated; set request.jwt.claim.role='authenticated'`);
      await expect(db.exec(`insert into workspace_sources values('foreign-source','foreign','${alice}','x')`)).rejects.toThrow("row-level security");
    } finally { await db.close(); }
  });

  it.each(["59 days", "60 days", "61 days"])("preserves Brain until the exact 60-day deadline: %s", async (age) => {
    const db = await setup();
    try {
      await paid(db);
      await upload(db, `${alice}/workspace-assets/a/photo.png`, 20);
      await upload(db, `${alice}/job/output.png`, 30);
      await db.exec("delete from memberships");
      await expiredBrain(db, age);
      await db.query("select maro_account_policy($1,'a')", [alice]);
      const reset = age !== "59 days";
      const row = (await db.query<{ brain_profile: unknown; brain_reset_at: string | null; name: string; icon_url: string }>("select brain_profile,brain_reset_at,name,icon_url from workspaces where id='a'")).rows[0];
      expect(row.brain_profile).toEqual(reset ? {} : { brand: { name: "Saved", logoStorageRef: `storage:generations/${alice}/workspace-assets/a/logo.png` } });
      expect(Boolean(row.brain_reset_at)).toBe(reset);
      expect(row).toMatchObject({ name: "A", icon_url: "keep-icon" });
      expect((await db.query("select id from workspace_sources")).rows.length).toBe(reset ? 0 : 1);
      expect((await db.query("select path from brain_retention_files")).rows).toEqual(reset ? [{ path: `${alice}/workspace-assets/a/photo.png` }] : []);
      // Metadata is never deleted directly; the retry queue owns Storage API removal.
      expect((await db.query("select * from storage.objects")).rows.length).toBe(2);
    } finally { await db.close(); }
  });

  it("preserves renewal before 60 days and resets a late renewal before it can read/write stale Brain", async () => {
    for (const age of ["59 days", "61 days"]) {
      const db = await setup();
      try {
        await expiredBrain(db, age);
        await paid(db);
        const policy = (await db.query<{ policy: { brainAccess: boolean; brainResetAt: string | null } }>("select maro_account_policy($1,'a') policy", [alice])).rows[0].policy;
        expect(policy.brainAccess).toBe(true);
        expect(Boolean(policy.brainResetAt)).toBe(age === "61 days");
      } finally { await db.close(); }
    }
  });

  it("retains continuous renewals even when several scheduled runs were missed", async () => {
    const db = await setup();
    try {
      await expiredBrain(db, "120 days");
      await db.exec(`insert into memberships(user_id,plan_id,started_at,expires_at) values
        ('${alice}','standard',now()-interval '110 days',now()-interval '80 days'),
        ('${alice}','standard',now()-interval '75 days',now()-interval '45 days'),
        ('${alice}','standard',now()-interval '40 days',now()-interval '10 days'),
        ('${alice}','pro',now()-interval '5 days',now()+interval '25 days');`);
      const result = (await db.query<{ policy: { brainResetAt: null } }>("select maro_account_policy($1,'a') policy", [alice])).rows[0].policy;
      expect(result.brainResetAt).toBeNull();
      expect((await db.query("select id from workspace_sources")).rows).toEqual([{ id: "source" }]);
    } finally { await db.close(); }
  });
});
