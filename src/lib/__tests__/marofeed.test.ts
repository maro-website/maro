import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { buildFeedPrompt, canUseFeed, categoryIds, defaultConfig, briefSchema, createFeedSchema, roles } from "@/lib/feed/model";
import { imageZip } from "@/lib/feed/zip";
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const reference = `storage:generations/${owner}/refs/product.png`;
const brief = briefSchema.parse({ brand: "NOMA", description: "A real fruit drink with the supplied label", audience: "Design lovers", goal: "sales", language: "sq", colors: "#446633", notes: "No invented ingredients" });
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
  return db;
}
const create = async (db: PGlite, request = randomUUID(), user = owner, workspace = "ws_feed", ref = reference) => (await db.query<{ id: string }>("select maro_feed_create($1,$2,$3,$4,'drinks',$5,'',$6) id", [user, workspace, request, ref, brief, defaultConfig])).rows[0].id;
const claim = async (db: PGlite, id: string, slot: number, regen = false, request = randomUUID()) => (await db.query<{ result: { claimed: boolean; attempt: { id: string; job_id: string; free_regen: boolean } } }>("select maro_feed_claim($1,$2,$3,$4,$5,'','gpt-image-2.5-flare') result", [owner, id, request, slot, regen])).rows[0].result;
const balance = async (db: PGlite) => (await db.query<{ credits: number; credits_reserved: number }>("select credits,credits_reserved from profiles where id=$1", [owner])).rows[0];
async function store(db: PGlite, attempt: { id: string; job_id: string }) {
  await db.query("insert into pricing_snapshots(job_id,user_id,kind,snapshot) values($1,$2,'generation','{\"record_type\":\"maro_feed_execution\"}')", [attempt.job_id, owner]);
  await db.query("insert into storage.objects values('generations',$1,'{\"size\":100}')", [`${owner}/${attempt.job_id}/output.png`]);
  return (await db.query<{ id: string }>("select maro_feed_finish($1) id", [attempt.id])).rows[0].id;
}
describe("maroFeed campaign contract", () => {
  it("keeps the pilot exact and requires a product plus explicit Brain opt-in", () => {
    expect(canUseFeed(" ERZEN@nice.al ")).toBe(true); expect(canUseFeed("other@nice.al")).toBe(false); expect(canUseFeed()).toBe(false);
    expect(createFeedSchema.safeParse({ requestId: randomUUID(), workspaceId: "ws_feed", category: "drinks", reference: "https://evil.test/image", useBrain: false, brief }).success).toBe(false);
    expect(roles).toHaveLength(9); expect(new Set(roles.map(r => r.layout)).size).toBe(9);
  });
  it.each(categoryIds)("gives %s nine distinct roles with a shared product/style contract and no caption call", category => {
    const prompts = roles.map((_, slot) => buildFeedPrompt({ config: defaultConfig, brief, category, slot, brain: "", variant: 1, hasStyleReference: slot > 0 }));
    expect(new Set(prompts).size).toBe(9);
    for (const prompt of prompts) { expect(prompt).toContain(defaultConfig.directions[category]); expect(prompt).toContain("exact identity"); expect(prompt).toContain("No captions."); expect(prompt).not.toContain("undefined"); }
    expect(prompts[1]).toContain("Do NOT copy");
  });
  it("writes valid ZIP directory offsets, file size and CRC32 without altering PNG bytes", () => {
    const zip = Buffer.from(imageZip([{ name: "maroFeed-01.png", bytes: Buffer.from("123456789") }]));
    expect(zip.readUInt32LE(0)).toBe(0x04034b50); expect(zip.readUInt32LE(14)).toBe(0xcbf43926);
    expect(zip.readUInt32LE(18)).toBe(9); expect(zip.subarray(30 + "maroFeed-01.png".length, 30 + "maroFeed-01.png".length + 9).toString()).toBe("123456789");
    const end = zip.length - 22; expect(zip.readUInt32LE(end)).toBe(0x06054b50); expect(zip.readUInt32LE(zip.readUInt32LE(end + 16))).toBe(0x02014b50);
  });
});
describe("maroFeed production ledger integration", () => {
  it("charges exactly 50 once, serializes steps, completes nine images, grants three free regens then charges five; failures retain originals and return the hold", async () => {
    const db = await database();
    try {
      const request = randomUUID(), id = await create(db, request); expect(await create(db, request)).toBe(id); expect(await balance(db)).toEqual({ credits: 450, credits_reserved: 0 });
      const firstRequest = randomUUID(), first = await claim(db, id, 0, false, firstRequest);
      expect((await claim(db, id, 0, false, firstRequest)).claimed).toBe(false);
      await expect(claim(db, id, 1)).rejects.toThrow("feed_busy");
      await expect(db.query("select maro_feed_finish($1)", [first.attempt.id])).rejects.toThrow("durable_output_missing");
      const firstGeneration = await store(db, first.attempt);
      expect((await db.query("select maro_feed_finish($1) id", [first.attempt.id])).rows).toEqual([{ id: firstGeneration }]);
      await expect(claim(db, id, 0)).rejects.toThrow("slot_complete");
      await expect(claim(db, id, 0, true)).rejects.toThrow("feed_not_complete");
      for (let slot = 1; slot < 9; slot++) await store(db, (await claim(db, id, slot)).attempt);
      expect(await balance(db)).toEqual({ credits: 450, credits_reserved: 0 });
      // A failed free regeneration restores its free allowance.
      const failed = (await claim(db, id, 0, true)).attempt;
      await db.query("select maro_feed_recover($1,$2,$3)", [owner, id, failed.id]);
      expect((await db.query("select free_used from maro_feeds where id=$1", [id])).rows).toEqual([{ free_used: 0 }]);
      expect((await db.query("select generation_id from maro_feed_attempts where id=$1", [first.attempt.id])).rows).toEqual([{ generation_id: firstGeneration }]);
      for (let i = 0; i < 3; i++) { const a = await claim(db, id, i, true); expect(a.attempt.free_regen).toBe(true); await store(db, a.attempt); }
      const paid = await claim(db, id, 0, true); expect(paid.attempt.free_regen).toBe(false); expect(await balance(db)).toEqual({ credits: 445, credits_reserved: 5 });
      await db.query("select maro_feed_recover($1,$2,$3)", [owner, id, paid.attempt.id]);
      expect(await balance(db)).toEqual({ credits: 450, credits_reserved: 0 });
      const paidSuccess = await claim(db, id, 0, true); await store(db, paidSuccess.attempt);
      expect(await balance(db)).toEqual({ credits: 445, credits_reserved: 0 });
      await expect(db.query("select maro_feed_refund($1,$2)", [owner, id])).rejects.toThrow("refund_unavailable");
      expect((await db.query("select count(*)::integer n from credit_transactions where type='charge'")).rows).toEqual([{ n: 2 }]);
      expect((await db.query("select master_prompt from app_settings where id=1")).rows).toEqual([{ master_prompt: "PRIVATE EXISTING PROMPT" }]);
    } finally { await db.close(); }
  }, 60000);
  it("denies other users and direct clients, refunds empty feeds once, recovers stored output after a lost response and fails stale work without provider retries", async () => {
    const db = await database();
    try {
      await expect(create(db, randomUUID(), other, "ws_other", `storage:generations/${other}/product.png`)).rejects.toThrow("feed_not_available");
      await expect(create(db, randomUUID(), owner, "ws_other")).rejects.toThrow("workspace_not_found");
      await expect(create(db, randomUUID(), owner, "ws_feed", `storage:generations/${other}/product.png`)).rejects.toThrow("invalid_request");
      const id = await create(db); const a = await claim(db, id, 0);
      await expect(db.query("select maro_feed_refund($1,$2)", [owner, id])).rejects.toThrow("refund_unavailable");
      await db.query("update maro_feed_attempts set created_at=now()-interval '16 minutes' where id=$1", [a.attempt.id]);
      await db.query("select maro_feed_recover($1,$2)", [owner, id]);
      await db.query("update profiles set generation_paused=true where id=$1", [owner]);
      await db.query("select maro_feed_refund($1,$2)", [owner, id]); await db.query("select maro_feed_refund($1,$2)", [owner, id]);
      expect(await balance(db)).toEqual({ credits: 500, credits_reserved: 0 });
      await db.query("update profiles set generation_paused=false where id=$1", [owner]);
      await expect(claim(db, id, 0)).rejects.toThrow("feed_refunded");
      const second = await create(db); const pending = (await claim(db, second, 0)).attempt;
      await db.query("insert into pricing_snapshots(job_id,user_id,kind,snapshot) values($1,$2,'generation','{\"record_type\":\"maro_feed_execution\"}')", [pending.job_id, owner]);
      await db.query("insert into storage.objects values('generations',$1,'{\"size\":100}')", [`${owner}/${pending.job_id}/output.png`]);
      await db.query("select maro_feed_recover($1,$2)", [owner, second]);
      expect((await db.query("select status from maro_feed_attempts where id=$1", [pending.id])).rows).toEqual([{ status: "completed" }]);
      await db.exec("set role authenticated;set request.jwt.claim.role='authenticated'");
      await expect(db.query("select * from maro_feeds")).rejects.toThrow("permission denied");
      await expect(db.query("select maro_feed_refund($1,$2)", [owner, id])).rejects.toThrow("permission denied");
      await db.exec("reset role");
    } finally { await db.close(); }
  }, 60000);
});
