-- MARO Engine — Phase 2A foundation (additive, backwards-compatible)
-- Requires 0021_control_center_foundation.sql

-- ---------------------------------------------------------------------------
-- tool_engine_config — per-tool Engine metadata (one row per canonical tool id)
-- ---------------------------------------------------------------------------
create table if not exists public.tool_engine_config (
  tool_id text primary key,
  display_name text not null,
  registry_tool_id text not null,
  route text not null default '',
  status text not null default 'active'
    check (status in ('active', 'beta', 'maintenance', 'disabled', 'coming_soon')),
  production_pipeline text not null default 'legacy'
    check (production_pipeline in ('legacy', 'engine_v2')),
  default_model_id text,
  uses_brain boolean not null default false,
  uses_fort boolean not null default true,
  preset_support boolean not null default false,
  brain_mapping jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- system_prompt_versions — versioned internal system prompts
-- ---------------------------------------------------------------------------
create table if not exists public.system_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null references public.tool_engine_config (tool_id) on delete cascade,
  version_label text not null,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'live', 'archived')),
  content text not null default '',
  change_note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (tool_id, version_label)
);

create unique index if not exists system_prompt_versions_one_live_idx
  on public.system_prompt_versions (tool_id)
  where status = 'live';

create index if not exists system_prompt_versions_tool_status_idx
  on public.system_prompt_versions (tool_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- prompt_layers — conditional internal prompt intelligence
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_layers (
  id uuid primary key default gen_random_uuid(),
  layer_key text not null,
  tool_id text not null references public.tool_engine_config (tool_id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  priority integer not null default 0,
  conditions jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  version_label text not null default '1',
  status text not null default 'draft'
    check (status in ('draft', 'review', 'live', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool_id, layer_key)
);

create index if not exists prompt_layers_tool_live_idx
  on public.prompt_layers (tool_id, status, priority desc);

-- ---------------------------------------------------------------------------
-- tool_input_fields — schema-driven tool / maroFort inputs
-- ---------------------------------------------------------------------------
create table if not exists public.tool_input_fields (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null references public.tool_engine_config (tool_id) on delete cascade,
  field_key text not null,
  label text not null,
  description text not null default '',
  field_type text not null
    check (field_type in (
      'select', 'multi-select', 'text', 'textarea', 'number', 'toggle',
      'slider', 'color', 'asset', 'position-grid'
    )),
  placeholder text,
  options jsonb not null default '[]'::jsonb,
  default_value jsonb,
  required boolean not null default false,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  standard_visible boolean not null default false,
  fort_visible boolean not null default true,
  conditional_visibility jsonb not null default '[]'::jsonb,
  model_compatibility jsonb not null default '[]'::jsonb,
  preset_compatibility jsonb not null default '[]'::jsonb,
  cost_modifier jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool_id, field_key)
);

create index if not exists tool_input_fields_tool_order_idx
  on public.tool_input_fields (tool_id, sort_order);

-- ---------------------------------------------------------------------------
-- tool_model_configs — per-tool model enablement (no secrets)
-- ---------------------------------------------------------------------------
create table if not exists public.tool_model_configs (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null references public.tool_engine_config (tool_id) on delete cascade,
  model_id text not null,
  display_name text not null,
  provider text not null default 'unknown',
  enabled boolean not null default true,
  is_default boolean not null default false,
  is_fallback boolean not null default false,
  coming_soon boolean not null default false,
  sort_order integer not null default 0,
  cost_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (tool_id, model_id)
);

create unique index if not exists tool_model_configs_one_default_idx
  on public.tool_model_configs (tool_id)
  where is_default = true;

-- ---------------------------------------------------------------------------
-- RLS — admin read via has_admin_access; writes via service role APIs
-- ---------------------------------------------------------------------------
alter table public.tool_engine_config enable row level security;
alter table public.system_prompt_versions enable row level security;
alter table public.prompt_layers enable row level security;
alter table public.tool_input_fields enable row level security;
alter table public.tool_model_configs enable row level security;

drop policy if exists "tool_engine_config_admin_select" on public.tool_engine_config;
create policy "tool_engine_config_admin_select" on public.tool_engine_config
  for select using (public.has_admin_access());

drop policy if exists "system_prompt_versions_admin_select" on public.system_prompt_versions;
create policy "system_prompt_versions_admin_select" on public.system_prompt_versions
  for select using (public.has_admin_access());

drop policy if exists "prompt_layers_admin_select" on public.prompt_layers;
create policy "prompt_layers_admin_select" on public.prompt_layers
  for select using (public.has_admin_access());

drop policy if exists "tool_input_fields_admin_select" on public.tool_input_fields;
create policy "tool_input_fields_admin_select" on public.tool_input_fields
  for select using (public.has_admin_access());

drop policy if exists "tool_model_configs_admin_select" on public.tool_model_configs;
create policy "tool_model_configs_admin_select" on public.tool_model_configs
  for select using (public.has_admin_access());

notify pgrst, 'reload schema';
