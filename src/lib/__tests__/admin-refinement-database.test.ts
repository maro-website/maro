import { describe, expect, it } from "vitest";
import { refinementDb, actor, owner, other } from "./helpers/adminRefinementDb";

describe("admin plan, notifications, quota and account deletion", () => {
  it("replaces a longer paid plan atomically, preserves balances and paid history, and sends one private-safe notification", async () => {
    const db = await refinementDb();
    try {
      const oldId = crypto.randomUUID(), newId = crypto.randomUUID();
      await db.query("insert into memberships(id,user_id,plan_id,started_at,expires_at) values($1,$2,'business',now()-interval '1 day',now()+interval '90 days')", [oldId, owner]);
      const args = [actor, owner, "pro", 30, "Private partnership reason", newId, oldId];
      const change = () => db.query<{ result: { ok: boolean; already: boolean; error?: string } }>("select admin_change_user_plan($1,$2,$3,$4,$5,$6,$7) result", args);
      expect((await change()).rows[0].result).toMatchObject({ ok: true, already: false });
      expect((await change()).rows[0].result).toMatchObject({ ok: true, already: true });
      expect((await db.query("select suspended,expires_at>now()+interval '89 days' retained from memberships where id=$1", [oldId])).rows[0]).toEqual({ suspended: true, retained: true });
      expect((await db.query("select credits,maro_plan from profiles where id=$1", [owner])).rows[0]).toEqual({ credits: 25, maro_plan: "pro" });
      expect((await db.query("select maro_storage_limit_internal($1) bytes,resolve_workspace_limit_internal($1) workspaces", [owner])).rows[0]).toEqual({ bytes: 5000000000, workspaces: 5 });
      const notifications = (await db.query("select body,metadata from user_notifications")).rows;
      expect(notifications).toHaveLength(1); expect(JSON.stringify(notifications)).not.toContain("Private partnership reason");
      args[2] = "standard"; expect((await change()).rows[0].result.error).toBe("idempotency_conflict");
      const stale = await db.query<{ result: { error: string } }>("select admin_change_user_plan($1,$2,'free',30,'Reset account',$3,$4) result", [actor, owner, crypto.randomUUID(), oldId]);
      expect(stale.rows[0].result.error).toBe("stale_membership");
      expect((await db.query("select admin_change_user_plan($1,$2,'free',30,'Reset account',$3,$4) result", [actor, owner, crypto.randomUUID(), newId])).rows[0]).toMatchObject({ result: { ok: true } });
      expect((await db.query("select maro_active_plan($1) plan,resolve_workspace_limit_internal($1) workspaces", [owner])).rows[0]).toEqual({ plan: null, workspaces: 1 });
    } finally { await db.close(); }
  });

  it("rolls the whole plan change back if the durable notification cannot be saved", async () => {
    const db = await refinementDb();
    try {
      await db.exec("alter table user_notifications add constraint reject_notification check(false)");
      await expect(db.query("select admin_change_user_plan($1,$2,'pro',30,'Private reason',$3,null)", [actor, owner, crypto.randomUUID()])).rejects.toThrow();
      expect((await db.query("select * from memberships")).rows).toHaveLength(0);
      expect((await db.query("select * from audit_events")).rows).toHaveLength(0);
      expect((await db.query("select maro_plan from profiles where id=$1", [owner])).rows[0]).toEqual({ maro_plan: null });
    } finally { await db.close(); }
  });

  it("notifies legacy grants and signed manual credit adjustments while keeping the reason private and notifications owner-only", async () => {
    const db = await refinementDb();
    try {
      await db.query("select admin_grant_plan($1,$2,'standard',30,'Legacy private note',$3)", [actor, owner, crypto.randomUUID()]);
      await db.query("insert into credit_transactions(user_id,type,amount,balance_after,metadata) values($1,'manual_adjustment',10,15,'{\"delta\":-10,\"reason\":\"Private note\"}')", [owner]);
      const notifications = (await db.query("select body from user_notifications order by kind")).rows;
      expect(notifications).toHaveLength(2); expect(JSON.stringify(notifications)).toContain("-10 kredite"); expect(JSON.stringify(notifications)).not.toContain("Private note");
      await db.exec(`set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${other}'`);
      expect((await db.query("select * from user_notifications")).rows).toHaveLength(0);
      await expect(db.query("select admin_user_directory()" )).rejects.toThrow(/permission denied/);
      await expect(db.query("select admin_change_user_plan($1,$2,'free',30,'Forged call',$3,null)", [actor, owner, crypto.randomUUID()])).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  });

  it("enforces per-user storage overrides in the actual upload trigger and restores plan quotas without deleting files", async () => {
    const db = await refinementDb();
    try {
      await db.query("select admin_set_user_storage($1,$2,200,'Support allowance')", [actor, owner]);
      const upload = (bytes: number, user = owner) => db.query("insert into storage.objects(bucket_id,name,metadata) values('generations',$1,jsonb_build_object('size',$2::bigint))", [`${user}/${crypto.randomUUID()}.png`, bytes]);
      await upload(200); await expect(upload(1)).rejects.toThrow("storage_quota_exceeded"); await upload(201, other);
      await db.query("select admin_set_user_storage($1,$2,0,'Temporary cap')", [actor, owner]);
      expect((await db.query<{ count: number }>("select count(*) count from storage.objects")).rows[0].count).toBe(2);
      await db.query("select admin_set_user_storage($1,$2,null,'Restore default')", [actor, owner]); await upload(1);
      await db.exec(`set request.jwt.claim.role='authenticated'`);
      expect((await db.query("select admin_set_user_storage($1,$2,999,'Forged actor') result", [actor, owner])).rows[0]).toMatchObject({ result: { ok: false, error: "forbidden" } });
    } finally { await db.close(); }
  });

  it("protects admins, self and active work, freezes new requests before deletion, and retains financial rows", async () => {
    const db = await refinementDb();
    try {
      const begin = (user = owner, email = "owner@example.invalid") => db.query<{ result: { ok: boolean; error?: string } }>("select admin_begin_user_delete($1,$2,$3) result", [actor, user, email]);
      expect((await begin(actor, "admin@example.invalid")).rows[0].result.error).toBe("self_delete_forbidden");
      await db.query("update profiles set access_role='editor' where id=$1", [other]); expect((await begin(other, "other@example.invalid")).rows[0].result.error).toBe("protected_account");
      const job = crypto.randomUUID(); await db.query("insert into generation_jobs(id,user_id,status) values($1,$2,'pending')", [job, owner]);
      expect((await begin()).rows[0].result.error).toBe("active_generation"); await db.query("update generation_jobs set status='failed' where id=$1", [job]);
      const membership = crypto.randomUUID();
      await db.query("insert into memberships(id,user_id,plan_id,started_at,expires_at) values($1,$2,'standard',now()-interval '1 day',now()+interval '30 days')", [membership, owner]);
      const order = crypto.randomUUID(); await db.query("insert into credit_orders(id,user_id,status,provider,paid_at) values($1,$2,'pending','raiaccept',now())", [order, owner]);
      await db.query("insert into raiaccept_checkouts(order_id,user_id,expected_membership_id) values($1,$2,$3)", [order, owner, membership]);
      expect((await begin()).rows[0].result.error).toBe("active_payment"); await db.query("update credit_orders set status='paid' where id=$1", [order]);
      await db.query("insert into credit_transactions(user_id,type,amount,balance_after) values($1,'topup',20,45)", [owner]);
      expect((await begin()).rows[0].result.ok).toBe(true);
      await expect(db.query("insert into generation_jobs(user_id,status) values($1,'pending')", [owner])).rejects.toThrow("account_deletion_in_progress");
      await expect(db.query("insert into storage.objects(bucket_id,name,metadata) values('generations',$1,'{\"size\":1}')", [`${owner}/late.png`])).rejects.toThrow("account_deletion_in_progress");
      await expect(db.query("insert into credit_orders(user_id,status) values($1,'pending')", [owner])).rejects.toThrow("account_deletion_in_progress");
      await db.query("delete from auth.users where id=$1", [owner]);
      expect((await db.query("select user_id from credit_transactions")).rows).toEqual([{ user_id: null }]);
      expect((await db.query("select user_id from credit_orders")).rows).toEqual([{ user_id: null }]);
      expect((await db.query("select user_id,expected_membership_id from raiaccept_checkouts")).rows).toEqual([{ user_id: null, expected_membership_id: null }]);
    } finally { await db.close(); }
  });

  it("excludes test, sandbox, unverified and unpaid orders, separates currencies and aggregates beyond the REST row cap", async () => {
    const db = await refinementDb();
    try {
      await db.exec("insert into credit_orders(provider,status,paid_at,amount_cents) select 'test','paid',now(),900 from generate_series(1,1200)");
      const paid = async (currency: string, environment: string, status = "paid") => { const id = crypto.randomUUID(); await db.query("insert into credit_orders(id,user_id,provider,status,paid_at,currency) values($1,$2,'raiaccept',$3,now(),$4)", [id, owner, status, currency]); await db.query("insert into raiaccept_checkouts(order_id,user_id,environment) values($1,$2,$3)", [id, owner, environment]); };
      await paid("EUR", "production"); await paid("EUR", "production"); await paid("EUR", "sandbox"); await paid("EUR", "production", "pending");
      await db.exec("insert into credit_orders(provider,status,paid_at,currency,amount_cents) values('paddle','paid',now(),'USD',1200),('raiaccept','paid',now(),'EUR',10000)");
      const snapshot = (await db.query<{ result: { overview: { ordersPaid: number; revenueEur: number; excludedPaidOrders: number; receiptsByCurrency: unknown[] }; daily: unknown[] } }>("select admin_analytics_snapshot() result")).rows[0].result;
      expect(snapshot.overview).toMatchObject({ ordersPaid: 3, revenueEur: 18, excludedPaidOrders: 1202 });
      expect(snapshot.overview.receiptsByCurrency).toEqual([{ currency: "EUR", orders: 2, amount: 18 }, { currency: "USD", orders: 1, amount: 12 }]); expect(snapshot.daily).toHaveLength(30);
      await db.exec("set role authenticated; set request.jwt.claim.role='authenticated'");
      await expect(db.query("select * from admin_real_paid_orders")).rejects.toThrow(/permission denied/);
      await expect(db.query("select admin_analytics_snapshot()")).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  });

  it("blocks plan replacement and deletion while an automatic subscription is active", async () => {
    const db = await refinementDb();
    try {
      const membership = crypto.randomUUID();
      await db.query("insert into memberships(id,user_id,plan_id,started_at,expires_at,payment_provider,renewal_mode) values($1,$2,'pro',now()-interval '1 day',now()+interval '30 days','paddle','automatic')", [membership, owner]);
      const change = await db.query<{ result: { error: string } }>("select admin_change_user_plan($1,$2,'standard',30,'Change request',$3,$4) result", [actor, owner, crypto.randomUUID(), membership]);
      expect(change.rows[0].result.error).toBe("automatic_subscription");
      const deletion = await db.query<{ result: { error: string } }>("select admin_begin_user_delete($1,$2,'owner@example.invalid') result", [actor, owner]);
      expect(deletion.rows[0].result.error).toBe("automatic_subscription");
      expect((await db.query("select * from user_notifications")).rows).toHaveLength(0);
      expect((await db.query("select suspended from memberships where id=$1", [membership])).rows[0]).toEqual({ suspended: false });
    } finally { await db.close(); }
  });
});
