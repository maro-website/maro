-- MARO — Explore (public shared images) + Orders (credit purchases)
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- ---------------------------------------------------------------------------
-- public_creations: images users choose to share to the public Explore feed.
-- Writes/reads in the app go through the service role (API routes), so RLS is
-- enabled with no public policies (service role bypasses RLS).
-- ---------------------------------------------------------------------------
create table if not exists public.public_creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  tool_id text not null,
  prompt text not null default '',
  url text not null,
  author text,
  created_at timestamptz not null default now()
);

create index if not exists public_creations_created_at_idx
  on public.public_creations (created_at desc);

alter table public.public_creations enable row level security;

-- ---------------------------------------------------------------------------
-- credit_orders: record of credit purchases (populated by a payment webhook
-- later). Admin reads these via the service role in the dashboard.
-- ---------------------------------------------------------------------------
create table if not exists public.credit_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  credits integer not null default 0,
  amount_cents integer not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending',
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists credit_orders_created_at_idx
  on public.credit_orders (created_at desc);

alter table public.credit_orders enable row level security;

-- ---------------------------------------------------------------------------
-- app_settings: ad banners live inside the pricing json (pricing.ads), so no
-- schema change needed. Nothing to run here.
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
