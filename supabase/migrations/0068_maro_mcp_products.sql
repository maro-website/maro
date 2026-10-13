-- Additive MCP product boundaries and private, versioned brand memory.
-- Existing web sessions, generation accounting, prices and mood data are unchanged.
-- New product tokens do not inherit the browser role's direct database grants.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='maro_mcp') then
    create role maro_mcp nologin nobypassrls;
  end if;
end $$;
grant maro_mcp to authenticator;
create table public.maro_mcp_client_resources (
  client_id uuid primary key,
  resource text not null check (resource in ('https://maro.al/api/mcp','https://maro.al/api/mcp/imazh','https://maro.al/api/mcp/brain')),
  created_at timestamptz not null default now()
);
alter table public.maro_mcp_client_resources enable row level security;
revoke all on public.maro_mcp_client_resources from public, anon, authenticated;
grant all on public.maro_mcp_client_resources to service_role;

-- Preserve the two already registered image connections, including refreshes.
insert into public.maro_mcp_client_resources(client_id,resource)
select id,'https://maro.al/api/mcp' from auth.oauth_clients
where id in ('f02a0dd4-f51c-4a11-93fc-df5586b3b6a4','aa9dbe09-699f-41ce-a087-e35e2f6b6b63') and deleted_at is null;

create or replace function public.maro_mcp_custom_access_token_hook(event jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  claims jsonb := coalesce(event->'claims','{}'::jsonb);
  client text := nullif(claims->>'client_id','');
  destination text;
  permissions jsonb;
begin
  if client is null then return jsonb_build_object('claims',claims); end if;
  select resource into destination from public.maro_mcp_client_resources where client_id::text=client;
  if destination is null then
    -- Bind a newly registered client only after this user has approved a grant
    -- for a known resource. Keep that binding across refresh and grant cleanup.
    select a.resource into destination from auth.oauth_authorizations a
      where a.client_id::text=client and a.user_id::text=claims->>'sub' and a.status::text='approved'
      and a.resource in ('https://maro.al/api/mcp','https://maro.al/api/mcp/imazh','https://maro.al/api/mcp/brain')
      order by a.approved_at desc nulls last,a.created_at desc limit 1;
    if destination is not null then
      insert into public.maro_mcp_client_resources(client_id,resource) values(client::uuid,destination) on conflict do nothing;
      select resource into destination from public.maro_mcp_client_resources where client_id::text=client;
    end if;
  end if;
  if destination is null then return jsonb_build_object('claims',claims); end if;
  permissions := case when destination='https://maro.al/api/mcp/brain'
    then '["account:read","brain:read","brain:write"]'::jsonb
    else '["account:read","image:generate","image:read"]'::jsonb end;
  claims := jsonb_set(claims,'{aud}',to_jsonb(destination),true);
  claims := jsonb_set(claims,'{maro_mcp}','true'::jsonb,true);
  claims := jsonb_set(claims,'{maro_mcp_permissions}',permissions,true);
  if destination<>'https://maro.al/api/mcp' then
    claims := jsonb_set(claims,'{role}',to_jsonb('maro_mcp'::text),true);
  end if;
  return jsonb_build_object('claims',claims);
end; $$;
revoke all on function public.maro_mcp_custom_access_token_hook(jsonb) from public,anon,authenticated;
grant execute on function public.maro_mcp_custom_access_token_hook(jsonb) to supabase_auth_admin;

create table public.maro_brain_profile_versions (
  revision bigint generated always as identity primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.maro_brain_profile_versions(workspace_id,revision desc);
create table public.maro_brain_memories (
  revision bigint generated always as identity primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null check (length(memory_key) between 1 and 80 and memory_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  content text not null check (length(content) between 1 and 4000),
  source text not null check (length(source) between 1 and 240),
  created_at timestamptz not null default now()
);
create index on public.maro_brain_memories(workspace_id,memory_key,revision desc);
alter table public.maro_brain_profile_versions enable row level security;
alter table public.maro_brain_memories enable row level security;
revoke all on public.maro_brain_profile_versions,public.maro_brain_memories from public,anon,authenticated;
grant all on public.maro_brain_profile_versions,public.maro_brain_memories to service_role;
grant usage,select on sequence public.maro_brain_profile_versions_revision_seq,public.maro_brain_memories_revision_seq to service_role;

create function public.maro_record_brain_profile_version() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.brain_reset_at is distinct from old.brain_reset_at then
    delete from public.maro_brain_memories where workspace_id=new.id;
    delete from public.maro_brain_profile_versions where workspace_id=new.id;
    return new;
  end if;
  if new.brain_profile is distinct from old.brain_profile then
    if old.brain_profile<>'{}'::jsonb and not exists(select 1 from public.maro_brain_profile_versions where workspace_id=new.id) then
      insert into public.maro_brain_profile_versions(workspace_id,owner_id,profile) values(new.id,new.owner_id,old.brain_profile);
    end if;
    insert into public.maro_brain_profile_versions(workspace_id,owner_id,profile) values(new.id,new.owner_id,new.brain_profile);
  end if;
  return new;
end; $$;
revoke all on function public.maro_record_brain_profile_version() from public,anon,authenticated;
create trigger maro_brain_profile_history after update of brain_profile,brain_reset_at on public.workspaces
for each row execute function public.maro_record_brain_profile_version();

create function public.maro_mcp_brain_authorization(p_user uuid,p_authorization text) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('resource',resource) from auth.oauth_authorizations
  where authorization_id=p_authorization and user_id=p_user limit 1
$$;

create function public.maro_mcp_remember(p_user uuid,p_workspace text,p_key text,p_content text,p_source text,p_expected bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_record public.maro_brain_memories; next_revision bigint;
begin
  perform 1 from public.workspaces where id=p_workspace and owner_id=p_user for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if not coalesce((public.maro_account_policy(p_user,p_workspace)->>'brainAccess')::boolean,false) then raise exception 'BRAIN_PLAN_REQUIRED'; end if;
  select * into current_record from public.maro_brain_memories where workspace_id=p_workspace and memory_key=p_key order by revision desc limit 1;
  if current_record.content=p_content and current_record.source=p_source then
    return jsonb_build_object('key',p_key,'revision',current_record.revision,'saved',true);
  end if;
  if coalesce(current_record.revision,0)<>p_expected then raise exception 'MEMORY_CONFLICT'; end if;
  if (select count(*) from public.maro_brain_memories where workspace_id=p_workspace)>=2000 then raise exception 'MEMORY_LIMIT'; end if;
  insert into public.maro_brain_memories(workspace_id,owner_id,memory_key,content,source) values(p_workspace,p_user,p_key,p_content,p_source) returning revision into next_revision;
  return jsonb_build_object('key',p_key,'revision',next_revision,'saved',true);
end; $$;

create function public.maro_mcp_forget(p_user uuid,p_workspace text,p_key text,p_expected bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint;
begin
  perform 1 from public.workspaces where id=p_workspace and owner_id=p_user for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if not coalesce((public.maro_account_policy(p_user,p_workspace)->>'brainAccess')::boolean,false) then raise exception 'BRAIN_PLAN_REQUIRED'; end if;
  select max(revision) into current_revision from public.maro_brain_memories where workspace_id=p_workspace and memory_key=p_key;
  if current_revision is null then return jsonb_build_object('key',p_key,'forgotten',true); end if;
  if current_revision<>p_expected then raise exception 'MEMORY_CONFLICT'; end if;
  delete from public.maro_brain_memories where workspace_id=p_workspace and memory_key=p_key;
  return jsonb_build_object('key',p_key,'forgotten',true);
end; $$;

create function public.maro_mcp_search_memories(p_user uuid,p_workspace text,p_query text,p_limit integer)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(found)),'[]'::jsonb) from (
    select memory_key as key,content,source,revision,created_at from (
      select distinct on (memory_key) memory_key,content,source,revision,created_at
      from public.maro_brain_memories where owner_id=p_user and workspace_id=p_workspace
      order by memory_key,revision desc
    ) current_memories
    where p_query='' or to_tsvector('simple',memory_key||' '||content||' '||source) @@ websearch_to_tsquery('simple',p_query)
    order by revision desc limit least(greatest(p_limit,1),20)
  ) found
$$;

-- Mutations run only behind the server's verified actor/permission boundary.
create function public.maro_mcp_update_brand(p_user uuid,p_workspace text,p_section text,p_field text,p_value text,p_expected bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare workspace public.workspaces; current_revision bigint; updated_profile jsonb; fields text[];
begin
  fields := case p_section
    when 'brand' then array['name','category','website','description','location','language','businessModel','salesChannel']
    when 'target' then array['audience','demographics','interests','painPoints']
    when 'goal' then array['primaryGoal','secondaryGoals','successMetrics']
    when 'market' then array['region','competitors','positioning','differentiators']
    when 'content' then array['tone','voice','themes','avoid','hashtags'] else array[]::text[] end;
  if not p_field=any(fields) or length(p_value)>4000 then raise exception 'INVALID_REQUEST'; end if;
  select * into workspace from public.workspaces where id=p_workspace and owner_id=p_user for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if not coalesce((public.maro_account_policy(p_user,p_workspace)->>'brainAccess')::boolean,false) then raise exception 'BRAIN_PLAN_REQUIRED'; end if;
  select coalesce(max(revision),0) into current_revision from public.maro_brain_profile_versions where workspace_id=p_workspace;
  if workspace.brain_profile #>> array[p_section,p_field]=p_value then
    return jsonb_build_object('revision',current_revision,'updated',true);
  end if;
  if current_revision<>p_expected then raise exception 'BRAND_CONFLICT'; end if;
  updated_profile := jsonb_set(workspace.brain_profile,array[p_section],coalesce(workspace.brain_profile->p_section,'{}'::jsonb),true);
  updated_profile := jsonb_set(updated_profile,array[p_section,p_field],to_jsonb(p_value),true);
  update public.workspaces set brain_profile=updated_profile,
    brand_name=case when p_section='brand' and p_field='name' then nullif(p_value,'') else brand_name end
    where id=p_workspace and owner_id=p_user;
  select max(revision) into current_revision from public.maro_brain_profile_versions where workspace_id=p_workspace;
  return jsonb_build_object('revision',current_revision,'updated',true);
end; $$;
revoke all on function public.maro_mcp_update_brand(uuid,text,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.maro_mcp_update_brand(uuid,text,text,text,text,bigint) to service_role;

revoke all on function public.maro_mcp_brain_authorization(uuid,text),public.maro_mcp_remember(uuid,text,text,text,text,bigint),public.maro_mcp_forget(uuid,text,text,bigint),public.maro_mcp_search_memories(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.maro_mcp_brain_authorization(uuid,text),public.maro_mcp_remember(uuid,text,text,text,text,bigint),public.maro_mcp_forget(uuid,text,text,bigint),public.maro_mcp_search_memories(uuid,text,text,integer) to service_role;
notify pgrst,'reload schema';
