-- Batch S1.1 — least-privilege correction for trigger-only functions.
-- PostgreSQL requires EXECUTE on a trigger function when CREATE TRIGGER runs,
-- not when ordinary INSERT/UPDATE/DELETE fires an existing trigger.
-- Reverts unnecessary direct EXECUTE grants from 0032 where no RPC/call path exists.

-- handle_new_user() — trigger-only (on_auth_user_created on auth.users)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    REVOKE ALL ON FUNCTION public.handle_new_user() FROM supabase_auth_admin;
  END IF;
END;
$$;

-- sync_profile_admin_flags() — trigger-only (profiles_sync_admin_flags on public.profiles)
REVOKE ALL ON FUNCTION public.sync_profile_admin_flags() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_profile_admin_flags() FROM anon;
REVOKE ALL ON FUNCTION public.sync_profile_admin_flags() FROM authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_admin_flags() FROM service_role;
