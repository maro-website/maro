-- MARO — Canonical commerce: plans, top-ups, memberships, business leads
-- Membership validity is timestamp-authoritative (expires_at); status is derived at read time.

-- ---------------------------------------------------------------------------
-- commerce_plans — immutable canonical IDs (standard, pro, business)
-- ---------------------------------------------------------------------------
create table if not exists public.commerce_plans (
  id text primary key check (id in ('standard', 'pro', 'business')),
  enabled boolean not null default true,
  display_name text not null,
  description text not null default '',
  price_cents integer not null default 0,
  currency text not null default 'EUR',
  included_credits integer not null default 0,
  duration_days integer not null default 30,
  workspace_limit integer not null default 1,
  concurrency_limit integer not null default 1,
  renewal_window_days integer not null default 7,
  renewal_mode text not null default 'manual' check (renewal_mode in ('manual', 'automatic')),
  recommended_badge text,
  sort_order integer not null default 0,
  contact_only boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.commerce_plans (
  id, enabled, display_name, description, price_cents, included_credits,
  duration_days, workspace_limit, concurrency_limit, renewal_window_days,
  recommended_badge, sort_order, contact_only
) values
  (
    'standard', true, 'maroStandard', 'Fillim i shpejtë me AI',
    900, 100, 30, 1, 1, 7, null, 1, false
  ),
  (
    'pro', true, 'maroPro', 'Për krijues aktivë',
    3500, 500, 30, 5, 3, 7, 'Më i popullarizuari', 2, false
  ),
  (
    'business', true, 'maroBiz', 'Për ekipe dhe biznese',
    0, 0, 30, 10, 10, 7, null, 3, true
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- commerce_topups
-- ---------------------------------------------------------------------------
create table if not exists public.commerce_topups (
  id text primary key,
  credits integer not null check (credits > 0),
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'EUR',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  requires_active_plan boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.commerce_topups (id, credits, price_cents, sort_order) values
  ('topup-100', 100, 900, 1),
  ('topup-200', 200, 1700, 2),
  ('topup-500', 500, 4000, 3),
  ('topup-1000', 1000, 7500, 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null references public.commerce_plans (id),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  renewal_mode text not null default 'manual' check (renewal_mode in ('manual', 'automatic')),
  renewed_from_id uuid references public.memberships (id) on delete set null,
  cycle_renewal_fulfilled_at timestamptz,
  business_overrides jsonb not null default '{}'::jsonb,
  suspended boolean not null default false,
  persisted_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memberships_user_expires_idx
  on public.memberships (user_id, expires_at desc);

alter table public.memberships enable row level security;

drop policy if exists "memberships_user_select" on public.memberships;
create policy "memberships_user_select" on public.memberships
  for select using (auth.uid() = user_id or public.has_admin_access());

drop policy if exists "memberships_admin_all" on public.memberships;
create policy "memberships_admin_all" on public.memberships
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- business_leads
-- ---------------------------------------------------------------------------
create table if not exists public.business_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  status text not null default 'inquiry'
    check (status in ('inquiry', 'questionnaire_sent', 'reviewing', 'offer_sent', 'active', 'closed')),
  questionnaire jsonb not null default '{}'::jsonb,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_leads_status_idx
  on public.business_leads (status, created_at desc);

alter table public.business_leads enable row level security;

drop policy if exists "business_leads_admin" on public.business_leads;
create policy "business_leads_admin" on public.business_leads
  for all using (public.has_admin_access()) with check (public.has_admin_access());

drop policy if exists "business_leads_user_select" on public.business_leads;
create policy "business_leads_user_select" on public.business_leads
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RLS for commerce config
-- ---------------------------------------------------------------------------
alter table public.commerce_plans enable row level security;
alter table public.commerce_topups enable row level security;

drop policy if exists "commerce_plans_public_read" on public.commerce_plans;
create policy "commerce_plans_public_read" on public.commerce_plans
  for select using (enabled = true or public.has_admin_access());

drop policy if exists "commerce_plans_admin_write" on public.commerce_plans;
create policy "commerce_plans_admin_write" on public.commerce_plans
  for all using (public.has_admin_access()) with check (public.has_admin_access());

drop policy if exists "commerce_topups_public_read" on public.commerce_topups;
create policy "commerce_topups_public_read" on public.commerce_topups
  for select using (enabled = true or public.has_admin_access());

drop policy if exists "commerce_topups_admin_write" on public.commerce_topups;
create policy "commerce_topups_admin_write" on public.commerce_topups
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- Backfill existing internal users
-- ---------------------------------------------------------------------------
insert into public.memberships (user_id, plan_id, started_at, expires_at, renewal_mode)
select
  p.id,
  case when p.maro_plan = 'biz' then 'business' else p.maro_plan end,
  now(),
  now() + interval '30 days',
  'manual'
from public.profiles p
where p.maro_plan in ('standard', 'pro', 'biz', 'business')
  and not exists (
    select 1 from public.memberships m
    where m.user_id = p.id and m.expires_at > now()
  );

update public.profiles set maro_plan = 'business' where maro_plan = 'biz';

notify pgrst, 'reload schema';
