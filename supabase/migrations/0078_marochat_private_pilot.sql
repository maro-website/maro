-- Additive, service-only private pilot. No existing credit/financial functions change.
begin;
create table public.maro_chat_turns (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null,
  message text not null check (length(message) between 1 and 3000),
  use_brain boolean not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  reply jsonb,
  brain_revision bigint not null default 0,
  brain_reset_at timestamptz,
  brain_applied boolean not null default false,
  reserved_tokens integer not null check (reserved_tokens between 1 and 120000),
  charged_tokens integer not null check (charged_tokens >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  cached_tokens integer not null default 0 check (cached_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_usd numeric(12,8),
  model text not null,
  provider_response_id text,
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index maro_chat_owner_time on public.maro_chat_turns(owner_id,created_at desc);
create index maro_chat_conversation on public.maro_chat_turns(owner_id,workspace_id,conversation_id,created_at);
alter table public.maro_chat_turns enable row level security;
revoke all on public.maro_chat_turns from public,anon,authenticated;
grant all on public.maro_chat_turns to service_role;

create function public.maro_chat_guard(p_user uuid,p_workspace text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from auth.users where id=p_user and lower(btrim(email))='erzen@nice.al' and email_confirmed_at is not null) then raise exception 'CHAT_FORBIDDEN'; end if;
  if not exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user) then raise exception 'WORKSPACE_NOT_FOUND'; end if;
end; $$;

create function public.maro_chat_reserve(p_user uuid,p_workspace text,p_id uuid,p_conversation uuid,p_message text,p_brain boolean,p_reserve integer,p_revision bigint,p_reset timestamptz,p_model text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.maro_chat_turns; m bigint; d bigint;
begin
  perform public.maro_chat_guard(p_user,p_workspace);
  perform pg_advisory_xact_lock(hashtextextended('marochat:'||p_user::text,0));
  update public.maro_chat_turns set status='failed',error_code='interrupted',finished_at=now() where owner_id=p_user and status='running' and created_at<now()-interval '2 minutes';
  select * into t from public.maro_chat_turns where id=p_id;
  if found then
    if t.owner_id<>p_user or t.workspace_id<>p_workspace or t.conversation_id<>p_conversation or t.message<>p_message or t.use_brain<>p_brain then raise exception 'REQUEST_CONFLICT'; end if;
    return jsonb_build_object('existing',true,'id',t.id,'status',t.status);
  end if;
  if p_id is null or p_conversation is null or p_message is null or length(btrim(p_message)) not between 1 and 3000 or p_reserve is null or p_reserve not between 1 and 120000 or p_model is null or length(p_model)>100 then raise exception 'INVALID_REQUEST'; end if;
  -- An interrupted provider request stays conservatively counted; never replay it.
  if exists(select 1 from public.maro_chat_turns where owner_id=p_user and status='running') then raise exception 'CHAT_BUSY'; end if;
  select coalesce(sum(charged_tokens),0),coalesce(sum(charged_tokens) filter(where (created_at at time zone 'Europe/Berlin')::date=(now() at time zone 'Europe/Berlin')::date),0)
    into m,d from public.maro_chat_turns where owner_id=p_user and date_trunc('month',created_at at time zone 'Europe/Berlin')=date_trunc('month',now() at time zone 'Europe/Berlin');
  if m+p_reserve>1000000 then raise exception 'CHAT_MONTHLY_LIMIT'; end if;
  if d+p_reserve>200000 then raise exception 'CHAT_DAILY_LIMIT'; end if;
  insert into public.maro_chat_turns(id,owner_id,workspace_id,conversation_id,message,use_brain,reserved_tokens,charged_tokens,brain_revision,brain_reset_at,model)
    values(p_id,p_user,p_workspace,p_conversation,p_message,p_brain,p_reserve,p_reserve,p_revision,p_reset,p_model);
  return jsonb_build_object('existing',false,'id',p_id,'status','running');
end; $$;

create function public.maro_chat_apply_brain(p_user uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.maro_chat_turns; item jsonb; rev bigint; result jsonb; reset_at timestamptz;
begin
  select * into t from public.maro_chat_turns where id=p_id and owner_id=p_user for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  perform public.maro_chat_guard(p_user,t.workspace_id);
  if t.brain_applied then return jsonb_build_object('applied',true); end if;
  if t.status<>'completed' or jsonb_array_length(coalesce(t.reply->'brainUpdates','[]')) not between 1 and 12 then raise exception 'INVALID_REQUEST'; end if;
  select brain_reset_at into reset_at from public.workspaces where id=t.workspace_id and owner_id=p_user for update;
  select coalesce(max(revision),0) into rev from public.maro_brain_profile_versions where workspace_id=t.workspace_id and owner_id=p_user;
  if rev<>t.brain_revision or reset_at is distinct from t.brain_reset_at then raise exception 'BRAND_CONFLICT'; end if;
  rev:=t.brain_revision;
  for item in select * from jsonb_array_elements(t.reply->'brainUpdates') loop
    result:=public.maro_mcp_update_brand(p_user,t.workspace_id,item->>'section',item->>'field',item->>'value',rev);
    rev:=(result->>'revision')::bigint;
  end loop;
  update public.maro_chat_turns set brain_applied=true where id=p_id;
  return jsonb_build_object('applied',true,'revision',rev);
end; $$;

revoke all on function public.maro_chat_guard(uuid,text) from public,anon,authenticated;
revoke all on function public.maro_chat_reserve(uuid,text,uuid,uuid,text,boolean,integer,bigint,timestamptz,text) from public,anon,authenticated;
revoke all on function public.maro_chat_apply_brain(uuid,uuid) from public,anon,authenticated;
grant execute on function public.maro_chat_guard(uuid,text),public.maro_chat_reserve(uuid,text,uuid,uuid,text,boolean,integer,bigint,timestamptz,text),public.maro_chat_apply_brain(uuid,uuid) to service_role;
commit;
