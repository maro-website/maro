import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Batch S1 / S1.1 — migration contract tests.
 * Live DB role checks: run supabase/verify_rpc_privileges.sql after applying migrations.
 */

const MIGRATION_0032_PATH = join(
  process.cwd(),
  "supabase/migrations/0032_lock_down_sensitive_rpc_privileges.sql"
);

const MIGRATION_0033_PATH = join(
  process.cwd(),
  "supabase/migrations/0033_minimize_trigger_function_privileges.sql"
);

const VERIFY_SQL_PATH = join(process.cwd(), "supabase/verify_rpc_privileges.sql");

/** Server-only RPCs invoked via getSupabaseAdmin() — must not be client-callable. */
export const SERVER_ONLY_RPCS = [
  "spend_credits(uuid, integer)",
  "reserve_credits(uuid, integer, uuid, text)",
  "finalize_credit_charge(uuid)",
  "release_credit_reserve(uuid, text)",
  "refund_credits_atomic(uuid, integer, text)",
  "admin_adjust_credits(uuid, uuid, integer, text, text, jsonb)",
  "fulfill_credit_order(uuid)",
  "cancel_credit_order(uuid, text)",
  "count_active_jobs(uuid)",
  "check_rate_limit(text, text, integer, integer)",
  "reconcile_stale_generation_jobs(integer)",
  "reveal_prompt(uuid, uuid, integer)",
  "bump_prompt_use(uuid)",
  "bump_creation_like(uuid, uuid, boolean)",
] as const;

/** RLS policy helpers — EXECUTE retained for anon/authenticated. */
export const RLS_HELPER_FUNCTIONS = ["is_admin()", "has_admin_access()"] as const;

/** Trigger-only functions — no direct .rpc() or application call path. */
export const TRIGGER_ONLY_FUNCTIONS = [
  "handle_new_user()",
  "sync_profile_admin_flags()",
] as const;

/** Documented PostgreSQL trigger bindings (0033 does not recreate these). */
export const TRIGGER_BINDINGS = [
  {
    trigger: "on_auth_user_created",
    table: "auth.users",
    timing: "AFTER",
    event: "INSERT",
    function: "handle_new_user()",
    securityDefiner: true,
  },
  {
    trigger: "profiles_sync_admin_flags",
    table: "public.profiles",
    timing: "BEFORE",
    event: "INSERT OR UPDATE OF access_role, is_admin",
    function: "sync_profile_admin_flags()",
    securityDefiner: true,
  },
] as const;

/** Application .rpc() call sites (server-only). */
export const APP_SERVER_RPC_CALLS = [
  "fulfill_credit_order",
  "cancel_credit_order",
  "admin_adjust_credits",
  "check_rate_limit",
  "reserve_credits",
  "finalize_credit_charge",
  "release_credit_reserve",
  "refund_credits_atomic",
  "spend_credits",
  "bump_prompt_use",
  "bump_creation_like",
  "count_active_jobs",
] as const;

function migration0032Sql(): string {
  return readFileSync(MIGRATION_0032_PATH, "utf8");
}

function migration0033Sql(): string {
  return readFileSync(MIGRATION_0033_PATH, "utf8");
}

describe("Batch S1 — RPC privilege lockdown migration", () => {
  const sql = migration0032Sql();

  it("migration file exists and revokes PUBLIC/anon/authenticated on server-only RPCs", () => {
    for (const sig of SERVER_ONLY_RPCS) {
      const fn = sig.replace(/\(.+\)$/, "");
      expect(sql).toContain(`ON FUNCTION public.${sig}`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM anon`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM authenticated`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${sig} TO service_role`);
      void fn;
    }
  });

  it("grants RLS helpers to anon and authenticated (not PUBLIC)", () => {
    for (const sig of RLS_HELPER_FUNCTIONS) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC`);
      expect(sql).toContain(
        `GRANT EXECUTE ON FUNCTION public.${sig} TO anon, authenticated, service_role`
      );
    }
  });

  it("sets default privileges for postgres-created functions in public schema", () => {
    expect(sql).toContain("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public");
    expect(sql).toContain("REVOKE ALL ON FUNCTIONS FROM PUBLIC");
    expect(sql).toContain("REVOKE ALL ON FUNCTIONS FROM anon, authenticated");
  });

  it("covers every application server .rpc() name", () => {
    for (const name of APP_SERVER_RPC_CALLS) {
      expect(sql).toMatch(new RegExp(`FUNCTION public\\.${name}\\(`));
    }
  });

  it("does not grant EXECUTE on fulfill_credit_order to anon or authenticated", () => {
    const block = sql.slice(
      sql.indexOf("fulfill_credit_order"),
      sql.indexOf("cancel_credit_order")
    );
    expect(block).not.toMatch(/GRANT EXECUTE[\s\S]*fulfill_credit_order[\s\S]*TO anon/);
    expect(block).not.toMatch(/GRANT EXECUTE[\s\S]*fulfill_credit_order[\s\S]*authenticated/);
  });
});

describe("Batch S1 — server RPC inventory (no browser .rpc calls)", () => {
  it("documents that sensitive RPCs are only referenced from server modules", () => {
    // Static inventory from audit — if a new client .rpc() is added, extend APP_SERVER_RPC_CALLS
    // and ensure migration includes REVOKE/GRANT for that function.
    expect(APP_SERVER_RPC_CALLS).toContain("fulfill_credit_order");
    expect(APP_SERVER_RPC_CALLS).toContain("reserve_credits");
    expect(APP_SERVER_RPC_CALLS).not.toContain("is_admin");
  });

  it("trigger-only functions are not in the server .rpc() inventory", () => {
    for (const sig of TRIGGER_ONLY_FUNCTIONS) {
      const name = sig.replace(/\(.+\)$/, "");
      expect(APP_SERVER_RPC_CALLS).not.toContain(name);
    }
  });
});

describe("Batch S1.1 — trigger-only least privilege (0033)", () => {
  const sql = migration0033Sql();
  const verifySql = readFileSync(VERIFY_SQL_PATH, "utf8");

  it("migration file exists and revokes direct EXECUTE from API roles on trigger functions", () => {
    for (const sig of TRIGGER_ONLY_FUNCTIONS) {
      expect(sql).toContain(`ON FUNCTION public.${sig}`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM anon`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM authenticated`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM service_role`);
      expect(sql).not.toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${sig.replace(/[()]/g, "\\$&")}`)
      );
    }
  });

  it("revokes supabase_auth_admin direct EXECUTE on handle_new_user when role exists", () => {
    expect(sql).toContain("supabase_auth_admin");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.handle_new_user() FROM supabase_auth_admin");
  });

  it("does not alter RLS helper grants or function bodies", () => {
    expect(sql).not.toContain("is_admin");
    expect(sql).not.toContain("has_admin_access");
    expect(sql).not.toContain("create or replace function");
    expect(sql).not.toContain("SECURITY DEFINER");
  });

  it("documents trigger bindings for signup and profile admin sync", () => {
    expect(TRIGGER_BINDINGS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "on_auth_user_created",
          table: "auth.users",
          function: "handle_new_user()",
        }),
        expect.objectContaining({
          trigger: "profiles_sync_admin_flags",
          table: "public.profiles",
          function: "sync_profile_admin_flags()",
        }),
      ])
    );
  });

  it("verify_rpc_privileges.sql expects no direct EXECUTE for trigger-class functions", () => {
    expect(verifySql).toContain("WHEN s.fn_class = 'trigger' THEN");
    expect(verifySql).toContain(
      "AND NOT has_function_privilege('service_role', s.fn_oid, 'EXECUTE')"
    );
    const triggerCase =
      verifySql.match(
        /WHEN s\.fn_class = 'trigger' THEN[\s\S]*?(?=WHEN s\.fn_class = 'internal')/
      )?.[0] ?? "";
    expect(triggerCase).toContain(
      "NOT has_function_privilege('authenticated', s.fn_oid, 'EXECUTE')"
    );
    expect(triggerCase).not.toMatch(
      /AND has_function_privilege\('authenticated', s\.fn_oid, 'EXECUTE'\)/
    );
  });

  it("authenticated and anon cannot directly execute trigger functions (privilege contract)", () => {
    // DML on bound tables fires triggers without direct EXECUTE on trigger functions.
    for (const sig of TRIGGER_ONLY_FUNCTIONS) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM anon`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM authenticated`);
    }
  });

  it("service_role does not require direct EXECUTE on trigger-only functions", () => {
    for (const sig of TRIGGER_ONLY_FUNCTIONS) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM service_role`);
    }
    expect(APP_SERVER_RPC_CALLS).not.toContain("handle_new_user");
    expect(APP_SERVER_RPC_CALLS).not.toContain("sync_profile_admin_flags");
  });
});
