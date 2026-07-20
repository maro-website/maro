-- MARO — Raporto (reports) + like/dislike on own generations
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- ---------------------------------------------------------------------------
-- reports: a user flags one of their own generations (image or website).
--   kind         = tool id or "image"/"website"
--   target_url   = the generated image url (for a quick admin preview)
--   prompt       = the prompt used (copied at report time)
--   credits_spent= what it cost (so admin can refund exactly)
--   status       = open | refunded | archived
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  user_email text,
  tool_id text,
  kind text,
  target_id text,
  target_url text,
  prompt text,
  message text,
  credits_spent int default 0,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status);

alter table public.reports enable row level security;

-- A user can create a report for themselves.
drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports
  for insert with check (auth.uid() = user_id);

-- A user can read their own reports; admins can read all.
drop policy if exists "reports read own or admin" on public.reports;
create policy "reports read own or admin" on public.reports
  for select using (auth.uid() = user_id or public.is_admin());

-- Only admins can update (refund / archive).
drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- generations: store the user's reaction to their own generation.
--   reaction = 'like' | 'dislike' | null
-- ---------------------------------------------------------------------------
alter table public.generations
  add column if not exists reaction text;

notify pgrst, 'reload schema';
