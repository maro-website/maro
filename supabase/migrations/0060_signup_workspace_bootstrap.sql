-- Supabase Auth creates the first workspace before a user JWT exists.
-- The trusted trigger must use the internal calculator; public RPC callers keep
-- the ownership gate introduced in 0057 and workspace limits still apply.
begin;

create or replace function public.enforce_workspace_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_count integer;
  ws_limit integer;
begin
  select count(*)::integer into ws_count
  from public.workspaces
  where owner_id = new.owner_id;

  ws_limit := public.resolve_workspace_limit_internal(new.owner_id);

  if ws_count >= ws_limit then
    raise exception 'WORKSPACE_LIMIT'
      using errcode = 'P0001',
            hint = 'workspace entitlement limit reached';
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
