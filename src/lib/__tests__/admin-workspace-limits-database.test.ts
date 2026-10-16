import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { refinementDb, actor, owner, other } from "./helpers/adminRefinementDb";

async function setup() {
  const db = await refinementDb();
  await db.exec(readFileSync("supabase/migrations/0069_admin_workspace_limits.sql", "utf8"));
  const original = readFileSync("supabase/migrations/0041_workspace_entitlement.sql", "utf8");
  await db.exec(original.slice(original.indexOf("drop trigger if exists"), original.indexOf("revoke all on function public.resolve_workspace_limit")));
  return db;
}
describe("account workspace limits in PostgreSQL", () => {
  it("enforces overrides on actual inserts, isolates accounts, audits changes and restores the plan without deleting anything", async () => {
    const db = await setup();
    try {
      const insert = (user = owner) => db.query("insert into workspaces(id,owner_id,name) values($1,$2,'Test')", [crypto.randomUUID(), user]);
      await expect(insert()).rejects.toThrow("WORKSPACE_LIMIT");
      expect((await db.query("select admin_set_user_workspaces($1,$2,3,'Owner allowance') result", [actor, owner])).rows[0]).toEqual({ result: { ok: true, workspaceLimit: 3 } });
      await insert(); await insert(); await expect(insert()).rejects.toThrow("WORKSPACE_LIMIT");
      await insert(other); await expect(insert(other)).rejects.toThrow("WORKSPACE_LIMIT");
      await db.query("select admin_set_user_workspaces($1,$2,1,'Lower allowance')", [actor, owner]);
      expect((await db.query("select count(*) n from workspaces where owner_id=$1", [owner])).rows[0]).toEqual({ n: 3 });
      await expect(insert()).rejects.toThrow("WORKSPACE_LIMIT");
      await db.query("insert into memberships(user_id,plan_id,started_at,expires_at) values($1,'pro',now()-interval '1 day',now()+interval '30 days')", [owner]);
      expect((await db.query("select resolve_workspace_limit_internal($1) n", [owner])).rows[0]).toEqual({ n: 1 });
      await db.query("select admin_set_user_workspaces($1,$2,null,'Use plan again')", [actor, owner]);
      await insert(); await insert(); await expect(insert()).rejects.toThrow("WORKSPACE_LIMIT");
      const directory = (await db.query<{ result: { users: Record<string, unknown>[] } }>("select admin_user_directory('owner@') result")).rows[0].result.users;
      expect(directory).toHaveLength(1); expect(directory[0]).toMatchObject({ workspaceCount: 5, workspaceLimit: 5, workspaceOverride: null });
      const audit = (await db.query("select before_state,after_state,metadata from audit_events where action='users.workspace_limit_changed' order by created_at,id")).rows;
      expect(audit).toHaveLength(3);
      expect(audit).toContainEqual({ before_state: { workspace_limit: null }, after_state: { workspace_limit: 3 }, metadata: { note: "Owner allowance" } });
    } finally { await db.close(); }
  });
  it("preserves business overrides and free fallback, rejects invalid/forged changes and rolls back when auditing fails", async () => {
    const db = await setup();
    try {
      await db.query(`insert into memberships(user_id,plan_id,started_at,expires_at,business_overrides) values($1,'business',now()-interval '1 day',now()+interval '1 day','{"workspace_limit":40}')`, [owner]);
      const limit = async () => (await db.query("select resolve_workspace_limit_internal($1) n", [owner])).rows[0];
      expect(await limit()).toEqual({ n: 40 });
      await db.query("select admin_set_user_workspaces($1,$2,25,'Manual allowance')", [actor, owner]);
      await db.query("update memberships set suspended=true where user_id=$1", [owner]);
      expect(await limit()).toEqual({ n: 25 });
      await db.query("select admin_set_user_workspaces($1,$2,null,'Restore fallback')", [actor, owner]);
      expect(await limit()).toEqual({ n: 1 });
      for (const n of [0, -1, 1001]) expect((await db.query("select admin_set_user_workspaces($1,$2,$3,'Invalid allowance') result", [actor, owner, n])).rows[0]).toMatchObject({ result: { ok: false, error: "invalid_limit" } });
      expect((await db.query("select admin_set_user_workspaces($1,$2,10,'x') result", [actor, owner])).rows[0]).toMatchObject({ result: { ok: false, error: "invalid_note" } });
      expect((await db.query("select admin_set_user_workspaces($1,$2,10,'Forged actor') result", [other, owner])).rows[0]).toMatchObject({ result: { ok: false, error: "forbidden" } });
      await db.exec("alter table audit_events add constraint reject_workspace_audit check(action<>'users.workspace_limit_changed') not valid");
      await expect(db.query("select admin_set_user_workspaces($1,$2,10,'Audit failure')", [actor, owner])).rejects.toThrow();
      expect(await limit()).toEqual({ n: 1 });
      await db.exec("set role authenticated; set request.jwt.claim.role='authenticated'");
      await expect(db.query("select * from user_workspace_overrides")).rejects.toThrow(/permission denied/);
      await expect(db.query("select admin_set_user_workspaces($1,$2,99,'Forged request')", [actor, owner])).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  });
});
