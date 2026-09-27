-- Fix engine_shadow_comparisons.workspace_id to match canonical Maro workspace ids (text ws_*)
-- Requires 0023_engine_hardening.sql
--
-- workspaces.id, generations.workspace_id, profiles.active_workspace_id, and
-- workspace_sources.workspace_id all use text ids referencing public.workspaces (id).
-- engine_shadow_comparisons incorrectly declared workspace_id as uuid in 0023.

alter table public.engine_shadow_comparisons
  alter column workspace_id type text using workspace_id::text;

alter table public.engine_shadow_comparisons
  drop constraint if exists engine_shadow_comparisons_workspace_id_fkey;

alter table public.engine_shadow_comparisons
  add constraint engine_shadow_comparisons_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces (id) on delete set null;

create index if not exists engine_shadow_comparisons_workspace_idx
  on public.engine_shadow_comparisons (workspace_id, created_at desc)
  where workspace_id is not null;

notify pgrst, 'reload schema';
