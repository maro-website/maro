-- MARO Control Center — Phase 0/1 foundation (RBAC, audit, events, flags, credits RPC)
-- Forward-safe: additive only. Does not modify prior migration files.

-- ---------------------------------------------------------------------------
-- profiles.access_role — administrative role (separate from is_creator / maro_plan)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists access_role text
    check (access_role is null or access_role in ('super_admin', 'administrator', 'developer', 'editor'));

create index if not exists profiles_access_role_idx
  on public.profiles (access_role)
  where access_role is not null;

-- Migrate existing admins without locking anyone out.
update public.profiles
set access_role = 'super_admin'
where is_admin = true
  and access_role is null;

-- Keep is_admin in sync when access_role changes (backwards compatibility).
create or replace function public.sync_profile_admin_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.access_role is distinct from old.access_role then
      new.is_admin := new.access_role is not null;
    elsif new.is_admin is distinct from old.is_admin and new.is_admin = true and new.access_role is null then
      new.access_role := 'super_admin';
    elsif new.is_admin is distinct from old.is_admin and new.is_admin = false then
      new.access_role := null;
    end if;
  elsif tg_op = 'INSERT' then
    if new.access_role is not null then
      new.is_admin := true;
    elsif new.is_admin = true and new.access_role is null then
      new.access_role := 'super_admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_admin_flags on public.profiles;
create trigger profiles_sync_admin_flags
  before insert or update of access_role, is_admin on public.profiles
  for each row execute function public.sync_profile_admin_flags();

-- Helper: privileged admin access (role-based or legacy is_admin).
create or replace function public.has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.access_role is not null or p.is_admin = true
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- audit_events — append-only admin audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_idx on public.audit_events (created_at desc);
create index if not exists audit_events_actor_idx on public.audit_events (actor_id, created_at desc);
create index if not exists audit_events_action_idx on public.audit_events (action, created_at desc);

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_admin_select" on public.audit_events;
create policy "audit_events_admin_select" on public.audit_events
  for select using (public.has_admin_access());

-- Inserts only via service role (admin APIs).

-- ---------------------------------------------------------------------------
-- feature_flags — minimal internal flags for gradual rollout
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

insert into public.feature_flags (key, enabled, metadata)
values ('prompt_compiler_v2', false, '{"description":"Maro Engine prompt compiler v2"}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- product_events — lightweight analytics foundation
-- ---------------------------------------------------------------------------
create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references auth.users (id) on delete set null,
  tool_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_name_created_idx
  on public.product_events (event_name, created_at desc);
create index if not exists product_events_user_idx
  on public.product_events (user_id, created_at desc);

alter table public.product_events enable row level security;

drop policy if exists "product_events_admin_select" on public.product_events;
create policy "product_events_admin_select" on public.product_events
  for select using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- prompt_events — admin read policy (Phase 0 analytics hotfix)
-- Normal users still have no direct SELECT; reads go via service role API too.
-- ---------------------------------------------------------------------------
drop policy if exists "prompt_events_admin_select" on public.prompt_events;
create policy "prompt_events_admin_select" on public.prompt_events
  for select using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- RPC: admin_adjust_credits — atomic manual adjustment with ledger entry
-- ---------------------------------------------------------------------------
create or replace function public.admin_adjust_credits(
  p_actor uuid,
  p_user uuid,
  p_delta integer,
  p_reason text,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_balance integer;
  new_balance integer;
  abs_amount integer;
  existing_id uuid;
  meta jsonb;
begin
  if p_delta = 0 then
    return jsonb_build_object('ok', false, 'error', 'zero_delta');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  if p_idempotency_key is not null then
    select id into existing_id
    from public.credit_transactions
    where user_id = p_user
      and idempotency_key = p_idempotency_key
      and type = 'manual_adjustment'
    limit 1;
    if existing_id is not null then
      select credits into new_balance from public.profiles where id = p_user;
      return jsonb_build_object(
        'ok', true,
        'already', true,
        'balance', coalesce(new_balance, 0)
      );
    end if;
  end if;

  select credits into old_balance
  from public.profiles
  where id = p_user
  for update;

  if old_balance is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  new_balance := old_balance + p_delta;
  if new_balance < 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  end if;

  abs_amount := abs(p_delta);

  update public.profiles
  set credits = new_balance
  where id = p_user;

  meta := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'reason', p_reason,
    'actor_id', p_actor,
    'delta', p_delta,
    'old_balance', old_balance,
    'new_balance', new_balance
  );

  insert into public.credit_transactions (
    user_id, type, amount, balance_after, idempotency_key, metadata
  )
  values (
    p_user,
    'manual_adjustment',
    abs_amount,
    new_balance,
    p_idempotency_key,
    meta
  );

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'balance', new_balance,
    'old_balance', old_balance,
    'delta', p_delta
  );
end;
$$;

notify pgrst, 'reload schema';
