-- Batch S1 / S1.1 — read-only privilege verification for sensitive public functions.
-- Run in Supabase SQL Editor after applying migrations through 0033.
-- Expected:
--   server_only  → anon/authenticated/PUBLIC false, service_role true
--   rls_helpers  → anon/authenticated/service_role true, PUBLIC false
--   trigger      → anon/authenticated/PUBLIC/service_role false (trigger-only; no direct RPC)
--   internal     → service_role true (direct server/migration call paths)

WITH sensitive AS (
  SELECT *
  FROM (VALUES
    ('spend_credits',                    'public.spend_credits(uuid, integer)'::regprocedure,                    'server_only'),
    ('reserve_credits',                  'public.reserve_credits(uuid, integer, uuid, text)'::regprocedure,        'server_only'),
    ('finalize_credit_charge',           'public.finalize_credit_charge(uuid)'::regprocedure,                     'server_only'),
    ('release_credit_reserve',           'public.release_credit_reserve(uuid, text)'::regprocedure,                 'server_only'),
    ('refund_credits_atomic',            'public.refund_credits_atomic(uuid, integer, text)'::regprocedure,         'server_only'),
    ('admin_adjust_credits',             'public.admin_adjust_credits(uuid, uuid, integer, text, text, jsonb)'::regprocedure, 'server_only'),
    ('fulfill_credit_order',             'public.fulfill_credit_order(uuid)'::regprocedure,                         'server_only'),
    ('cancel_credit_order',              'public.cancel_credit_order(uuid, text)'::regprocedure,                      'server_only'),
    ('count_active_jobs',                'public.count_active_jobs(uuid)'::regprocedure,                            'server_only'),
    ('check_rate_limit',                 'public.check_rate_limit(text, text, integer, integer)'::regprocedure,     'server_only'),
    ('reconcile_stale_generation_jobs',  'public.reconcile_stale_generation_jobs(integer)'::regprocedure,           'server_only'),
    ('reveal_prompt',                    'public.reveal_prompt(uuid, uuid, integer)'::regprocedure,                 'server_only'),
    ('bump_prompt_use',                  'public.bump_prompt_use(uuid)'::regprocedure,                              'server_only'),
    ('bump_creation_like',               'public.bump_creation_like(uuid, uuid, boolean)'::regprocedure,            'server_only'),
    ('is_admin',                         'public.is_admin()'::regprocedure,                                         'rls_helper'),
    ('has_admin_access',                 'public.has_admin_access()'::regprocedure,                                 'rls_helper'),
    ('handle_new_user',                  'public.handle_new_user()'::regprocedure,                                  'trigger'),
    ('sync_profile_admin_flags',         'public.sync_profile_admin_flags()'::regprocedure,                         'trigger'),
    ('ensure_default_workspace',         'public.ensure_default_workspace(uuid)'::regprocedure,                     'internal')
  ) AS t(fn_name, fn_oid, fn_class)
)
SELECT
  s.fn_name,
  s.fn_class,
  has_function_privilege('PUBLIC', s.fn_oid, 'EXECUTE')        AS public_exec,
  has_function_privilege('anon', s.fn_oid, 'EXECUTE')          AS anon_exec,
  has_function_privilege('authenticated', s.fn_oid, 'EXECUTE') AS authenticated_exec,
  has_function_privilege('service_role', s.fn_oid, 'EXECUTE')  AS service_role_exec,
  CASE
    WHEN s.fn_class = 'server_only' THEN
      NOT has_function_privilege('PUBLIC', s.fn_oid, 'EXECUTE')
      AND NOT has_function_privilege('anon', s.fn_oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', s.fn_oid, 'EXECUTE')
      AND has_function_privilege('service_role', s.fn_oid, 'EXECUTE')
    WHEN s.fn_class = 'rls_helper' THEN
      NOT has_function_privilege('PUBLIC', s.fn_oid, 'EXECUTE')
      AND has_function_privilege('anon', s.fn_oid, 'EXECUTE')
      AND has_function_privilege('authenticated', s.fn_oid, 'EXECUTE')
      AND has_function_privilege('service_role', s.fn_oid, 'EXECUTE')
    WHEN s.fn_class = 'trigger' THEN
      NOT has_function_privilege('PUBLIC', s.fn_oid, 'EXECUTE')
      AND NOT has_function_privilege('anon', s.fn_oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', s.fn_oid, 'EXECUTE')
      AND NOT has_function_privilege('service_role', s.fn_oid, 'EXECUTE')
    WHEN s.fn_class = 'internal' THEN
      NOT has_function_privilege('PUBLIC', s.fn_oid, 'EXECUTE')
      AND NOT has_function_privilege('anon', s.fn_oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', s.fn_oid, 'EXECUTE')
      AND has_function_privilege('service_role', s.fn_oid, 'EXECUTE')
    ELSE false
  END AS status_ok
FROM sensitive s
ORDER BY s.fn_class, s.fn_name;

-- Optional: supabase_auth_admin must not hold direct EXECUTE on trigger-only handle_new_user().
SELECT
  'handle_new_user_supabase_auth_admin' AS check_name,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN true
    ELSE NOT has_function_privilege(
      'supabase_auth_admin',
      'public.handle_new_user()'::regprocedure,
      'EXECUTE'
    )
  END AS status_ok;

-- Trigger bindings (existence + SECURITY DEFINER). All status_ok should be true.
SELECT
  t.tgname AS trigger_name,
  n.nspname || '.' || c.relname AS table_name,
  CASE t.tgtype & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  CASE
    WHEN t.tgtype & 4 > 0 THEN 'INSERT'
    WHEN t.tgtype & 8 > 0 THEN 'DELETE'
    WHEN t.tgtype & 16 > 0 THEN 'UPDATE'
    ELSE 'UNKNOWN'
  END AS event,
  pg_get_triggerdef(t.oid, true) AS trigger_def,
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS function_owner,
  p.prosecdef AS security_definer,
  pg_get_userbyid(t.tgowner) AS trigger_owner,
  true AS status_ok
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND p.proname IN ('handle_new_user', 'sync_profile_admin_flags')
ORDER BY t.tgname;
