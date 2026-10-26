import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    insert into auth.users values('${owner}','erzen@nice.al',now()),('${other}','someone@example.test',now());
    create table public.workspaces(id text primary key,owner_id uuid);insert into workspaces values('ws','${owner}'),('ws2','${owner}'),('foreign','${other}');
    create table profiles(id uuid primary key,credits int,credits_reserved int);insert into profiles values('${owner}',37,5);
    create table credit_transactions(id int,amount int);insert into credit_transactions values(1,37);`);
  await db.exec(readFileSync("supabase/migrations/0079_maromarketing_private_pilot.sql", "utf8"));
  return db;
}
const reserve = async (db: PGlite, id = crypto.randomUUID(), ws = "ws", user = owner, fingerprint = "fingerprint") => (await db.query<{ result: { existing: boolean } }>("select maro_marketing_reserve($1,$2,$3,$4,'Brand','{}','gpt-6-luna') result", [user, ws, id, fingerprint])).rows[0].result;
describe("private marketing durable accounting", () => {
  it("blocks foreign/unverified accounts and workspaces without touching financial data", async () => {
    const db = await setup(); try {
      await expect(reserve(db, undefined, "ws", other)).rejects.toThrow("MARKETING_FORBIDDEN");
      await expect(reserve(db, undefined, "foreign")).rejects.toThrow("WORKSPACE_NOT_FOUND");
      await db.exec(`update auth.users set email_confirmed_at=null where id='${owner}'`);
      await expect(reserve(db)).rejects.toThrow("MARKETING_FORBIDDEN");
      expect((await db.query("select credits,credits_reserved from profiles")).rows).toEqual([{ credits: 37, credits_reserved: 5 }]);
      expect((await db.query("select * from credit_transactions")).rows).toEqual([{ id: 1, amount: 37 }]);
    } finally { await db.close(); }
  });
  it("replays the same request once and rejects collisions/concurrent workspace spending", async () => {
    const db = await setup(); try {
      const id = crypto.randomUUID(); expect(await reserve(db, id)).toEqual({ existing: false }); expect(await reserve(db, id)).toEqual({ existing: true });
      await expect(reserve(db, id, "ws2")).rejects.toThrow("REQUEST_CONFLICT");
      await expect(reserve(db, id, "ws", owner, "different-input")).rejects.toThrow("REQUEST_CONFLICT");
      await expect(reserve(db, undefined, "ws2")).rejects.toThrow("MARKETING_BUSY");
      expect((await db.query("select count(*)::int n from maro_marketing_campaigns")).rows).toEqual([{ n: 1 }]);
    } finally { await db.close(); }
  });
  it("retains uncertain usage after recovery and applies caps across Brain boundaries", async () => {
    const db = await setup(); try {
      const id = crypto.randomUUID(); await reserve(db, id);
      await db.exec("update maro_marketing_campaigns set created_at=now()-interval '6 minutes'");
      await reserve(db, id);
      expect((await db.query("select status,error_code,reserved_usd::float8,estimated_usd from maro_marketing_campaigns")).rows[0]).toMatchObject({ status: "failed", error_code: "result_unknown", reserved_usd: .1, estimated_usd: null });
      await db.exec("update maro_marketing_campaigns set created_at=now(),estimated_usd=1.95");
      await expect(reserve(db, undefined, "ws2")).rejects.toThrow("MARKETING_DAILY_LIMIT");
      await db.exec("update maro_marketing_campaigns set estimated_usd=9.95,created_at=date_trunc('month',now())");
      // On the first of a month the daily guard may be the first applicable cap.
      await expect(reserve(db, undefined, "ws2")).rejects.toThrow(/MARKETING_(MONTHLY|DAILY)_LIMIT/);
    } finally { await db.close(); }
  });
  it("keeps storage and RPC access service-only and enforces unique publish attempts", async () => {
    const db = await setup(); try {
      const tables = ["maro_marketing_campaigns", "maro_marketing_social_profiles", "maro_marketing_publications"];
      for (const table of tables) expect((await db.query<{ a: boolean; b: boolean; c: boolean; rls: boolean }>(`select has_table_privilege('anon','public.${table}','SELECT') a,has_table_privilege('authenticated','public.${table}','SELECT') b,has_table_privilege('service_role','public.${table}','SELECT') c,(select relrowsecurity from pg_class where oid='public.${table}'::regclass) rls`)).rows[0]).toEqual({ a: false, b: false, c: true, rls: true });
      const grants = await db.query("select has_function_privilege('authenticated','maro_marketing_reserve(uuid,text,uuid,text,text,jsonb,text)','EXECUTE') a"); expect(grants.rows).toEqual([{ a: false }]);
      const id = crypto.randomUUID(), post = crypto.randomUUID(); await reserve(db, id);
      const insert = () => db.query("insert into maro_marketing_publications(owner_id,workspace_id,campaign_id,post_id,account_id,platform,account_name,snapshot) values($1,'ws',$2,$3,'account','instagram','Brand','{}')", [owner, id, post]);
      await insert(); await expect(insert()).rejects.toThrow(/duplicate key/);
    } finally { await db.close(); }
  });
});
