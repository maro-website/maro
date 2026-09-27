-- Phase 2A.5 — Engine hardening + shadow mode preparation (additive)
-- Requires 0022_maro_engine.sql

-- Expand pipeline states: legacy | shadow | engine
alter table public.tool_engine_config
  drop constraint if exists tool_engine_config_production_pipeline_check;

alter table public.tool_engine_config
  add constraint tool_engine_config_production_pipeline_check
  check (production_pipeline in ('legacy', 'shadow', 'engine', 'engine_v2'));

-- Normalize legacy engine_v2 label to engine
update public.tool_engine_config
set production_pipeline = 'engine'
where production_pipeline = 'engine_v2';

-- ---------------------------------------------------------------------------
-- engine_shadow_comparisons — internal legacy vs engine comparison records
-- ---------------------------------------------------------------------------
create table if not exists public.engine_shadow_comparisons (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid,
  job_id uuid,
  tool_id text not null,
  registry_tool_id text not null,
  model_id text not null,
  user_id uuid,
  workspace_id uuid,
  production_pipeline text not null default 'shadow',
  legacy_snapshot jsonb not null default '{}'::jsonb,
  engine_snapshot jsonb not null default '{}'::jsonb,
  structural_diff jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  compile_error text,
  created_at timestamptz not null default now()
);

create index if not exists engine_shadow_comparisons_tool_created_idx
  on public.engine_shadow_comparisons (tool_id, created_at desc);

create index if not exists engine_shadow_comparisons_generation_idx
  on public.engine_shadow_comparisons (generation_id)
  where generation_id is not null;

alter table public.engine_shadow_comparisons enable row level security;

drop policy if exists "engine_shadow_comparisons_admin_select" on public.engine_shadow_comparisons;
create policy "engine_shadow_comparisons_admin_select" on public.engine_shadow_comparisons
  for select using (public.has_admin_access());

notify pgrst, 'reload schema';
