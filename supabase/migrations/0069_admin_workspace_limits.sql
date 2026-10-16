-- Account-wide admin overrides; existing workspaces, files and memberships are retained.
begin;

create table public.user_workspace_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_limit integer not null check(workspace_limit between 1 and 1000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.user_workspace_overrides enable row level security;
revoke all on public.user_workspace_overrides from public,anon,authenticated;
grant select,insert,update,delete on public.user_workspace_overrides to service_role;

create or replace function public.resolve_workspace_limit_internal(p_user_id uuid)
returns integer language plpgsql stable security definer set search_path=public as $$
declare manual_limit integer; m record; bo jsonb;
begin
  select workspace_limit into manual_limit from user_workspace_overrides where user_id=p_user_id;
  if found then return manual_limit; end if;
  select m2.plan_id,m2.business_overrides,cp.workspace_limit into m from memberships m2
    join commerce_plans cp on cp.id=m2.plan_id where m2.user_id=p_user_id and m2.started_at<=now()
      and m2.expires_at>now() and not m2.suspended order by m2.expires_at desc limit 1;
  if not found then return 1; end if;
  if m.plan_id='business' then
    bo:=coalesce(m.business_overrides,'{}'::jsonb);
    if bo ? 'workspace_limit' and bo->>'workspace_limit' ~ '^[0-9]+$' then
      return greatest(1,(bo->>'workspace_limit')::integer); end if;
  end if;
  return greatest(1,coalesce(m.workspace_limit,1));
end;
$$;
revoke all on function public.resolve_workspace_limit_internal(uuid) from public,anon,authenticated;
grant execute on function public.resolve_workspace_limit_internal(uuid) to service_role;

create function public.admin_set_user_workspaces(p_actor uuid,p_user uuid,p_limit integer,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old_limit integer;
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_limit is not null and (p_limit<1 or p_limit>1000) then return jsonb_build_object('ok',false,'error','invalid_limit'); end if;
  if p_note is null or length(trim(p_note)) not between 3 and 1000 then return jsonb_build_object('ok',false,'error','invalid_note'); end if;
  -- Share this lock with inserts, so concurrent creations cannot exceed the allowance.
  perform pg_advisory_xact_lock(hashtextextended('workspace_entitlement:'||p_user::text,0));
  perform 1 from profiles where id=p_user for update;
  if not found then return jsonb_build_object('ok',false,'error','user_not_found'); end if;
  select workspace_limit into old_limit from user_workspace_overrides where user_id=p_user;
  if p_limit is null then delete from user_workspace_overrides where user_id=p_user;
  else insert into user_workspace_overrides(user_id,workspace_limit,updated_by) values(p_user,p_limit,p_actor)
    on conflict(user_id) do update set workspace_limit=excluded.workspace_limit,updated_by=excluded.updated_by,updated_at=now(); end if;
  insert into audit_events(actor_id,action,target_type,target_id,before_state,after_state,metadata)
    values(p_actor,'users.workspace_limit_changed','user',p_user::text,
      jsonb_build_object('workspace_limit',old_limit),jsonb_build_object('workspace_limit',p_limit),jsonb_build_object('note',trim(p_note)));
  return jsonb_build_object('ok',true,'workspaceLimit',public.resolve_workspace_limit_internal(p_user));
end;
$$;
revoke all on function public.admin_set_user_workspaces(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.admin_set_user_workspaces(uuid,uuid,integer,text) to service_role;

create or replace function public.enforce_workspace_entitlement()
returns trigger language plpgsql security definer set search_path=public as $$
declare ws_count bigint; ws_limit integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('workspace_entitlement:'||new.owner_id::text,0));
  select count(*) into ws_count from public.workspaces where owner_id=new.owner_id;
  ws_limit:=public.resolve_workspace_limit_internal(new.owner_id);
  if ws_count>=ws_limit then raise exception 'WORKSPACE_LIMIT' using errcode='P0001',hint='workspace entitlement limit reached'; end if;
  return new;
end;
$$;

create or replace function public.admin_user_directory(p_search text default '',p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; total bigint;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset<0 or length(p_search)>100 then raise exception 'invalid_request'; end if;
  select count(*) into total from profiles p where p_search='' or position(lower(p_search) in lower(coalesce(p.email,'')||' '||coalesce(p.full_name,'')))>0;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'email',coalesce(p.email,''),'full_name',p.full_name,
    'credits',p.credits,'is_creator',p.is_creator,'is_admin',p.is_admin,'access_role',p.access_role,'created_at',p.created_at,
    'plan',coalesce(m.plan_id,'free'),'membershipId',m.id,'planExpiresAt',m.expires_at,
    'storageUsedBytes',public.maro_storage_used_internal(p.id),'storageLimitBytes',public.maro_storage_limit_internal(p.id),
    'storageOverrideBytes',(select limit_bytes from user_storage_overrides where user_id=p.id),
    'workspaceCount',(select count(*) from workspaces where owner_id=p.id),'workspaceLimit',public.resolve_workspace_limit_internal(p.id),
    'workspaceOverride',(select workspace_limit from user_workspace_overrides where user_id=p.id)) order by p.created_at desc,p.id),'[]'::jsonb)
    into result from (select * from profiles where p_search='' or position(lower(p_search) in lower(coalesce(email,'')||' '||coalesce(full_name,'')))>0
      order by created_at desc,id limit p_limit offset p_offset) p
    left join lateral(select id,plan_id,expires_at from memberships where user_id=p.id and started_at<=now() and expires_at>now() and not suspended
      order by expires_at desc limit 1) m on true;
  return jsonb_build_object('users',result,'total',total);
end;
$$;
revoke all on function public.admin_user_directory(text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_user_directory(text,integer,integer) to service_role;

notify pgrst,'reload schema';
commit;
