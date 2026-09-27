-- Batch S1 — lock down SECURITY DEFINER / sensitive RPC EXECUTE privileges.
-- Sensitive application RPCs must be callable only via service_role (server).
-- RLS helper functions retain EXECUTE for anon/authenticated (policy evaluation).
-- Trigger functions retain EXECUTE only for roles that fire the trigger.
--
-- After applying: run supabase/verify_rpc_privileges.sql in the SQL editor.

-- =============================================================================
-- SERVER_ONLY — credit, payment, admin, abuse, generation helpers
-- =============================================================================

-- Credits (legacy + ledger)
REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, integer, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_credit_charge(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_credit_charge(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_credit_charge(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_credit_charge(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.release_credit_reserve(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_credit_reserve(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.release_credit_reserve(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_credit_reserve(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.refund_credits_atomic(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_credits_atomic(uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.refund_credits_atomic(uuid, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits_atomic(uuid, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_adjust_credits(uuid, uuid, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(uuid, uuid, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(uuid, uuid, integer, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, uuid, integer, text, text, jsonb) TO service_role;

-- Payments / orders
REVOKE ALL ON FUNCTION public.fulfill_credit_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_credit_order(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fulfill_credit_order(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_credit_order(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_credit_order(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_credit_order(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_credit_order(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_credit_order(uuid, text) TO service_role;

-- Generation / abuse
REVOKE ALL ON FUNCTION public.count_active_jobs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_active_jobs(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.count_active_jobs(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.count_active_jobs(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.reconcile_stale_generation_jobs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_stale_generation_jobs(integer) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_stale_generation_jobs(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_stale_generation_jobs(integer) TO service_role;

-- Prompts / explore (server API paths only; reveal_prompt retired at API layer)
REVOKE ALL ON FUNCTION public.reveal_prompt(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reveal_prompt(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.reveal_prompt(uuid, uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_prompt(uuid, uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.bump_prompt_use(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_prompt_use(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.bump_prompt_use(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bump_prompt_use(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.bump_creation_like(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_creation_like(uuid, uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.bump_creation_like(uuid, uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bump_creation_like(uuid, uuid, boolean) TO service_role;

-- =============================================================================
-- RLS HELPERS — not PostgREST business RPCs; EXECUTE required for policy evaluation
-- =============================================================================

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_admin_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_admin_access() FROM anon;
REVOKE ALL ON FUNCTION public.has_admin_access() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_access() TO anon, authenticated, service_role;

-- =============================================================================
-- TRIGGER / INTERNAL DB — no direct client RPC; minimal EXECUTE for trigger roles
-- =============================================================================

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
-- Supabase Auth fires auth.users INSERT triggers as supabase_auth_admin (when present).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_admin_flags() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_profile_admin_flags() FROM anon;
REVOKE ALL ON FUNCTION public.sync_profile_admin_flags() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_admin_flags() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ensure_default_workspace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_default_workspace(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.ensure_default_workspace(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_default_workspace(uuid) TO service_role;

-- grant_maro_heret was dropped in 0014; no-op if absent
DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.grant_maro_heret(uuid) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.grant_maro_heret(uuid) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.grant_maro_heret(uuid) FROM authenticated';
EXCEPTION
  WHEN undefined_function THEN NULL;
END;
$$;

-- =============================================================================
-- DEFAULT PRIVILEGES — functions created by postgres in public (Supabase migrations)
-- New SECURITY DEFINER RPCs must explicitly GRANT EXECUTE in their migration.
-- =============================================================================

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

COMMENT ON SCHEMA public IS
  'Batch S1 (0032): sensitive RPCs locked to service_role; RLS helpers granted to anon/authenticated.';

notify pgrst, 'reload schema';
