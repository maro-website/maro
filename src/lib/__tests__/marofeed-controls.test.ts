import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { buildFeedPrompt, createFeedSchema, defaultConfig, contentTypes, feedRole, type FeedContentType } from "@/lib/feed/model";
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const reference = `storage:generations/${owner}/refs/product.png`;
const brief = { brand: "NOMA", description: "Real product with accurate packaging", audience: "", goal: "sales" as const, language: "sq" as const, colors: "", notes: "" };
const sql = (file: string) => readFileSync(`supabase/migrations/${file}`, "utf8");
async function database() {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_admin;create role supabase_auth_admin;
    create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
    create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;
    grant usage on schema public,auth to anon,authenticated,service_role;`);
  await db.exec(readFileSync("docs/db-history/v1-baseline-20261009.sql", "utf8"));
  await db.exec(`create schema storage;create table storage.objects(bucket_id text,name text,metadata jsonb,primary key(bucket_id,name));
    create table storage.buckets(id text primary key,file_size_limit bigint,allowed_mime_types text[]);`);
  await db.exec(sql("0057_v1_security_boundaries.sql")); await db.exec(sql("0058_atomic_generation_accounting.sql"));
  await db.exec(sql("0075_marofeed_private_pilot.sql"));
  await db.exec(`set request.jwt.claim.role='service_role';
    insert into auth.users values('${owner}','erzen@nice.al',now()),('${other}','other@example.test',now());
    insert into profiles(id,email,credits) values('${owner}','erzen@nice.al',500),('${other}','other@example.test',500);
    insert into workspaces(id,owner_id,name) values('ws_feed','${owner}','Feed'),('ws_other','${other}','Other');
    insert into app_settings(id,master_prompt) values(1,'PRIVATE EXISTING PROMPT');
    insert into storage.objects values('generations','${owner}/refs/product.png','{"size":100}');`);
  await db.exec(sql("0076_marofeed_choices_and_cancellation.sql"));
  await db.exec(`update app_settings set platform_limits='{"userHourlyUsd":1000,"userDailyUsd":1000}'`);
  return db;
}
const create = async (db: PGlite, references = [reference], contentType = "mix", textMode = true, request = randomUUID()) =>
  (await db.query<{ id: string }>("select maro_feed_create_v2($1,'ws_feed',$2,$3,'drinks',$4,'',$5,$6,$7) id", [owner, request, references, brief, defaultConfig, contentType, textMode])).rows[0].id;
const claim = async (db: PGlite, id: string, slot: number) => (await db.query<{ a: { attempt: { id: string; job_id: string } } }>("select maro_feed_claim($1,$2,$3,$4,false,'','gpt-image-2.5-flare') a", [owner,id,randomUUID(),slot])).rows[0].a.attempt;
const credits = async (db: PGlite) => (await db.query<{ credits: number }>("select credits from profiles where id=$1", [owner])).rows[0].credits;
const cancel = (db: PGlite, id: string) => db.query("select maro_feed_cancel($1,$2)", [owner,id]);
async function upload(db: PGlite, a: { id: string; job_id: string }, finish = true) {
  await db.query("insert into pricing_snapshots(job_id,user_id,kind,snapshot) values($1,$2,'generation','{\"record_type\":\"maro_feed_execution\"}')", [a.job_id, owner]);
  await db.query("insert into storage.objects values('generations',$1,'{\"size\":100}')", [`${owner}/${a.job_id}/output.png`]);
  if (finish) await db.query("select maro_feed_finish($1)", [a.id]);
}

describe("Apps shared financial lifecycle", () => {
  it("settles durable app output with correct metadata exactly once and preserves Feed behavior", async () => {
    const db = await database();
    try {
      await db.exec(sql("0077_maroapps_private_pilot.sql"));
      const acl = (await db.query<{ allowed: boolean }>("select has_table_privilege('authenticated','public.maro_apps_config','SELECT') allowed")).rows[0];
      expect(acl.allowed).toBe(false);
      const app = { ...brief, mobile: { format: "9:16", devices: ["iphone-18-pro"] } };
      const id = (await db.query<{ id: string }>("select maro_feed_create_v2($1,'ws_feed',$2,$3,'tech',$4,'',$5,'mix',true) id", [owner,randomUUID(),[reference],app,defaultConfig])).rows[0].id;
      const attempt = await claim(db,id,0);
      await upload(db,attempt,false);
      // Lost HTTP response: recovery, rather than the original request, finalizes output.
      await db.query("select maro_feed_recover($1,$2)",[owner,id]);
      await db.query("select maro_feed_finish($1)",[attempt.id]);
      const results = (await db.query<{ prompt: string; selections: { source: string; format: string; devices: string[] } }>("select prompt,selections from generations where job_id=$1",[attempt.job_id])).rows;
      expect(results).toHaveLength(1); expect(results[0].prompt).toBe("maroApps · 1");
      expect(results[0].selections).toMatchObject({ source:"maroApps",format:"9:16",devices:["iphone-18-pro"] });
      await cancel(db,id); await cancel(db,id); expect(await credits(db)).toBe(490);
      await db.exec("update maro_feeds set created_at=now()-interval '2 minutes'");
      const ordinary = await create(db); const a = await claim(db,ordinary,0); await upload(db,a);
      expect((await db.query<{ selections: { source: string } }>("select selections from generations where job_id=$1",[a.job_id])).rows[0].selections.source).toBe("maroFeed");
    } finally { await db.close(); }
  });
});
describe("Feed controls", () => {
  it("accepts up to ten distinct uploads, retains the legacy single-reference request and rejects conflicting or missing references", () => {
    const base = { requestId: randomUUID(), workspaceId: "ws_feed", category: "drinks", useBrain: false, brief };
    expect(createFeedSchema.safeParse({ ...base, reference }).success).toBe(true);
    expect(createFeedSchema.safeParse({ ...base, references: Array.from({length:10}, (_,i)=>reference+i) }).success).toBe(true);
    for (const refs of [[], [reference,reference], Array.from({length:11}, (_,i)=>reference+i)]) expect(createFeedSchema.safeParse({ ...base, references: refs }).success).toBe(false);
    expect(createFeedSchema.safeParse(base).success).toBe(false);
    expect(createFeedSchema.safeParse({ ...base, references: [reference], reference: reference+"other" }).success).toBe(false);
  });
  it.each(contentTypes)("plans nine distinct compositions for %s and gives no-text mode priority over typography or revision requests", contentType => {
    const prompts = Array.from({length:9},(_,slot)=>buildFeedPrompt({ config:defaultConfig,brief,category:"drinks",slot,brain:"",variant:1,hasStyleReference:true,referenceCount:10,contentType,textMode:false,feedback:"Add a large headline" }));
    expect(new Set(prompts).size).toBe(9);
    for (const prompt of prompts) {
      expect(prompt).toContain("TEXT MODE: OFF"); expect(prompt).toContain("Images 2 through 10"); expect(prompt).toContain("Image 11 is the first completed");
      expect(prompt.indexOf("TEXT MODE: OFF")).toBeGreaterThan(prompt.indexOf("Add a large headline"));
    }
    if(contentType!=="mix") expect(Array.from({length:9},(_,i)=>feedRole(i,contentType as FeedContentType).title).every(title=>title===feedRole(0,contentType).title)).toBe(true);
  });
  it("stores multiple references and choices atomically, is idempotent and refuses foreign or missing objects before charging", async () => {
    const db=await database();try {
      await db.query("insert into storage.objects values('generations',$1,'{\"size\":100}')", [`${owner}/refs/second.png`]);
      const second=`storage:generations/${owner}/refs/second.png`;
      for(const refs of [[reference,`storage:generations/${other}/refs/x.png`],[reference,reference+"missing"]]) await expect(create(db,refs)).rejects.toThrow("invalid_request");
      expect(await credits(db)).toBe(500);
      const request=randomUUID(),id=await create(db,[reference,second],"detail",false,request);
      expect(await create(db,[reference,second],"detail",false,request)).toBe(id);
      expect((await db.query("select references_list,content_type,text_mode from maro_feeds where id=$1",[id])).rows).toEqual([{references_list:[reference,second],content_type:"detail",text_mode:false}]);
      expect(await credits(db)).toBe(450);
    }finally{await db.close();}
  });
  it("settles cancellation at exactly 5 + 5 per completed initial image for every count from zero to nine, once only", async () => {
    const db=await database();try {
      for(let n=0;n<=9;n++) {
        await db.exec("update maro_feeds set created_at=now()-interval '2 minutes'");
        const before=await credits(db),id=await create(db);
        for(let slot=0;slot<n;slot++) await upload(db,await claim(db,id,slot));
        await Promise.all([cancel(db,id),cancel(db,id)]);
        const rows=(await db.query<{refund_credits:number;cancelled:boolean}>("select refund_credits,cancelled_at is not null as cancelled from maro_feeds where id=$1",[id])).rows;
        expect(rows).toEqual([{refund_credits:45-5*n,cancelled:true}]);
        expect(await credits(db)).toBe(before-5-5*n);
        expect((await db.query("select count(distinct slot)::int n from maro_feed_attempts where feed_id=$1 and status='completed'",[id])).rows).toEqual([{n}]);
        await expect(claim(db,id,0)).rejects.toThrow("feed_cancelled");
        await db.query("select maro_feed_refund($1,$2)",[owner,id]); expect(await credits(db)).toBe(before-5-5*n);
      }
    }finally{await db.close();}
  },60000);
  it("blocks new work immediately, finishes the one in-flight image and refunds the rest, including durable recovery after a lost response", async () => {
    const db=await database();try {
      const id=await create(db),a=await claim(db,id,0);
      await cancel(db,id);expect(await credits(db)).toBe(450);
      await expect(claim(db,id,1)).rejects.toThrow("feed_cancelled");
      await upload(db,a,false);
      await db.query("select maro_feed_recover($1,$2)",[owner,id]);
      expect(await credits(db)).toBe(490);
      await cancel(db,id);await db.query("select maro_feed_finish($1)",[a.id]);expect(await credits(db)).toBe(490);
      expect((await db.query("select status from maro_feed_attempts where id=$1",[a.id])).rows).toEqual([{status:"completed"}]);
      await db.exec("update maro_feeds set created_at=now()-interval '2 minutes'");
      const failed=await create(db),pending=await claim(db,failed,0);await cancel(db,failed);
      await db.query("select maro_feed_recover($1,$2,$3)",[owner,failed,pending.id]);expect(await credits(db)).toBe(485);
      await db.exec("set role authenticated;set request.jwt.claim.role='authenticated'");
      await expect(cancel(db,failed)).rejects.toThrow("permission denied");
      await db.exec("reset role");
    }finally{await db.close();}
  },60000);
});
