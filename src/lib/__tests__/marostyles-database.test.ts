import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text); insert into auth.users values('${owner}','erzen@nice.al'); create table generations(id integer); insert into generations values(42);`);
  await db.exec(readFileSync("supabase/migrations/0067_maro_moods_private_beta.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/0080_maro_styles_community.sql", "utf8"));
});
afterAll(async () => { await db?.close(); });
describe("locally prepared community styles migration", () => {
  it("preserves legacy prompts, covers, ordering and customer data and attributes them to Erzen", async () => {
    const rows = (await db.query("select source,status,created_by,publisher_name,active from maro_moods order by sort_order")).rows;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ source: "platform", status: "approved", created_by: owner, publisher_name: "Erzen", active: true });
    expect((await db.query("select * from generations")).rows).toEqual([{ id: 42 }]);
    expect((await db.query("select prompt from maro_moods where sort_order=0")).rows[0]).toMatchObject({ prompt: expect.stringContaining("Halloween") });
  });
  it.each(["anon", "authenticated"])("keeps every column including hidden prompts inaccessible to %s", async role => {
    await db.exec(`set role ${role}`);
    try {
      await expect(db.query("select prompt,input_text from maro_moods")).rejects.toThrow("permission denied");
      await expect(db.query("update maro_moods set status='approved'")).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
  });
  it("cannot activate unapproved content even with a faulty server update", async () => {
    await expect(db.query("insert into maro_moods(title,prompt,active) values('Pending','hidden',true)")).rejects.toThrow("maro_styles_approval_gate");
  });
  it("deduplicates a creator's request and retains original input separately from hidden output", async () => {
    const request = "22222222-2222-4222-8222-222222222222";
    const input = "  Dritë e ngrohtë\nMe hije të buta  ";
    await db.query("insert into maro_moods(title,prompt,input_text,created_by,request_id,visibility) values('Sunset','SECRET',$1,$2,$3,'private')", [input, owner, request]);
    await expect(db.query("insert into maro_moods(title,prompt,created_by,request_id) values('Duplicate','hidden',$1,$2)", [owner, request])).rejects.toThrow("maro_styles_request_idx");
    expect((await db.query("select input_text,status,active from maro_moods where request_id=$1", [request])).rows).toEqual([{ input_text: input, status: "pending", active: false }]);
  });
});
