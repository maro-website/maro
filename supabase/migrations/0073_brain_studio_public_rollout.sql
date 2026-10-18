-- Open the existing Brain operations to every eligible account.
-- Keep server-only execution, ownership, active-plan and reset-epoch checks.
-- No existing profiles, memories, folders, sources or files are changed.
begin;

create or replace function public.maro_studio_lock(p_user uuid,p_workspace text,p_reset timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare w public.workspaces;
begin
  if p_user is null then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if not coalesce((public.maro_account_policy(p_user,p_workspace)->>'brainAccess')::boolean,false) then raise exception 'BRAIN_PLAN_REQUIRED'; end if;
  select * into w from public.workspaces where id=p_workspace and owner_id=p_user for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if w.brain_reset_at is distinct from p_reset then raise exception 'BRAIN_REFRESH_REQUIRED'; end if;
end; $$;

revoke all on function public.maro_studio_lock(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.maro_studio_lock(uuid,text,timestamptz) to service_role;

commit;
