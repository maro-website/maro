import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createRaiAcceptTestDatabase } from "./helpers/raiaccept-database";
import { buildContentSecurityPolicy } from "../../../security-headers.mjs";

const migration = readFileSync("supabase/migrations/0070_retire_unused_provider.sql", "utf8");

describe("unused provider retirement", () => {
  it("removes unused storage and RPCs while retaining private order accounting and bank entry points", async () => {
    const db = await createRaiAcceptTestDatabase();
    try {
      expect((await db.query("select tablename from pg_tables where schemaname='public' and tablename like '%paddle%' ")).rows).toEqual([]);
      expect((await db.query("select column_name from information_schema.columns where table_schema='public' and column_name like '%paddle%' ")).rows).toEqual([]);
      expect((await db.query("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (proname like '%paddle%' or prosrc like '%paddle%')")).rows).toEqual([]);
      for (const name of ["reserve_raiaccept_checkout(uuid,uuid,text,text,text,jsonb)", "apply_raiaccept_verification(uuid,uuid,jsonb,jsonb)"]) {
        const row = (await db.query("select has_function_privilege('service_role',$1,'EXECUTE') bank,has_function_privilege('authenticated',$1,'EXECUTE') ordinary", [name])).rows[0];
        expect(row).toEqual({ bank: true, ordinary: false });
      }
      for (const name of ["fulfill_manual_commerce_order(uuid,text)", "cancel_manual_credit_order(uuid,text)"]) {
        expect((await db.query<{allowed:boolean}>("select has_function_privilege('service_role',$1,'EXECUTE') allowed", [name])).rows[0].allowed).toBe(false);
      }
      await expect(db.exec("set role authenticated; select * from admin_real_paid_orders")).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  });

  it.each(["order", "metadata", "event"])("refuses removal when %s history exists and leaves the old schema intact", async kind => {
    const db = await createRaiAcceptTestDatabase({ retirement: false });
    try {
      if (kind === "order") await db.exec("insert into credit_orders(provider) values('paddle')");
      if (kind === "metadata") await db.exec("insert into credit_orders(provider,paddle_customer_id) values('test','ctm_historical')");
      if (kind === "event") await db.exec("insert into paddle_webhook_events(event_id,event_type,occurred_at) values('evt_history','transaction.completed',now())");
      await expect(db.exec(migration)).rejects.toThrow(/provider_retirement_has_/);
      await db.exec("rollback");
      expect((await db.query<{present:string}>("select to_regclass('paddle_webhook_events') present")).rows[0].present).toBeTruthy();
      expect((await db.query<{present:string}>("select to_regprocedure('fulfill_non_paddle_commerce_order(uuid,text)') present")).rows[0].present).toBeTruthy();
    } finally { await db.close(); }
  });

  it("cannot add the retired provider to CSP through stale environment flags", () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT", "production");
    try { expect(buildContentSecurityPolicy({ isProduction: true })).not.toContain("paddle.com"); }
    finally { vi.unstubAllEnvs(); }
  });
});
