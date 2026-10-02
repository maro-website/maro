import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const post = "33333333-3333-4333-8333-333333333333";
const chat = "44444444-4444-4444-8444-444444444444";
const job = "55555555-5555-4555-8555-555555555555";
const migration = readFileSync("supabase/migrations/0051_conversations_explore_profiles.sql", "utf8");
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
    create table profiles(id uuid primary key);
    create table generation_jobs(id uuid primary key,user_id uuid,metadata jsonb);
    create table generations(id uuid primary key default gen_random_uuid(),job_id uuid,user_id uuid,workspace_id text,kind text,created_at timestamptz default now());
    create table public_creations(id uuid primary key default gen_random_uuid(),user_id uuid,created_at timestamptz default now(),prompt text);
    grant select on public_creations to anon,authenticated;
    create policy raw_public_read on public_creations for select using(true);
    insert into auth.users values('${alice}','{"avatar_url":"https://example.invalid/avatar.png"}'),('${bob}','{}');
    insert into profiles values('${alice}'),('${bob}');
    insert into public_creations(id,user_id,prompt) values('${post}','${alice}','Already public');`);
  await db.exec(migration);
});
afterAll(async () => { await db?.close(); });

describe("additive conversation/Explore migration on disposable PostgreSQL", () => {
  it("preserves old publications and defaults new ones to independent privacy", async () => {
    const old = await db.query("select show_prompt,show_settings from public_creations where id=$1", [post]);
    expect(old.rows[0]).toEqual({ show_prompt: true, show_settings: true });
    const fresh = await db.query("insert into public_creations(user_id) values($1) returning show_prompt,show_settings", [bob]);
    expect(fresh.rows[0]).toEqual({ show_prompt: false, show_settings: false });
  });
  it("backfills safe unique handles, synchronizes avatars and rejects duplicate usernames", async () => {
    const profiles = await db.query<{ username: string; avatar_url: string | null }>("select username,avatar_url from profiles order by id");
    expect(profiles.rows[0]).toMatchObject({ username: "maro_111111111111411181111111", avatar_url: "https://example.invalid/avatar.png" });
    expect(new Set(profiles.rows.map(row => row.username)).size).toBe(2);
    await db.query("update profiles set username='erzenology' where id=$1", [alice]);
    await expect(db.query("update profiles set username='erzenology' where id=$1", [bob])).rejects.toThrow();
    await expect(db.query("update profiles set username='bad space' where id=$1", [bob])).rejects.toThrow();
    await expect(db.query("update profiles set username='admin' where id=$1", [bob])).rejects.toThrow();
  });
  it("writes only owner-verified visible inputs and never compiled private instructions", async () => {
    const snapshot = { userId: alice, workspaceId: "workspace-a", conversationId: chat,
      references: [{ id: `storage:generations/${alice}/a.png`, digest: "not copied" }], logoWizard: { brand: { name: "Logo" } } };
    await db.query("insert into generation_jobs values($1,$2,$3)", [job, alice, JSON.stringify({ v1_request: snapshot, compiled_prompt: "PRIVATE" })]);
    const result = await db.query("insert into generations(job_id,user_id,workspace_id,kind) values($1,$2,'workspace-a','image') returning conversation_id,input_refs,logo_wizard", [job, alice]);
    expect(result.rows[0]).toEqual({ conversation_id: chat, input_refs: [`storage:generations/${alice}/a.png`], logo_wizard: snapshot.logoWizard });
    expect(JSON.stringify(result.rows)).not.toContain("PRIVATE");
    await expect(db.query("insert into generations(job_id,user_id,workspace_id,kind) values($1,$2,'workspace-b','image')", [job, alice])).rejects.toThrow("invalid_conversation_owner");
  });
  it("save/un-save is idempotent and cannot produce negative counters", async () => {
    const save = (add: boolean) => db.query<{ count: number }>("select toggle_creation_save($1,$2,$3) as count", [bob, post, add]);
    expect((await save(true)).rows[0].count).toBe(1);
    expect((await save(true)).rows[0].count).toBe(1);
    expect((await save(false)).rows[0].count).toBe(0);
    expect((await save(false)).rows[0].count).toBe(0);
  });
  it("deduplicates a visitor per day and counts another visitor separately", async () => {
    const view = (hash: string) => db.query<{ count: number }>("select record_creation_view($1,$2) as count", [post, hash.repeat(64)]);
    expect((await view("a")).rows[0].count).toBe(1);
    expect((await view("a")).rows[0].count).toBe(1);
    expect((await view("b")).rows[0].count).toBe(2);
  });
  it("a removed publication can be restored and cannot collect new saves/views", async () => {
    await db.query("update public_creations set deleted_at=now() where id=$1", [post]);
    await expect(db.query("select record_creation_view($1,$2)", [post, "c".repeat(64)])).rejects.toThrow("creation_not_found");
    await expect(db.query("select toggle_creation_save($1,$2,true)", [bob, post])).rejects.toThrow("creation_not_found");
    await db.query("update public_creations set deleted_at=null where id=$1", [post]);
    expect((await db.query("select toggle_creation_save($1,$2,true) as count", [bob, post])).rows[0]).toEqual({ count: 1 });
  });
  it("denies raw prompt access and privileged engagement RPCs to public/browser roles", async () => {
    const permissions = await db.query("select has_table_privilege('anon','public_creations','select') as raw_read,has_function_privilege('authenticated','toggle_creation_save(uuid,uuid,boolean)','execute') as browser_write,has_function_privilege('service_role','record_creation_view(uuid,text)','execute') as server_write");
    expect(permissions.rows[0]).toEqual({ raw_read: false, browser_write: false, server_write: true });
  });
  it("can run again without overwriting username or post privacy choices", async () => {
    await db.query("update public_creations set show_prompt=false,show_settings=true where id=$1", [post]);
    await db.exec(migration);
    expect((await db.query("select username from profiles where id=$1", [alice])).rows[0]).toEqual({ username: "erzenology" });
    expect((await db.query("select show_prompt,show_settings from public_creations where id=$1", [post])).rows[0]).toEqual({ show_prompt: false, show_settings: true });
  });
});
