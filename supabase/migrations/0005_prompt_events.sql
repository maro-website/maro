-- MARO — Prompt analytics (views & copies)
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- Every time a user opens an image to see its prompt ("view") or clicks the
-- copy button ("copy") we record an event. Admin aggregates these per prompt.
create table if not exists public.prompt_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('view', 'copy')),
  tool_id text,
  prompt text not null default '',
  url text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists prompt_events_created_at_idx
  on public.prompt_events (created_at desc);

-- Writes/reads go through the service role (API + admin), so RLS is enabled
-- with no public policies.
alter table public.prompt_events enable row level security;

notify pgrst, 'reload schema';
