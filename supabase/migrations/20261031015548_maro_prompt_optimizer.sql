-- Derived, private generation context and dedicated-key cost ledger. No customer credit changes.
create table public.maro_optimizer_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text references public.workspaces(id) on delete set null,
  request_key text not null check (length(request_key) between 1 and 128),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  module text not null check (module in ('reklama','logo')),
  key_alias text not null default 'maro_optimizer' check (key_alias = 'maro_optimizer'),
  model text not null default 'gpt-6.1-sol',
  actual_model text,
  version text not null default 'maro-context-optimizer/1',
  status text not null default 'running' check (status in ('running','completed','rejected','uncertain')),
  source_chars integer not null check (source_chars >= 0),
  final_chars integer check (final_chars between 1 and 30000),
  final_prompt text check (length(final_prompt) <= 30000),
  reserved_usd numeric(14,8) not null check (reserved_usd > 0 and reserved_usd <= 1),
  estimated_usd numeric(14,8) check (estimated_usd >= 0),
  input_tokens integer check (input_tokens >= 0),
  cached_tokens integer check (cached_tokens >= 0 and cached_tokens <= input_tokens),
  cache_write_tokens integer check (cache_write_tokens >= 0 and cache_write_tokens + coalesce(cached_tokens,0) <= input_tokens),
  output_tokens integer check (output_tokens >= 0),
  provider_response_id text,
  price_version text,
  service_tier text,
  duration_ms integer check (duration_ms >= 0),
  cache_hits integer not null default 0 check (cache_hits >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (user_id, request_key),
  check (status <> 'completed' or (final_prompt is not null and final_chars is not null and estimated_usd is not null))
);
create index maro_optimizer_cache on public.maro_optimizer_attempts(user_id, fingerprint, created_at desc);
create index maro_optimizer_cost_period on public.maro_optimizer_attempts(created_at, user_id);
alter table public.maro_optimizer_attempts enable row level security;
revoke all on public.maro_optimizer_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.maro_optimizer_attempts to service_role;

-- Serialize budget/cache admission across all users so concurrent requests cannot overbook.
-- Invoker security: callable only by the backend service role; no customer-supplied identity.
create function public.maro_optimizer_reserve(
  p_user uuid, p_workspace text, p_request_key text, p_fingerprint text,
  p_module text, p_source_chars integer, p_reserved_usd numeric
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.maro_optimizer_attempts; user_day numeric; user_month numeric; global_day numeric; global_month numeric;
begin
  if p_reserved_usd is null or p_reserved_usd <= 0 or p_reserved_usd > 1 or p_source_chars < 0
    or p_request_key is null or length(p_request_key) not between 1 and 128
    or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or p_module not in ('reklama','logo') then raise exception 'invalid_optimizer_admission'; end if;
  if p_workspace is not null and not exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user)
    then raise exception 'workspace_forbidden'; end if;
  perform pg_advisory_xact_lock(hashtext('maro_optimizer_budget'));
  if not exists(select 1 from public.app_settings where id=1 and not coalesce(ai_paused,false)
    and not coalesce((platform_limits->>'aiPaused')::boolean,false)
    and not coalesce((platform_limits->'pausedModules') ? p_module,false)) then return jsonb_build_object('action','paused'); end if;

  select * into r from public.maro_optimizer_attempts where user_id=p_user and request_key=p_request_key;
  if found then
    if r.fingerprint<>p_fingerprint then return jsonb_build_object('action','conflict'); end if;
    if r.status='completed' then return jsonb_build_object('action','cache','id',r.id,'final_prompt',r.final_prompt); end if;
    return jsonb_build_object('action',case when r.status='running' and r.created_at>now()-interval '2 minutes' then 'busy' else 'failed' end);
  end if;
  select * into r from public.maro_optimizer_attempts where user_id=p_user and fingerprint=p_fingerprint
    and workspace_id is not distinct from p_workspace and created_at>now()-interval '7 days' and status='completed'
    order by created_at desc limit 1;
  if found then
    update public.maro_optimizer_attempts set cache_hits=cache_hits+1 where id=r.id;
    return jsonb_build_object('action','cache','id',r.id,'final_prompt',r.final_prompt);
  end if;
  if exists(select 1 from public.maro_optimizer_attempts where user_id=p_user and fingerprint=p_fingerprint
    and created_at>now()-interval '2 minutes') then return jsonb_build_object('action','busy'); end if;

  select coalesce(sum(coalesce(estimated_usd,reserved_usd)) filter(where user_id=p_user and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0),
    coalesce(sum(coalesce(estimated_usd,reserved_usd)) filter(where user_id=p_user),0),
    coalesce(sum(coalesce(estimated_usd,reserved_usd)) filter(where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0),
    coalesce(sum(coalesce(estimated_usd,reserved_usd)),0)
    into user_day,user_month,global_day,global_month from public.maro_optimizer_attempts
    where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  -- Pilot caps, USD: $2/user/day, $20/user/month, $20/platform/day, $200/platform/month.
  if user_day+p_reserved_usd>2 or user_month+p_reserved_usd>20 or global_day+p_reserved_usd>20 or global_month+p_reserved_usd>200
    then return jsonb_build_object('action','budget'); end if;
  insert into public.maro_optimizer_attempts(user_id,workspace_id,request_key,fingerprint,module,source_chars,reserved_usd)
    values(p_user,p_workspace,p_request_key,p_fingerprint,p_module,p_source_chars,p_reserved_usd) returning * into r;
  return jsonb_build_object('action','run','id',r.id);
end;
$$;
revoke all on function public.maro_optimizer_reserve(uuid,text,text,text,text,integer,numeric) from public,anon,authenticated;
grant execute on function public.maro_optimizer_reserve(uuid,text,text,text,text,integer,numeric) to service_role;

create function public.maro_optimizer_usage_summary() returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(s) order by s.estimated_usd desc),'[]'::jsonb) from (
    select a.user_id,p.email,count(*) as attempts,
      count(*) filter(where a.status='completed') as completed,
      count(*) filter(where a.status='rejected') as rejected,
      count(*) filter(where a.estimated_usd is null) as unconfirmed,
      coalesce(sum(a.cache_hits),0) as cache_hits,
      coalesce(sum(a.input_tokens),0) as input_tokens,coalesce(sum(a.cached_tokens),0) as cached_tokens,
      coalesce(sum(a.cache_write_tokens),0) as cache_write_tokens,
      coalesce(sum(a.output_tokens),0) as output_tokens,
      coalesce(sum(a.estimated_usd),0) as estimated_usd,
      coalesce(sum(a.reserved_usd) filter(where a.estimated_usd is null),0) as unconfirmed_reserved_usd,
      coalesce(sum(a.estimated_usd) filter(where a.created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'),0) as month_estimated_usd,
      avg(a.source_chars-a.final_chars) filter(where a.status='completed') as avg_saved_chars,
      avg(a.duration_ms) as avg_duration_ms,max(a.created_at) as last_used_at
    from public.maro_optimizer_attempts a left join public.profiles p on p.id=a.user_id
    group by a.user_id,p.email
  ) s;
$$;
revoke all on function public.maro_optimizer_usage_summary() from public,anon,authenticated;
grant execute on function public.maro_optimizer_usage_summary() to service_role;
