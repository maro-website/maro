import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const mood = "c7130000-0000-4000-8000-000000000001";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${owner}'); create table generations(id integer); insert into generations values(42);`);
  await db.exec(readFileSync("supabase/migrations/0067_maro_moods_private_beta.sql", "utf8"));
});
afterAll(async () => { await db?.close(); });
describe("maroMood additive storage and access", () => {
  it("preserves existing data and seeds two ordered moods", async () => {
    expect((await db.query("select * from generations")).rows).toEqual([{ id: 42 }]);
    expect((await db.query("select title from maro_moods order by sort_order")).rows).toEqual([{ title: "Halloween Mood" }, { title: "28 Nëntori Mood" }]);
  });
  it.each(["anon", "authenticated"])("prevents direct %s reads/writes including private instructions", async role => {
    await db.exec(`set role ${role}`);
    try {
      await expect(db.query("select prompt from maro_moods")).rejects.toThrow("permission denied");
      await expect(db.query("select * from maro_mood_saves")).rejects.toThrow("permission denied");
      await expect(db.query("update maro_moods set active=true")).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
  });
  it("saves idempotently and cascades only the deleted mood's saves", async () => {
    await db.query("insert into maro_mood_saves(user_id,mood_id) values($1,$2) on conflict do nothing", [owner, mood]);
    await db.query("insert into maro_mood_saves(user_id,mood_id) values($1,$2) on conflict do nothing", [owner, mood]);
    expect((await db.query("select * from maro_mood_saves")).rows).toHaveLength(1);
    await db.query("delete from maro_moods where id=$1", [mood]);
    expect((await db.query("select * from maro_mood_saves")).rows).toHaveLength(0);
    expect((await db.query("select * from maro_moods")).rows).toHaveLength(1);
  });
});
