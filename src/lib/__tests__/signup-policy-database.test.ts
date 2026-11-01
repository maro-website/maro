import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { refinementDb, owner, other } from "./helpers/adminRefinementDb";
import { isDisposableEmail } from "@/lib/security/disposableEmails";
import blockedDomains from "@/lib/security/disposable-domains.json";

const migration = readFileSync("supabase/migrations/20261101033155_auth_signup_protection.sql", "utf8");
const blocked = ["a@playfine.com", "a@guerrillamailblock.com", "a@inert.test", "a@TEST", "a@example.org", "a@localhost", "a@x.invalid", "a@x.example", "A@SUB.PLAYFINE.COM", "a@sub.guerrillamailblock.com."];
const allowed = ["a@gmail.com", "a@outlook.com", "a@nice.al", "a@maro.al", "a@playfine.com.customer.al", "a@notplayfine.com"];

describe("signup policy at the native Auth boundary", () => {
  it("keeps the application policy aligned for denied domains and legitimate addresses", () => {
    for (const domain of blockedDomains) expect(isDisposableEmail(`a@${domain}`)).toBe(true);
    for (const email of blocked) expect(isDisposableEmail(email)).toBe(true);
    for (const email of allowed) expect(isDisposableEmail(email)).toBe(false);
  });
  it("runs the real hook with Auth's least-privilege role and preserves existing rows", async () => {
    const db = await refinementDb();
    try {
      await db.exec(`create role supabase_auth_admin; alter table auth.users add column email_confirmed_at timestamptz, add column last_sign_in_at timestamptz, add column banned_until timestamptz;`);
      await db.exec(readFileSync("supabase/migrations/0069_admin_workspace_limits.sql", "utf8"));
      const count = async () => (await db.query("select (select count(*) from profiles) profiles,(select count(*) from auth.users) auth_users,(select count(*) from workspaces) workspaces")).rows;
      const before = await count();
      await db.exec(migration);
      expect(await count()).toEqual(before);
      for (const role of ["anon", "authenticated", "service_role"]) {
        expect((await db.query("select has_schema_privilege($1,'maro_auth_hooks','usage') allowed", [role])).rows[0]).toEqual({ allowed: false });
        expect((await db.query("select has_function_privilege($1,'maro_auth_hooks.before_user_created(jsonb)','execute') allowed", [role])).rows[0]).toEqual({ allowed: false });
      }
      await db.exec("set role supabase_auth_admin");
      for (const email of [...blocked, ...blockedDomains.map(domain => `a@${domain}`)]) {
        const result = (await db.query<{ result: { error: { http_code: number } } }>("select maro_auth_hooks.before_user_created($1::jsonb) result", [JSON.stringify({ user: { email } })])).rows[0].result;
        expect(result.error.http_code).toBe(403);
      }
      for (const email of allowed) expect((await db.query("select maro_auth_hooks.before_user_created($1::jsonb) result", [JSON.stringify({ user: { email } })])).rows[0]).toEqual({ result: {} });
      expect((await db.query("select maro_auth_hooks.before_user_created('{\"user\":{\"is_anonymous\":true}}') result")).rows[0]).toMatchObject({ result: { error: { http_code: 403 } } });
      expect((await db.query("select maro_auth_hooks.before_user_created('{\"user\":{\"phone\":\"synthetic\"}}') result")).rows[0]).toEqual({ result: {} });
      await db.exec("reset role");
      expect(await count()).toEqual(before);
      const definition = (await db.query<{ prosecdef: boolean; provolatile: string }>("select prosecdef,provolatile from pg_proc where oid='maro_auth_hooks.before_user_created(jsonb)'::regprocedure")).rows[0];
      expect(definition).toEqual({ prosecdef: false, provolatile: "i" });
    } finally { await db.close(); }
  });
  it("shows authoritative Auth status only in the existing service-only directory", async () => {
    const db = await refinementDb();
    try {
      await db.exec("create role supabase_auth_admin; alter table auth.users add column email_confirmed_at timestamptz, add column last_sign_in_at timestamptz, add column banned_until timestamptz;");
      await db.exec(readFileSync("supabase/migrations/0069_admin_workspace_limits.sql", "utf8"));
      await db.exec(migration);
      await db.query("update auth.users set email_confirmed_at='2026-10-31T20:00:00Z',last_sign_in_at='2026-10-31T21:00:00Z',banned_until='2027-01-01T00:00:00Z' where id=$1", [owner]);
      const directory = (await db.query<{ result: { users: Record<string, unknown>[] } }>("select admin_user_directory() result")).rows[0].result.users;
      const confirmed = directory.find(user => user.id === owner)!;
      expect(confirmed).toMatchObject({ credits: 25, workspaceCount: 1 });
      expect(new Date(String(confirmed.emailConfirmedAt)).toISOString()).toBe("2026-10-31T20:00:00.000Z");
      expect(new Date(String(confirmed.lastSignInAt)).toISOString()).toBe("2026-10-31T21:00:00.000Z");
      expect(new Date(String(confirmed.bannedUntil)).toISOString()).toBe("2027-01-01T00:00:00.000Z");
      expect(directory.find(user => user.id === other)).toMatchObject({ emailConfirmedAt: null, lastSignInAt: null, bannedUntil: null });
      for (const role of ["anon", "authenticated"]) expect((await db.query("select has_function_privilege($1,'admin_user_directory(text,integer,integer)','execute') allowed", [role])).rows[0]).toEqual({ allowed: false });
    } finally { await db.close(); }
  });
});
