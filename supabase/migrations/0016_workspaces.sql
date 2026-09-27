-- MARO — Workspaces (multi-brand containers per user)
-- Run in Supabase SQL editor.

create table if not exists public.workspaces (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Maro Workspace #1',
  icon_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on public.workspaces (owner_id, sort_order);

alter table public.workspaces enable row level security;

drop policy if exists "workspaces_owner_all" on public.workspaces;
create policy "workspaces_owner_all" on public.workspaces
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

alter table public.profiles
  add column if not exists active_workspace_id text references public.workspaces (id) on delete set null;

notify pgrst, 'reload schema';
