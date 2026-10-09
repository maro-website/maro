import {PGlite} from "@electric-sql/pglite";
import {pg_trgm} from "@electric-sql/pglite/contrib/pg_trgm";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {expect,it} from "vitest";
it("recreates all captured public objects in an empty database and refuses a second application",async()=>{
  const db=new PGlite({extensions:{pg_trgm}});
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create role supabase_admin; create role supabase_auth_admin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select null::uuid$$;
      create function auth.role() returns text language sql as $$select 'service_role'::text$$;
      create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;
      grant usage on schema public,auth to anon,authenticated,service_role;`);
    const baseline=readFileSync("docs/db-history/v1-baseline-20261009.sql","utf8");
    await db.exec(baseline);
    expect((await db.query("select count(*)::integer as n from pg_tables where schemaname='public'")).rows).toEqual([{n:73}]);
    expect((await db.query("select count(*)::integer as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'")).rows).toEqual([{n:96}]);
    expect((await db.query("select count(*)::integer as n from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal")).rows).toEqual([{n:7}]);
    const snapshot=JSON.parse(readFileSync("docs/evidence/schema-baseline-20261009.json","utf8"));
    const functions=await db.query<{signature:string;body_md5:string;anon_execute:boolean;user_execute:boolean}>("select p.oid::regprocedure::text as signature,md5(p.prosrc) as body_md5,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as user_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.oid::regprocedure::text");
    const sort=(a:{signature:string},b:{signature:string})=>a.signature<b.signature?-1:a.signature>b.signature?1:0;
    expect(functions.rows.sort(sort)).toEqual(snapshot.functions.map((f:{signature:string;definition:string;body_md5:string;anon_execute:boolean;user_execute:boolean})=>{
      const body=f.definition.match(/AS \$(\w*)\$([\s\S]*)\$\1\$\s*$/)?.[2];
      const md5=body===undefined?f.body_md5:createHash('md5').update(body.replaceAll('\r\n','\n')).digest('hex');
      return {signature:f.signature,body_md5:md5,anon_execute:f.anon_execute,user_execute:f.user_execute};
    }).sort(sort));
    await expect(db.exec(baseline)).rejects.toThrow(/baseline_requires_empty_public_schema/);
    await db.exec("rollback");
  } finally {await db.close();}
},60000);
