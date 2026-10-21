import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    insert into auth.users values('${owner}','erzen@nice.al',now()),('${other}','someone@example.test',now());
    create table public.workspaces(id text primary key,owner_id uuid,brain_profile jsonb default '{}',brain_reset_at timestamptz,brand_name text);
    insert into workspaces values('ws','${owner}','{}',null,null),('ws2','${owner}','{}',null,null),('foreign','${other}','{}',null,null);
    create function public.maro_account_policy(uuid,text) returns jsonb language sql as $$select '{"brainAccess":true}'::jsonb$$;
    create table profiles(id uuid primary key,credits int,credits_reserved int);insert into profiles values('${owner}',37,5);
    create table credit_transactions(id int,amount int);insert into credit_transactions values(1,37);`);
  const mcp = readFileSync("supabase/migrations/0068_maro_mcp_products.sql", "utf8");
  await db.exec(mcp.slice(mcp.indexOf("create table public.maro_brain_profile_versions"), mcp.indexOf("create function public.maro_mcp_brain_authorization")));
  await db.exec(mcp.match(/create function public\.maro_mcp_update_brand\([\s\S]*?end; \$\$;/)![0]);
  await db.exec(readFileSync("supabase/migrations/0078_marochat_private_pilot.sql", "utf8"));
  return db;
}
const reserve = (db: PGlite, id = crypto.randomUUID(), ws = "ws", user = owner, tokens = 10000, message = "Make an ad", rev = 0) => db.query<{ v: { existing: boolean; status: string } }>("select maro_chat_reserve($1,$2,$3,'33333333-3333-4333-8333-333333333333',$4,true,$5,$6,null,'gpt-5.4-mini') v", [user, ws, id, message, tokens, rev]);
describe("maroChat durable private quota and Brain writes", () => {
  it("keeps credits and ledger unchanged, closes public table/RPC permissions, requires confirmed pilot owner", async () => {
    const db = await setup(); try {
      expect((await db.query("select credits,credits_reserved from profiles")).rows).toEqual([{ credits: 37, credits_reserved: 5 }]);
      expect((await db.query("select amount from credit_transactions")).rows).toEqual([{ amount: 37 }]);
      await expect(reserve(db, undefined, "foreign", other)).rejects.toThrow("CHAT_FORBIDDEN");
      await expect(reserve(db, undefined, "foreign")).rejects.toThrow("WORKSPACE_NOT_FOUND");
      await db.exec(`update auth.users set email_confirmed_at=null where id='${owner}'`);
      await expect(reserve(db)).rejects.toThrow("CHAT_FORBIDDEN");
      await db.exec("set role authenticated"); await expect(db.query("select * from maro_chat_turns")).rejects.toThrow("permission denied"); await expect(db.query("select maro_chat_guard($1,'ws')", [owner])).rejects.toThrow("permission denied");
    } finally { await db.close(); }
  });
  it("replays a request exactly once, rejects conflicts and serializes across workspaces", async () => {
    const db = await setup(); try {
      const id = crypto.randomUUID(); expect((await reserve(db, id)).rows[0].v.existing).toBe(false);
      expect((await reserve(db, id)).rows[0].v.existing).toBe(true);
      await expect(reserve(db, id, "ws2")).rejects.toThrow("REQUEST_CONFLICT");
      await expect(reserve(db, undefined, "ws2")).rejects.toThrow("CHAT_BUSY");
      await db.exec("update maro_chat_turns set created_at=now()-interval '3 minutes'");
      expect((await reserve(db, id)).rows[0].v).toMatchObject({ existing: true, status: "failed" });
      expect((await db.query("select charged_tokens from maro_chat_turns")).rows).toEqual([{ charged_tokens: 10000 }]);
    } finally { await db.close(); }
  });
  it("enforces daily and monthly token caps account-wide before starting work", async () => {
    const db = await setup(); try {
      const id = crypto.randomUUID(); await reserve(db, id, "ws", owner, 100000);
      await db.exec("update maro_chat_turns set status='completed',charged_tokens=195000");
      await expect(reserve(db, undefined, "ws2")).rejects.toThrow("CHAT_DAILY_LIMIT");
      await db.exec("update maro_chat_turns set charged_tokens=995000,created_at=date_trunc('month',now())+interval '1 hour'");
      await expect(reserve(db, undefined, "ws2")).rejects.toThrow("CHAT_MONTHLY_LIMIT");
    } finally { await db.close(); }
  });
  it("applies reviewed fields atomically, records versions and does not apply twice", async () => {
    const db = await setup(); try {
      const id = crypto.randomUUID(); await reserve(db, id);
      await db.query("update maro_chat_turns set status='completed',reply=$2 where id=$1", [id, { brainUpdates: [{ section: "brand", field: "name", value: "Coffee" }, { section: "content", field: "tone", value: "Warm" }] }]);
      await db.query("select maro_chat_apply_brain($1,$2)", [owner, id]);
      expect((await db.query<{ brain_profile: unknown }>("select brain_profile from workspaces where id='ws'")).rows[0].brain_profile).toEqual({ brand: { name: "Coffee" }, content: { tone: "Warm" } });
      const versions = (await db.query("select revision from maro_brain_profile_versions")).rows;
      await db.query("select maro_chat_apply_brain($1,$2)", [owner, id]);
      expect((await db.query("select revision from maro_brain_profile_versions")).rows).toEqual(versions);
      expect((await db.query("select brain_profile from workspaces where id='ws2'")).rows).toEqual([{ brain_profile: {} }]);
    } finally { await db.close(); }
  });
  it("rejects stale profile or reset epoch, rolling back every field on an invalid proposal", async () => {
    const db = await setup(); try {
      const id = crypto.randomUUID(); await reserve(db, id);
      await db.query("update maro_chat_turns set status='completed',reply=$2 where id=$1", [id, { brainUpdates: [{ section: "brand", field: "name", value: "Coffee" }, { section: "brand", field: "logoUrl", value: "https://evil.invalid" }] }]);
      await expect(db.query("select maro_chat_apply_brain($1,$2)", [owner, id])).rejects.toThrow("INVALID_REQUEST");
      expect((await db.query("select brain_profile from workspaces where id='ws'")).rows).toEqual([{ brain_profile: {} }]);
      await db.exec("update workspaces set brain_profile='{\"brand\":{\"name\":\"New manual edit\"}}' where id='ws'");
      await expect(db.query("select maro_chat_apply_brain($1,$2)", [owner, id])).rejects.toThrow("BRAND_CONFLICT");
      await db.exec("update workspaces set brain_reset_at=now(),brain_profile='{}' where id='ws'");
      await expect(db.query("select maro_chat_apply_brain($1,$2)", [owner, id])).rejects.toThrow("BRAND_CONFLICT");
    } finally { await db.close(); }
  });
});
