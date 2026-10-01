-- MARO — Server-side workspace entitlement enforcement at INSERT boundary

create or replace function public.resolve_workspace_limit(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m record;
  bo jsonb;
  eff text;
begin
  select
    m2.id,
    m2.plan_id,
    m2.expires_at,
    m2.suspended,
    m2.business_overrides,
    cp2.workspace_limit,
    cp2.renewal_window_days
  into m
  from public.memberships m2
  join public.commerce_plans cp2 on cp2.id = m2.plan_id
  where m2.user_id = p_user_id
  order by m2.expires_at desc
  limit 1;

  if m.id is null then
    return 1;
  end if;

  eff := public.membership_effective_status(
    m.expires_at,
    m.renewal_window_days,
    m.plan_id,
    m.suspended,
    now()
  );

  if eff in ('EXPIRED', 'BUSINESS_EXPIRED', 'BUSINESS_SUSPENDED') then
    return 1;
  end if;

  if m.plan_id = 'business' then
    bo := coalesce(m.business_overrides, '{}'::jsonb);
    if bo ? 'workspace_limit' and (bo->>'workspace_limit') ~ '^[0-9]+$' then
      return greatest(1, (bo->>'workspace_limit')::integer);
    end if;
  end if;

  return greatest(1, coalesce(m.workspace_limit, 1));
end;
$$;

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

  ws_limit := public.resolve_workspace_limit(new.owner_id);

  if ws_count >= ws_limit then
    raise exception 'WORKSPACE_LIMIT'
      using errcode = 'P0001',
            hint = 'workspace entitlement limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists workspaces_entitlement_check on public.workspaces;
create trigger workspaces_entitlement_check
  before insert on public.workspaces
  for each row execute function public.enforce_workspace_entitlement();

revoke all on function public.resolve_workspace_limit(uuid) from public;
grant execute on function public.resolve_workspace_limit(uuid) to service_role;
grant execute on function public.resolve_workspace_limit(uuid) to authenticated;

notify pgrst, 'reload schema';
