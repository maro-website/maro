import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
let db: PGlite;
const user = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role authenticator; create role service_role; create role supabase_auth_admin;
    create schema auth; create table auth.users(id uuid primary key);
    create table auth.oauth_clients(id uuid primary key,deleted_at timestamptz);
    create table auth.oauth_authorizations(authorization_id text,client_id uuid,user_id uuid,resource text,status text,approved_at timestamptz,created_at timestamptz);
    create table public.workspaces(id text primary key,owner_id uuid,brain_profile jsonb not null default '{}',brand_name text,brain_reset_at timestamptz);
    create function public.maro_account_policy(uuid,text) returns jsonb language sql as $$ select jsonb_build_object('brainAccess',true) $$;
    insert into auth.users values('${user}'),('${other}'); insert into workspaces(id,owner_id) values('workspace','${user}'),('other','${other}');`);
  await db.exec(readFileSync("supabase/migrations/0068_maro_mcp_products.sql", "utf8"));
});
afterAll(async () => { await db.close(); });
async function scalar(sql: string) { const result = await db.query<{ data: Record<string, unknown> }>(sql); return result.rows[0].data; }
describe("versioned Brain persistence and OAuth boundaries", () => {
  it("saves once on retry and requires a current revision for an edit", async () => {
    const first = await scalar(`select maro_mcp_remember('${user}','workspace','tone','Friendly','User decision',0) as data`);
    const retry = await scalar(`select maro_mcp_remember('${user}','workspace','tone','Friendly','User decision',0) as data`);
    expect(retry.revision).toBe(first.revision);
    await expect(scalar(`select maro_mcp_remember('${user}','workspace','tone','Formal','User decision',0) as data`)).rejects.toThrow("MEMORY_CONFLICT");
    const edit = await scalar(`select maro_mcp_remember('${user}','workspace','tone','Formal','User decision',${first.revision}) as data`);
    const found = await scalar(`select maro_mcp_search_memories('${user}','workspace','',10) as data`);
    expect(found).toEqual([expect.objectContaining({ content: "Formal", revision: edit.revision })]);
  });
  it("does not let an actor write another owner's workspace", async () => {
    await expect(scalar(`select maro_mcp_remember('${other}','workspace','attack','No','Other',0) as data`)).rejects.toThrow("WORKSPACE_NOT_FOUND");
  });
  it("tracks web profile edits and blocks stale MCP updates", async () => {
    await db.exec(`update workspaces set brain_profile='{"content":{"tone":"Clear"}}' where id='workspace';`);
    await expect(scalar(`select maro_mcp_update_brand('${user}','workspace','content','tone','Warm',0) as data`)).rejects.toThrow("BRAND_CONFLICT");
    const result = await db.query<{ revision: number }>("select max(revision)::integer as revision from maro_brain_profile_versions where workspace_id='workspace'");
    const edit = await scalar(`select maro_mcp_update_brand('${user}','workspace','content','tone','Warm',${result.rows[0].revision}) as data`);
    expect(edit.updated).toBe(true);
    await expect(scalar(`select maro_mcp_update_brand('${user}','workspace','brand','logoStorageRef','private',${edit.revision}) as data`)).rejects.toThrow("INVALID_REQUEST");
  });
  it("forgets every version of a fact and clears history on an existing retention reset", async () => {
    const result = await db.query<{ revision: number }>("select max(revision)::integer as revision from maro_brain_memories where workspace_id='workspace' and memory_key='tone'");
    await scalar(`select maro_mcp_forget('${user}','workspace','tone',${result.rows[0].revision}) as data`);
    expect((await db.query("select * from maro_brain_memories where memory_key='tone'")).rows).toHaveLength(0);
    await scalar(`select maro_mcp_remember('${user}','workspace','temporary','Remove me','User',0) as data`);
    await db.exec("update workspaces set brain_reset_at=now(),brain_profile='{}' where id='workspace'");
    expect((await db.query("select * from maro_brain_memories where workspace_id='workspace'")).rows).toHaveLength(0);
    expect((await db.query("select * from maro_brain_profile_versions where workspace_id='workspace'")).rows).toHaveLength(0);
  });
  it("does not grant direct browser roles access to the new tables or RPCs", async () => {
    const data = await db.query<{ permitted: boolean }>("select has_table_privilege('authenticated','public.maro_brain_memories','SELECT') or has_function_privilege('anon','public.maro_mcp_remember(uuid,text,text,text,text,bigint)','EXECUTE') as permitted");
    expect(data.rows[0].permitted).toBe(false);
  });
  it("leaves browser tokens untouched and binds approved Brain clients across refreshes", async () => {
    const direct = await scalar(`select maro_mcp_custom_access_token_hook('{"claims":{"sub":"${user}","aud":"authenticated"}}') as data`);
    expect(direct).toEqual({ claims: { sub: user, aud: "authenticated" } });
    const client = "00000000-0000-4000-8000-000000000003";
    await db.exec(`insert into auth.oauth_authorizations values('approved','${client}','${user}','https://maro.al/api/mcp/brain','approved',now(),now());`);
    const oauth = await scalar(`select maro_mcp_custom_access_token_hook('{"claims":{"sub":"${user}","aud":"authenticated","client_id":"${client}"}}') as data`);
    expect(oauth.claims).toMatchObject({ aud: "https://maro.al/api/mcp/brain", role: "maro_mcp", maro_mcp_permissions: ["account:read","brain:read","brain:write"] });
    await db.exec("delete from auth.oauth_authorizations where authorization_id='approved'");
    const refresh = await scalar(`select maro_mcp_custom_access_token_hook('{"claims":{"sub":"${user}","aud":"authenticated","client_id":"${client}"}}') as data`);
    expect(refresh).toEqual(oauth);
  });
});
