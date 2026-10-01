import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catalog-verified production RLS expressions on synthetic local data", () => {
  it("isolates two users' workspaces, history, jobs and private compiled prompts", async () => {
    const db = new PGlite();
    const owner = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    const evidence = JSON.parse(readFileSync("docs/evidence/production-contract-20260930.json", "utf8"));
    const tables = ["profiles", "workspaces", "generations", "generation_jobs", "generation_internal_prompts"];
    try {
      await db.exec(`create role authenticated; create schema auth;
        create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        create function public.is_admin() returns boolean language sql as $$select false$$;
        create function public.has_admin_access() returns boolean language sql as $$select false$$;
        create table profiles(id uuid); create table workspaces(id text,owner_id uuid);
        create table generations(id text,user_id uuid); create table generation_jobs(id text,user_id uuid);
        create table generation_internal_prompts(id text,user_id uuid,prompt text);
        grant usage on schema public,auth to authenticated;
        grant select,update on all tables in schema public to authenticated;
        insert into profiles values('${owner}'),('${other}');
        insert into workspaces values('owned','${owner}'),('foreign','${other}');
        insert into generations values('owned','${owner}'),('foreign','${other}');
        insert into generation_jobs values('owned','${owner}'),('foreign','${other}');
        insert into generation_internal_prompts values('owned','${owner}','PRIVATE'),('foreign','${other}','PRIVATE');`);
      for (const table of tables) {
        expect(evidence.rls.find((r: { table: string }) => r.table === table).enabled).toBe(true);
        await db.exec(`alter table ${table} enable row level security`);
        for (const policy of evidence.policies.filter((p: { tablename: string }) => p.tablename === table)) {
          // Catalog names/expressions are data from the verified query, not app
          // instructions; use these only inside disposable local PostgreSQL.
          const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
          await db.exec(`create policy ${quote(policy.policyname)} on ${quote(table)} for ${policy.cmd} to public${policy.qual ? ` using (${policy.qual})` : ""}${policy.with_check ? ` with check (${policy.with_check})` : ""}`);
        }
      }
      await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`);
      for (const table of ["workspaces", "generations", "generation_jobs"]) {
        expect((await db.query(`select id from ${table}`)).rows).toEqual([{ id: "owned" }]);
      }
      expect((await db.query("select * from generation_internal_prompts")).rows).toEqual([]);
      expect((await db.query("update workspaces set id='hijacked' where id='foreign' returning id")).rows).toEqual([]);
      await expect(db.query(`update workspaces set owner_id='${other}' where id='owned'`)).rejects.toThrow(/row-level security/);
    } finally { await db.close(); }
  });
});
