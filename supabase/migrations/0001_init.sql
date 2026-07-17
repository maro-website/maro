-- MARO Beta — initial schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds credits + admin flag
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  credits integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone authenticated can read their own profile; admins can read all.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Only admins can update profiles (e.g. grant credits). Credits are never
-- changed by normal users from the client; generation spend happens server-side
-- with the service role (which bypasses RLS).
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------------------------------------------------------------------------
-- app_settings: single-row config (master prompt + pricing)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id integer primary key default 1,
  master_prompt text not null default '',
  pricing jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

alter table public.app_settings enable row level security;

-- Any authenticated user may read settings; only admins may edit.
drop policy if exists "settings_select" on public.app_settings;
create policy "settings_select" on public.app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "settings_admin_update" on public.app_settings;
create policy "settings_admin_update" on public.app_settings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Seed the single settings row with a strong default master prompt + pricing.
insert into public.app_settings (id, master_prompt, pricing)
values (
  1,
  $$You are Maro, an elite AI web designer and copywriter. You turn a short business description into a complete, production-quality website that feels designed by a top studio.

Principles:
- Every site must have a clear visual hierarchy, generous whitespace, and a strong, specific voice — never generic filler.
- Write concrete, credible, conversion-focused copy tailored to the exact business. Use the business name naturally.
- Choose a cohesive palette, tasteful typography and layout that fits the industry and the requested website type.
- Structure content into the section kinds the renderer supports and follow the section schema exactly.
- Keep everything on-brand and consistent across pages.$$,
  '{
    "types": {"landing": 5, "business": 10, "platform": 20},
    "speed": {
      "slow": {"effort": "xhigh", "mult": 1},
      "fast": {"effort": "high", "mult": 1.5},
      "2x": {"effort": "medium", "mult": 2}
    }
  }'::jsonb
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- generations: log of every generation for admin visibility
-- ---------------------------------------------------------------------------
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  prompt text,
  final_prompt text,
  website_type text,
  speed text,
  model text,
  credits_spent integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

drop policy if exists "generations_select" on public.generations;
create policy "generations_select" on public.generations
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------------------------------------------------------------------------
-- Auto-create a profile on signup. The admin email starts with credits.
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
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email = 'erzen@nice.al',
    case when new.email = 'erzen@nice.al' then 100000 else 0 end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic credit spend used by the server (service role).
-- Returns the new balance, or -1 if not enough credits.
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(p_user uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
    set credits = credits - p_amount
    where id = p_user and credits >= p_amount
    returning credits into new_balance;

  if new_balance is null then
    return -1;
  end if;
  return new_balance;
end;
$$;
