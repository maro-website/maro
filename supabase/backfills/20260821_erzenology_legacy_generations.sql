-- One-time, idempotent legacy-generation backfill for erzen@nice.al.
-- Executed on 2026-08-21: dry-run 75, updated 75, remaining 0.

do $$
declare
  v_user_id uuid;
  v_workspace_id text;
  v_dry_run_count integer;
  v_updated_count integer;
begin
  select id into strict v_user_id
  from public.profiles
  where lower(email) = lower('erzen@nice.al');

  select id into strict v_workspace_id
  from public.workspaces
  where owner_id = v_user_id
    and lower(name) = lower('erzenology');

  select count(*) into v_dry_run_count
  from public.generations
  where user_id = v_user_id
    and workspace_id is null;

  raise notice 'Dry run: % generation rows', v_dry_run_count;

  update public.generations
  set workspace_id = v_workspace_id
  where user_id = v_user_id
    and workspace_id is null;

  get diagnostics v_updated_count = row_count;
  raise notice 'Updated: % generation rows', v_updated_count;
end $$;
