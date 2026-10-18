import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const owner = "fec01baa-8451-4112-84fb-8552f8b31686", other = "22222222-2222-4222-8222-222222222222";
const prefix = `${owner}/workspace-assets/ws_test/`;
const migration = readFileSync("supabase/migrations/0071_private_brain_studio_library.sql","utf8");
const mcp = readFileSync("supabase/migrations/0068_maro_mcp_products.sql","utf8");
const profile = { brand: { name: "Keep brand", logoStorageRef: `storage:generations/${prefix}logo.png`, logoUrl: `storage:generations/${prefix}logo.png` }, target: { audience: "Erase this audience" }, goal: { primaryGoal: "Keep goals" } };
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema storage;
    create table auth.users(id uuid primary key,email text);insert into auth.users values('${owner}','erzen@nice.al'),('${other}','other@test.invalid');
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
    create table memberships(user_id uuid,plan_id text,started_at timestamptz,expires_at timestamptz,suspended boolean default false);
    create table workspaces(id text primary key,owner_id uuid,name text,brain_profile jsonb default '{}',brand_name text,brand_logo_url text,icon_url text);
    create table workspace_sources(id text primary key,workspace_id text references workspaces(id),owner_id uuid,name text,keywords text,file_url text,mime_type text,created_at timestamptz default now());
    create table public_creations(slug text,user_id uuid);
    create table storage.objects(bucket_id text,name text,metadata jsonb,user_metadata jsonb,primary key(bucket_id,name));
    set request.jwt.claim.role='service_role';
    insert into workspaces(id,owner_id,name) values('ws_test','${owner}','Keep workspace'),('ws_second','${owner}','Other workspace'),('ws_foreign','${other}','Foreign');`);
  await db.exec(readFileSync("supabase/migrations/0050_brain_retention_account_storage.sql","utf8"));
  await db.exec(mcp.slice(mcp.indexOf("create table public.maro_brain_profile_versions"),mcp.indexOf("create function public.maro_mcp_brain_authorization")));
  await db.exec(mcp.match(/create function public\.maro_mcp_remember\([\s\S]*?end; \$\$;/)![0]);
  await db.exec(migration);
  await db.exec(`insert into memberships values('${owner}','pro',now()-interval '1 day',now()+interval '29 days',false)`);
  await db.query("select maro_account_policy($1,'ws_test')",[owner]);
  await db.query("update workspaces set brain_profile=$1,brand_name='Keep brand',brand_logo_url=$2 where id='ws_test'",[profile,profile.brand.logoStorageRef]);
  await db.exec(`insert into maro_brain_memories(workspace_id,owner_id,memory_key,content,source) values('ws_test','${owner}','fact','Keep memory','Manual');
    insert into storage.objects values('generations','${prefix}logo.png','{"size":100}',null),('generations','${prefix}photo.png','{"size":200}',null),('generations','${prefix}orphan.png','{"size":300}',null),('generations','${owner}/job/generated.png','{"size":400}',null);
    insert into workspace_sources(id,workspace_id,owner_id,name,keywords,file_url) values('source','ws_test','${owner}','Photo','test','storage:generations/${prefix}photo.png');`);
  await db.exec(readFileSync("supabase/migrations/0073_brain_studio_public_rollout.sql","utf8"));
  return db;
}
const library = (db:PGlite,action:string,payload:unknown,reset:string|null=null,workspace="ws_test") => db.query("select maro_studio_library($1,$2,$3,$4,$5)",[owner,workspace,reset,action,payload]);
const clear = (db:PGlite,section:string,expected:unknown=profile,ids:string[]=["source"]) => db.query("select maro_studio_clear($1,'ws_test',null,$2,$3,$4)",[owner,section,expected,ids]);
const count = async(db:PGlite,table:string) => Number((await db.query<{n:number}>(`select count(*) n from ${table}`)).rows[0].n);

describe("Brain library and irreversible category clears", () => {
  it.each(["standard","pro"])("allows a different %s member to manage only their own Brain after rollout", async plan => {
    const db=await setup();try {
      await db.query("insert into memberships values($1,$2,now()-interval '1 day',now()+interval '29 days',false)",[other,plan]);
      await db.query("select maro_studio_lock($1,'ws_foreign',null)",[other]);
      await db.query("select maro_studio_library($1,'ws_foreign',null,'create_folder',$2)",[other,{id:"member_folder",name:"My products"}]);
      await db.query("select maro_studio_remember($1,'ws_foreign',null,'rule','Member-owned rule','Manual',0)",[other]);
      expect((await db.query("select owner_id,name from maro_brain_folders where id='member_folder'")).rows).toEqual([{owner_id:other,name:"My products"}]);
      expect((await db.query("select owner_id,content from maro_brain_memories where workspace_id='ws_foreign'")).rows).toEqual([{owner_id:other,content:"Member-owned rule"}]);
      await expect(db.query("select maro_studio_library($1,'ws_test',null,'create_folder',$2)",[other,{id:"bad",name:"Foreign"}])).rejects.toThrow(/WORKSPACE_NOT_FOUND/i);
      await db.query("select maro_studio_clear($1,'ws_foreign',null,'target','{}'::jsonb,array[]::text[])",[other]);
      expect((await db.query("select brain_profile from workspaces where id='ws_test'")).rows).toEqual([{brain_profile:profile}]);
      expect((await db.query("select content from maro_brain_memories where workspace_id='ws_test'")).rows).toEqual([{content:"Keep memory"}]);
    }finally{await db.close();}
  });
  it("adds storage-backed sources and scoped folders, preserving all data during migration", async() => {
    const db=await setup();try {
      expect(await count(db,"workspace_sources")).toBe(1); expect(await count(db,"maro_brain_memories")).toBe(1);
      await library(db,"create_folder",{id:"folder",name:"Products"});
      await library(db,"add_source",{id:"new",name:"Logo reference",keywords:"product",storageRef:profile.brand.logoStorageRef,mimeType:"image/png",folderId:"folder"});
      expect((await db.query("select folder_id from workspace_sources where id='new'")).rows).toEqual([{folder_id:"folder"}]);
      await library(db,"edit_source",{ids:["new"],name:"Updated",keywords:"new, words"});
      await library(db,"delete_folder",{folderId:"folder"});
      expect((await db.query("select folder_id,name from workspace_sources where id='new'")).rows).toEqual([{folder_id:null,name:"Updated"}]);
      expect(await count(db,"storage.objects")).toBe(4);
    } finally{await db.close();}
  });
  it("denies foreign workspaces, unpaid writes, unsafe refs and cross-workspace folders",async()=>{
    const db=await setup();try{
      await expect(library(db,"create_folder",{id:"x",name:"No"},null,"ws_foreign")).rejects.toThrow(/workspace_not_found/i);
      await expect(db.query("select maro_studio_lock($1,'ws_foreign',null)",[other])).rejects.toThrow("BRAIN_PLAN_REQUIRED");
      await library(db,"create_folder",{id:"foreign-folder",name:"Other"},null,"ws_second");
      await expect(library(db,"move_sources",{ids:["source"],folderId:"foreign-folder"})).rejects.toThrow("FOLDER_NOT_FOUND");
      for(const ref of [`storage:generations/${other}/workspace-assets/ws_test/file.png`,`storage:generations/${prefix}missing.png`,`storage:generations/${prefix}../job/generated.png`]){
        await expect(library(db,"add_source",{id:"bad",name:"Bad",keywords:"",storageRef:ref,mimeType:"image/png"})).rejects.toThrow("INVALID_REQUEST");
      }
      await db.exec("delete from memberships"); await expect(library(db,"create_folder",{id:"no",name:"No"})).rejects.toThrow("BRAIN_PLAN_REQUIRED");
      await db.exec("set role authenticated"); await expect(db.query("select maro_studio_lock($1,'ws_test',null)",[owner])).rejects.toThrow("permission denied");
    }finally{await db.close();}
  });
  it("deletes selected references and queues physical files, retaining a shared logo and unchanged account quota until storage removes it",async()=>{
    const db=await setup();try{
      await library(db,"add_source",{id:"shared",name:"Shared logo",keywords:"",storageRef:profile.brand.logoStorageRef,mimeType:"image/png"});
      await library(db,"delete_sources",{ids:["shared"]});expect(await count(db,"brain_retention_files")).toBe(0);
      await library(db,"delete_sources",{ids:["source"]});
      expect((await db.query("select path from brain_retention_files")).rows).toEqual([{path:prefix+"photo.png"}]);
      const used=async()=>((await db.query<{v:{usedBytes:number}}>("select maro_account_policy($1) v",[owner])).rows[0].v.usedBytes);
      expect(await used()).toBe(1000); await db.query("delete from storage.objects where name=$1",[prefix+"photo.png"]); expect(await used()).toBe(800);
    }finally{await db.close();}
  });
  it("cleans failed upload attachments without deleting assets used by another source or the current logo",async()=>{
    const db=await setup();try{
      await library(db,"discard_upload",{storageRef:profile.brand.logoStorageRef});
      await library(db,"discard_upload",{storageRef:`storage:generations/${prefix}photo.png`});
      expect(await count(db,"brain_retention_files")).toBe(0);
      await library(db,"discard_upload",{storageRef:`storage:generations/${prefix}orphan.png`});
      expect((await db.query("select path from brain_retention_files")).rows).toEqual([{path:prefix+"orphan.png"}]);
    }finally{await db.close();}
  });
  it("clears only the selected text category and scrubs its history while preserving memories and all other data",async()=>{
    const db=await setup();try{
      await clear(db,"target");
      const row=(await db.query<{brain_profile:typeof profile;brain_reset_at:string;name:string;icon_url:string|null}>("select brain_profile,brain_reset_at,name,icon_url from workspaces where id='ws_test'")).rows[0];
      expect(row.brain_profile).toEqual({brand:profile.brand,goal:profile.goal});expect(row.name).toBe("Keep workspace");expect(row.brain_reset_at).toBeTruthy();
      expect(await count(db,"maro_brain_memories")).toBe(1);expect(await count(db,"workspace_sources")).toBe(1);expect(await count(db,"storage.objects")).toBe(4);
      expect((await db.query<{profile:Record<string,unknown>}>("select profile from maro_brain_profile_versions")).rows.every(row=>!row.profile.target)).toBe(true);
      await expect(library(db,"create_folder",{id:"stale",name:"Old draft"})).rejects.toThrow("BRAIN_REFRESH_REQUIRED");
      await expect(db.query("select maro_studio_remember($1,'ws_test',null,'new','stale memory','Manual',0)",[owner])).rejects.toThrow("BRAIN_REFRESH_REQUIRED");
      expect((await db.query("update workspaces set brain_profile=$1 where id='ws_test' and brain_reset_at is null returning id",[profile])).rows).toEqual([]);
    }finally{await db.close();}
  });
  it("refuses outdated profile/source snapshots without partially clearing anything",async()=>{
    const db=await setup();try{
      await expect(clear(db,"all",{brand:{name:"stale"}})).rejects.toThrow("BRAND_CONFLICT");
      await expect(clear(db,"sources",profile,[])).rejects.toThrow("SOURCE_CONFLICT");
      expect(await count(db,"workspace_sources")).toBe(1);expect(await count(db,"brain_retention_files")).toBe(0);expect(await count(db,"maro_brain_memories")).toBe(1);
    }finally{await db.close();}
  });
  it("clears sources/folders without removing the brand, logo, memories or profile history",async()=>{
    const db=await setup();try{
      await library(db,"create_folder",{id:"folder",name:"Campaign"});
      await clear(db,"sources");expect(await count(db,"workspace_sources")).toBe(0);expect(await count(db,"maro_brain_folders")).toBe(0);expect(await count(db,"maro_brain_memories")).toBe(1);
      expect((await db.query("select brain_profile from workspaces where id='ws_test'")).rows).toEqual([{brain_profile:profile}]);
      expect((await db.query("select path from brain_retention_files")).rows).toEqual([{path:prefix+"photo.png"}]);
      expect(await count(db,"maro_brain_profile_versions")).toBeGreaterThan(0);
    }finally{await db.close();}
  });
  it("clears all memories including their revisions while leaving profile history intact",async()=>{
    const db=await setup();try{
      await db.query("select maro_studio_remember($1,'ws_test',null,'fact','Revision two','Manual',1)",[owner]);
      await clear(db,"memories");expect(await count(db,"maro_brain_memories")).toBe(0);expect(await count(db,"maro_brain_profile_versions")).toBeGreaterThan(0);
      expect((await db.query("select brain_profile from workspaces where id='ws_test'")).rows).toEqual([{brain_profile:profile}]);
    }finally{await db.close();}
  });
  it("starts the whole Brain over including history, folders, references and orphan assets, preserving workspace and generated outputs",async()=>{
    const db=await setup();try{
      await library(db,"create_folder",{id:"folder",name:"Campaign"});await clear(db,"all");
      expect((await db.query("select brain_profile,brand_name,brand_logo_url,name from workspaces where id='ws_test'")).rows).toEqual([{brain_profile:{},brand_name:null,brand_logo_url:null,name:"Keep workspace"}]);
      for(const table of ["workspace_sources","maro_brain_memories","maro_brain_profile_versions","maro_brain_folders"])expect(await count(db,table)).toBe(0);
      expect((await db.query<{path:string}>("select path from brain_retention_files")).rows.map(row=>row.path).sort()).toEqual(["logo.png","photo.png","orphan.png"].map(name=>prefix+name).sort());
      expect(await count(db,"storage.objects")).toBe(4);expect(await count(db,"workspaces")).toBe(3);
    }finally{await db.close();}
  });
  it("preserves files shared with another workspace when clearing this Brain",async()=>{
    const db=await setup();try{
      await db.query("insert into workspace_sources(id,workspace_id,owner_id,name,file_url) values('other-ref','ws_second',$1,'Borrowed',$2)",[owner,`storage:generations/${prefix}photo.png`]);
      await db.query("update workspaces set brand_logo_url=$1 where id='ws_second'",[profile.brand.logoStorageRef]);
      await clear(db,"all");
      expect((await db.query("select path from brain_retention_files")).rows).toEqual([{path:prefix+"orphan.png"}]);
      expect((await db.query("select id from workspace_sources")).rows).toEqual([{id:"other-ref"}]);
    }finally{await db.close();}
  });
  it("clears only brand identity and releases an exclusive logo without touching sources or other categories",async()=>{
    const db=await setup();try{
      await clear(db,"brand");
      expect((await db.query("select path from brain_retention_files")).rows).toEqual([{path:prefix+"logo.png"}]);
      expect((await db.query("select brain_profile from workspaces where id='ws_test'")).rows).toEqual([{brain_profile:{target:profile.target,goal:profile.goal}}]);
      expect(await count(db,"workspace_sources")).toBe(1);expect(await count(db,"maro_brain_memories")).toBe(1);
    }finally{await db.close();}
  });
  it("keeps a full clear response bounded while queueing all assets for the existing cleanup worker",async()=>{
    const db=await setup();try{
      await db.query("insert into storage.objects select 'generations',$1||i||'.png','{\"size\":1}'::jsonb,null from generate_series(1,205) i",[prefix]);
      const result=(await db.query<{v:{paths:string[];cleanupPending:boolean}}>("select maro_studio_clear($1,'ws_test',null,'all',$2,array['source']) v",[owner,profile])).rows[0].v;
      expect(result.paths).toHaveLength(200);expect(result.cleanupPending).toBe(true);expect(await count(db,"brain_retention_files")).toBe(208);
    }finally{await db.close();}
  });
  it("includes folders in the existing 60-day retention reset without leaving broken source references",async()=>{
    const db=await setup();try{
      await library(db,"create_folder",{id:"folder",name:"Old campaign"});await library(db,"move_sources",{ids:["source"],folderId:"folder"});
      await db.exec("delete from memberships;set maro.brain_retention='on';update workspaces set brain_retention_anchor_at=now()-interval '61 days' where id='ws_test';set maro.brain_retention=''");
      await db.query("select maro_account_policy($1,'ws_test')",[owner]);
      expect(await count(db,"maro_brain_folders")).toBe(0);expect(await count(db,"workspace_sources")).toBe(0);expect(await count(db,"maro_brain_memories")).toBe(0);
    }finally{await db.close();}
  });
});
