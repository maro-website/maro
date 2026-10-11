import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

describe("private, expiring online presence", () => {
  it("deduplicates a visitor, counts guests and logins, expires old sessions, and denies client access", async () => {
    const db = new PGlite();
    try {
      await db.exec("create role anon; create role authenticated; create role service_role;");
      await db.exec(readFileSync("supabase/migrations/0065_online_presence.sql", "utf8"));
      const guest = "a".repeat(64), user = "b".repeat(64), stale = "c".repeat(64);
      await db.query("select touch_online_presence($1,false),touch_online_presence($2,true)", [guest, user]);
      await db.query("select touch_online_presence($1,false),touch_online_presence($1,false)", [guest]);
      const count = () => db.query<{ result: { total: number; signedIn: number; guests: number; windowSeconds: number } }>("select admin_online_presence() result");
      expect((await count()).rows[0].result).toMatchObject({ total: 2, signedIn: 1, guests: 1, windowSeconds: 120 });
      await db.query("insert into online_presence values($1,false,now()-interval '121 seconds')", [stale]);
      expect((await count()).rows[0].result.total).toBe(2);
      expect((await db.query<{ n: number }>("select count(*) n from online_presence")).rows[0].n).toBe(2);
      await db.query("update online_presence set last_seen=now()-interval '121 seconds'");
      expect((await count()).rows[0].result).toMatchObject({ total: 0, signedIn: 0, guests: 0 });
      await expect(db.query("select touch_online_presence('invalid',false)")).rejects.toThrow("invalid_presence");
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`set role ${role}`);
        await expect(db.query("select * from online_presence")).rejects.toThrow(/permission denied/);
        await expect(db.query("select touch_online_presence($1,false)", [guest])).rejects.toThrow(/permission denied/);
        await expect(count()).rejects.toThrow(/permission denied/);
        await db.exec("reset role");
      }
      expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='online_presence'::regclass")).rows[0].relrowsecurity).toBe(true);
      expect((await db.query<{ permitted: boolean }>("select has_function_privilege('service_role','admin_online_presence()','EXECUTE') permitted")).rows[0].permitted).toBe(true);
    } finally { await db.close(); }
  });
});
