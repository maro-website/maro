-- MARO — Maro Kreator (affiliate) + promo codes
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- ---------------------------------------------------------------------------
-- profiles: creator flag
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_creator boolean not null default false;

-- ---------------------------------------------------------------------------
-- promo_codes: discount codes. May belong to a creator (affiliate).
--   code  = the sale code buyers type (e.g. "KREATORI-10")
--   slug  = the referral-link slug (maro.al/r/<slug>)
-- ---------------------------------------------------------------------------
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  slug text unique,
  discount_percent int not null default 10 check (discount_percent between 0 and 100),
  active boolean not null default true,
  creator_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

drop policy if exists "promo read active" on public.promo_codes;
create policy "promo read active" on public.promo_codes
  for select using (active or public.is_admin());

drop policy if exists "promo admin write" on public.promo_codes;
create policy "promo admin write" on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- promo_events: referral usage (link visits + code applications)
-- ---------------------------------------------------------------------------
create table if not exists public.promo_events (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind text not null check (kind in ('link', 'code')),
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists promo_events_code_idx on public.promo_events (code);

alter table public.promo_events enable row level security;

drop policy if exists "promo events insert" on public.promo_events;
create policy "promo events insert" on public.promo_events
  for insert with check (true);

drop policy if exists "promo events admin read" on public.promo_events;
create policy "promo events admin read" on public.promo_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- creator_applications: "join as creator" requests
-- ---------------------------------------------------------------------------
create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  instagram text,
  tiktok text,
  facebook text,
  youtube text,
  website text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.creator_applications enable row level security;

drop policy if exists "creator apply insert" on public.creator_applications;
create policy "creator apply insert" on public.creator_applications
  for insert with check (true);

drop policy if exists "creator apply admin" on public.creator_applications;
create policy "creator apply admin" on public.creator_applications
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- credit_orders: tag purchases with the promo code used (for creator stats)
-- ---------------------------------------------------------------------------
alter table public.credit_orders
  add column if not exists promo_code text;

notify pgrst, 'reload schema';
