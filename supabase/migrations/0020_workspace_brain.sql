-- MARO — maroBrain workspace profile + Burimet (reference sources)

alter table public.workspaces
  add column if not exists brain_profile jsonb not null default '{}'::jsonb;

create table if not exists public.workspace_sources (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  keywords text not null default '',
  file_url text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists workspace_sources_ws_idx
  on public.workspace_sources (workspace_id, created_at desc);

alter table public.workspace_sources enable row level security;

drop policy if exists "workspace_sources_owner_all" on public.workspace_sources;
create policy "workspace_sources_owner_all" on public.workspace_sources
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

notify pgrst, 'reload schema';
