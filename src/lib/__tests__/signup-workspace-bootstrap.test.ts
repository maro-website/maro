import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";

async function database() {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create role supabase_admin; create role supabase_auth_admin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create table storage.buckets(id text primary key, file_size_limit bigint, allowed_mime_types text[]);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
    create function auth.jwt() returns jsonb language sql as $$ select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true)) $$;
    grant usage on schema public,auth to anon,authenticated,service_role,supabase_auth_admin;
    grant insert,select on auth.users to supabase_auth_admin;`);
  await db.exec(readFileSync("docs/db-history/v1-baseline-20261009.sql", "utf8"));
  await db.exec(`create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();`);
  await db.exec(readFileSync("supabase/migrations/0057_v1_security_boundaries.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/0060_signup_workspace_bootstrap.sql", "utf8"));
  return db;
}

it("creates the signup profile and first workspace as Supabase Auth without a user JWT", async () => {
  const db = await database();
  const userId = randomUUID();
  try {
    await db.exec("set role supabase_auth_admin");
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [userId, "signup@example.test", { full_name: "Signup Test" }]);
    await db.exec("reset role");
    const profile = await db.query<{ full_name: string; credits: number; is_admin: boolean; active_workspace_id: string }>(
      "select full_name,credits,is_admin,active_workspace_id from profiles where id=$1", [userId]);
    expect(profile.rows).toEqual([expect.objectContaining({ full_name: "Signup Test", credits: 0, is_admin: false })]);
    expect((await db.query("select id from workspaces where owner_id=$1", [userId])).rows).toEqual([
      { id: profile.rows[0].active_workspace_id },
    ]);
  } finally { await db.close(); }
}, 60000);

it("still enforces workspace limits on trusted inserts and blocks cross-account RPC reads", async () => {
  const db = await database();
  const owner = randomUUID(), other = randomUUID();
  try {
    await db.exec("set role supabase_auth_admin");
    await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)",
      [owner, "owner@example.test", other, "other@example.test"]);
    await db.exec("reset role; set role service_role");
    await expect(db.query("insert into workspaces(id,owner_id,name) values($1,$2,'Extra')",
      [`ws_${randomUUID().replaceAll("-", "")}`, owner])).rejects.toThrow(/WORKSPACE_LIMIT/);
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.role='authenticated';
      set request.jwt.claim.sub='${owner}';`);
    expect((await db.query("select resolve_workspace_limit($1) as n", [owner])).rows).toEqual([{ n: 1 }]);
    await expect(db.query("select resolve_workspace_limit($1)", [other])).rejects.toThrow(/workspace_limit_not_authorized/);
    await expect(db.query("select resolve_workspace_limit_internal($1)", [other])).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    expect((await db.query("select count(*)::integer as n from workspaces")).rows).toEqual([{ n: 2 }]);
  } finally { await db.close(); }
}, 60000);

it("bootstraps an account even when another account's JWT remains in the SQL session", async () => {
  const db = await database();
  const existing = randomUUID(), signup = randomUUID();
  try {
    await db.exec(`set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${existing}';
      set role supabase_auth_admin;`);
    await db.query("insert into auth.users(id,email) values($1,'new@example.test')", [signup]);
    await db.exec("reset role");
    expect((await db.query("select count(*)::integer as n from workspaces where owner_id=$1", [signup])).rows).toEqual([{ n: 1 }]);
  } finally { await db.close(); }
}, 60000);
