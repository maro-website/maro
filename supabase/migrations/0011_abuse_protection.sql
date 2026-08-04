-- MARO — Abuse prevention: credit ledger, generation jobs, rate limits, abuse tracking

-- ---------------------------------------------------------------------------
-- profiles extensions
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists credits_reserved integer not null default 0;

alter table public.profiles
  add column if not exists email_verified_at timestamptz;

alter table public.profiles
  add column if not exists risk_score integer not null default 0;

alter table public.profiles
  add column if not exists generation_paused boolean not null default false;

alter table public.profiles
  add column if not exists device_fingerprint_hash text;

-- ---------------------------------------------------------------------------
-- app_settings: platform limits + kill switch
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column if not exists platform_limits jsonb not null default '{
    "maxActiveJobsGlobal": 50,
    "maxConcurrentFree": 1,
    "maxConcurrentFort": 3,
    "maxQueueSize": 200,
    "hourlySpendUsd": 100,
    "dailySpendUsd": 500,
    "userHourlyUsd": 10,
    "userDailyUsd": 50,
    "warnPct": 80,
    "aiPaused": false,
    "pausedModules": [],
    "promptMaxChars": 4000
  }'::jsonb;

alter table public.app_settings
  add column if not exists ai_paused boolean not null default false;

-- ---------------------------------------------------------------------------
-- credit_transactions ledger
-- ---------------------------------------------------------------------------
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid,
  type text not null check (type in ('reserve', 'charge', 'refund', 'manual_adjustment', 'release')),
  amount integer not null check (amount >= 0),
  balance_after integer,
  idempotency_key text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_idx on public.credit_transactions (user_id, created_at desc);
create index if not exists credit_transactions_job_idx on public.credit_transactions (job_id);
create unique index if not exists credit_transactions_idempotency_idx
  on public.credit_transactions (user_id, idempotency_key, type)
  where idempotency_key is not null;

alter table public.credit_transactions enable row level security;

drop policy if exists "credit_tx_user_select" on public.credit_transactions;
create policy "credit_tx_user_select" on public.credit_transactions
  for select using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- generation_jobs queue
-- ---------------------------------------------------------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module text not null,
  model text,
  status text not null default 'pending'
    check (status in ('pending', 'reserved', 'processing', 'completed', 'failed', 'cancelled')),
  idempotency_key text,
  credits_reserved integer not null default 0,
  credits_charged integer not null default 0,
  provider_cost_usd numeric(12, 6),
  input_tokens integer,
  output_tokens integer,
  retry_count integer not null default 0,
  priority integer not null default 0,
  error text,
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists generation_jobs_user_status_idx
  on public.generation_jobs (user_id, status);
create index if not exists generation_jobs_status_created_idx
  on public.generation_jobs (status, created_at);
create unique index if not exists generation_jobs_idempotency_active_idx
  on public.generation_jobs (user_id, idempotency_key)
  where idempotency_key is not null and status in ('pending', 'reserved', 'processing');

alter table public.generation_jobs enable row level security;

drop policy if exists "jobs_user_select" on public.generation_jobs;
create policy "jobs_user_select" on public.generation_jobs
  for select using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- abuse_events
-- ---------------------------------------------------------------------------
create table if not exists public.abuse_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  ip text,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warn', 'critical')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists abuse_events_created_idx on public.abuse_events (created_at desc);
create index if not exists abuse_events_user_idx on public.abuse_events (user_id, created_at desc);

alter table public.abuse_events enable row level security;

drop policy if exists "abuse_events_admin" on public.abuse_events;
create policy "abuse_events_admin" on public.abuse_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- signup_signals
-- ---------------------------------------------------------------------------
create table if not exists public.signup_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ip text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists signup_signals_ip_idx on public.signup_signals (ip, created_at desc);

alter table public.signup_signals enable row level security;

drop policy if exists "signup_signals_admin" on public.signup_signals;
create policy "signup_signals_admin" on public.signup_signals
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- rate_limit_events (sliding window counters)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_events (
  id bigserial primary key,
  scope text not null,
  scope_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (scope, scope_key, created_at desc);

-- ---------------------------------------------------------------------------
-- platform_spend_rollup
-- ---------------------------------------------------------------------------
create table if not exists public.platform_spend_rollup (
  bucket_start timestamptz not null,
  bucket_type text not null check (bucket_type in ('hour', 'day')),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000',
  module text not null default '',
  spend_usd numeric(12, 6) not null default 0,
  credits_charged integer not null default 0,
  job_count integer not null default 0,
  primary key (bucket_start, bucket_type, user_id, module)
);

-- ---------------------------------------------------------------------------
-- storage_usage
-- ---------------------------------------------------------------------------
create table if not exists public.storage_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bytes_used bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.storage_usage enable row level security;

drop policy if exists "storage_usage_user" on public.storage_usage;
create policy "storage_usage_user" on public.storage_usage
  for select using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- RPC: reserve_credits
-- Returns new available balance after reserve, or -1 if insufficient.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_credits(
  p_user uuid,
  p_amount integer,
  p_job_id uuid,
  p_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
  available integer;
  existing_id uuid;
begin
  if p_amount <= 0 then
    return 0;
  end if;

  -- Idempotent: already reserved for this key
  if p_idempotency_key is not null then
    select id into existing_id
    from public.credit_transactions
    where user_id = p_user
      and idempotency_key = p_idempotency_key
      and type = 'reserve'
    limit 1;
    if existing_id is not null then
      select credits into new_balance from public.profiles where id = p_user;
      return coalesce(new_balance, -1);
    end if;
  end if;

  select credits - credits_reserved into available
  from public.profiles
  where id = p_user
  for update;

  if available is null or available < p_amount then
    return -1;
  end if;

  update public.profiles
  set credits = credits - p_amount,
      credits_reserved = credits_reserved + p_amount
  where id = p_user
  returning credits into new_balance;

  insert into public.credit_transactions (user_id, job_id, type, amount, balance_after, idempotency_key)
  values (p_user, p_job_id, 'reserve', p_amount, new_balance, p_idempotency_key);

  return new_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: finalize_credit_charge (reserve -> charge, release hold)
-- ---------------------------------------------------------------------------
create or replace function public.finalize_credit_charge(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  bal integer;
begin
  select user_id, amount into r
  from public.credit_transactions
  where job_id = p_job_id and type = 'reserve'
  order by created_at desc
  limit 1;

  if r.user_id is null then
    return false;
  end if;

  update public.profiles
  set credits_reserved = greatest(0, credits_reserved - r.amount)
  where id = r.user_id;

  select credits into bal from public.profiles where id = r.user_id;

  insert into public.credit_transactions (user_id, job_id, type, amount, balance_after)
  values (r.user_id, p_job_id, 'charge', r.amount, bal);

  update public.generation_jobs
  set credits_charged = r.amount, status = 'completed', finished_at = now()
  where id = p_job_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: release_credit_reserve (idempotent refund of reserved credits)
-- ---------------------------------------------------------------------------
create or replace function public.release_credit_reserve(
  p_job_id uuid,
  p_idempotency_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  bal integer;
  already_released boolean;
begin
  if p_idempotency_key is not null then
    select exists(
      select 1 from public.credit_transactions
      where job_id = p_job_id and type = 'release'
        and idempotency_key = p_idempotency_key
    ) into already_released;
    if already_released then
      return true;
    end if;
  end if;

  select user_id, amount into r
  from public.credit_transactions
  where job_id = p_job_id and type = 'reserve'
  order by created_at desc
  limit 1;

  if r.user_id is null then
    return false;
  end if;

  -- Skip if already released
  if exists (
    select 1 from public.credit_transactions
    where job_id = p_job_id and type in ('release', 'refund')
  ) then
    return true;
  end if;

  update public.profiles
  set credits = credits + r.amount,
      credits_reserved = greatest(0, credits_reserved - r.amount)
  where id = r.user_id
  returning credits into bal;

  insert into public.credit_transactions (user_id, job_id, type, amount, balance_after, idempotency_key)
  values (r.user_id, p_job_id, 'release', r.amount, bal, p_idempotency_key);

  update public.generation_jobs
  set status = 'failed', finished_at = now()
  where id = p_job_id and status not in ('completed', 'cancelled');

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: refund_credits_atomic (admin/report refunds, not job-linked)
-- ---------------------------------------------------------------------------
create or replace function public.refund_credits_atomic(
  p_user uuid,
  p_amount integer,
  p_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then return -1; end if;

  if p_idempotency_key is not null and exists (
    select 1 from public.credit_transactions
    where user_id = p_user and idempotency_key = p_idempotency_key and type = 'refund'
  ) then
    select credits into new_balance from public.profiles where id = p_user;
    return coalesce(new_balance, -1);
  end if;

  update public.profiles
  set credits = credits + p_amount
  where id = p_user
  returning credits into new_balance;

  if new_balance is null then return -1; end if;

  insert into public.credit_transactions (user_id, type, amount, balance_after, idempotency_key)
  values (p_user, 'refund', p_amount, new_balance, p_idempotency_key);

  return new_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: count_active_jobs
-- ---------------------------------------------------------------------------
create or replace function public.count_active_jobs(p_user uuid default null)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::integer from public.generation_jobs
  where status in ('reserved', 'processing')
    and (p_user is null or user_id = p_user);
$$;

-- ---------------------------------------------------------------------------
-- RPC: check_rate_limit
-- Returns: allowed (true/false), retry_after seconds
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_scope text,
  p_scope_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt integer;
  oldest timestamptz;
  retry_after integer;
begin
  delete from public.rate_limit_events
  where scope = p_scope
    and scope_key = p_scope_key
    and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*), min(created_at) into cnt, oldest
  from public.rate_limit_events
  where scope = p_scope and scope_key = p_scope_key;

  if cnt >= p_limit then
    retry_after := greatest(1, extract(epoch from (oldest + (p_window_seconds || ' seconds')::interval - now()))::integer);
    return jsonb_build_object('allowed', false, 'retry_after', retry_after);
  end if;

  insert into public.rate_limit_events (scope, scope_key) values (p_scope, p_scope_key);
  return jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: grant_maro_heret (August 2026 signups)
-- ---------------------------------------------------------------------------
create or replace function public.grant_maro_heret(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  created timestamptz;
begin
  select created_at into created from public.profiles where id = p_user;
  if created is null then return false; end if;

  if extract(year from created) = 2026 and extract(month from created) = 8 then
    update public.profiles
    set plan = 'fort',
        fort_until = '2026-09-01 00:00:00+02'::timestamptz
    where id = p_user;
    return true;
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Update handle_new_user: maroHerët + signup signals placeholder
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email = 'erzen@nice.al',
    case when new.email = 'erzen@nice.al' then 100000 else 0 end
  );
  perform public.grant_maro_heret(new.id);
  return new;
end;
$$;

-- Legacy spend_credits kept for backward compat; prefer reserve/finalize flow.
-- Atomic refund via refund_credits_atomic.

notify pgrst, 'reload schema';
