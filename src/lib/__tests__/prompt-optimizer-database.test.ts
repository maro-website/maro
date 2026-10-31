import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const fingerprint = "a".repeat(64);
const migration = readFileSync("supabase/migrations/20261031015548_maro_prompt_optimizer.sql", "utf8");
async function reserve(user = owner, key = "request", hash = fingerprint, reserveUsd = 0.2, workspace: string | null = "workspace-a") {
  const result = await db.query<{ result: { action: string; id?: string; final_prompt?: string } }>("select maro_optimizer_reserve($1,$2,$3,$4,'reklama',36728,$5) as result", [user, workspace, key, hash, reserveUsd]);
  return result.rows[0].result;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}');
    create table profiles(id uuid primary key,email text); insert into profiles values('${owner}','owner@test.invalid'),('${other}','other@test.invalid');
    create table workspaces(id text primary key,owner_id uuid); insert into workspaces values('workspace-a','${owner}'),('workspace-b','${other}');
    create table app_settings(id integer primary key,ai_paused boolean,platform_limits jsonb); insert into app_settings values(1,false,'{}');
    grant usage on schema auth,public to service_role; grant select on workspaces,app_settings,profiles to service_role;`);
  await db.exec(migration);
});
afterAll(async () => { await db?.close(); });
describe("durable optimizer admission and private cost ledger", () => {
  it.each(["anon", "authenticated"])("denies %s prompts, ledger mutations and privileged functions", async role => {
    await db.exec(`set role ${role}`);
    try {
      await expect(db.query("select * from maro_optimizer_attempts")).rejects.toThrow("permission denied");
      await expect(db.query("update maro_optimizer_attempts set estimated_usd=0")).rejects.toThrow("permission denied");
      await expect(reserve()).rejects.toThrow("permission denied");
      await expect(db.query("select maro_optimizer_usage_summary()")).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
    expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname='maro_optimizer_attempts'")).rows[0].relrowsecurity).toBe(true);
  });
  it("only the owning workspace can spend; global pause and module pause deny admission", async () => {
    await expect(reserve(other, "wrong-workspace")).rejects.toThrow("workspace_forbidden");
    await db.exec("update app_settings set ai_paused=true");
    expect(await reserve()).toEqual({ action: "paused" });
    await db.exec(`update app_settings set ai_paused=false,platform_limits='{"pausedModules":["reklama"]}'`);
    expect(await reserve()).toEqual({ action: "paused" });
    await db.exec("update app_settings set platform_limits='{}'");
  });
  it("runs once, blocks duplicates, rejects a changed idempotent payload and returns scoped cache", async () => {
    const claim = await reserve(); expect(claim.action).toBe("run");
    expect(await reserve()).toEqual({ action: "busy" });
    expect(await reserve(owner, "second-request")).toEqual({ action: "busy" });
    expect(await reserve(owner, "request", "b".repeat(64))).toEqual({ action: "conflict" });
    await db.query("update maro_optimizer_attempts set status='completed',final_prompt='PRIVATE OPTIMIZED',final_chars=17,estimated_usd=0.01,input_tokens=100,cached_tokens=10,output_tokens=20 where id=$1", [claim.id]);
    expect(await reserve(owner, "third-request")).toMatchObject({ action: "cache", id: claim.id, final_prompt: "PRIVATE OPTIMIZED" });
    expect(await reserve(other, "other-request", fingerprint, 0.2, "workspace-b")).toMatchObject({ action: "run" });
  });
  it("reports real-token estimates separately from uncertain reserved exposure, without prompts", async () => {
    const row = (await db.query<{ s: Array<Record<string, unknown>> }>("select maro_optimizer_usage_summary() as s")).rows[0].s;
    const own = row.find(r => r.user_id === owner)!;
    const second = row.find(r => r.user_id === other)!;
    expect(Number(own.estimated_usd)).toBe(0.01); expect(Number(own.cache_hits)).toBe(1);
    expect(Number(second.estimated_usd)).toBe(0); expect(Number(second.unconfirmed_reserved_usd)).toBe(0.2);
    expect(Number(second.unconfirmed)).toBe(1);
    expect(JSON.stringify(row)).not.toContain("PRIVATE OPTIMIZED");
  });
  it("retains unknown spend after crash and accounts paid rejected outputs against caps", async () => {
    await db.exec("update maro_optimizer_attempts set status='uncertain' where status='running'");
    for (let i=0;i<2;i++) {
      const claim = await reserve(owner, `paid-${i}`, String(i).repeat(64), 0.8);
      expect(claim.action).toBe("run");
      await db.query("update maro_optimizer_attempts set status='rejected',estimated_usd=0.8 where id=$1", [claim.id]);
    }
    expect(await reserve(owner,"over-budget","c".repeat(64),0.8)).toEqual({ action: "budget" });
    expect(await reserve(other,"other-over-budget","d".repeat(64),0.8,"workspace-b")).toMatchObject({ action:"run" });
    expect(await reserve(owner,"request")).toMatchObject({ action:"cache" });
  });
  it("keeps incurred user costs when a workspace is deleted and works under service-role privileges", async () => {
    const before = (await db.query<{ total: string }>("select sum(coalesce(estimated_usd,reserved_usd)) as total from maro_optimizer_attempts where user_id=$1", [other])).rows[0].total;
    await db.query("delete from workspaces where id='workspace-b'");
    expect((await db.query<{ total: string }>("select sum(coalesce(estimated_usd,reserved_usd)) as total from maro_optimizer_attempts where user_id=$1", [other])).rows[0].total).toBe(before);
    await db.exec("set role service_role");
    try { expect((await db.query("select maro_optimizer_usage_summary()")).rows).toHaveLength(1); }
    finally { await db.exec("reset role"); }
  });
});
