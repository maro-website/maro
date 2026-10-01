-- Disposable local PostgreSQL fixture: relevant existing columns/constraints only.
-- Not a production migration and never run against Supabase.



create schema auth;
create schema storage;
create table auth.users(id uuid primary key default gen_random_uuid());
create table public.profiles(id uuid primary key references auth.users(id), email text, credits integer not null default 0, credits_reserved integer not null default 0);
create table public.generation_jobs(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  module text not null, model text, status text not null default 'pending' check(status in ('pending','reserved','processing','completed','failed','cancelled')),
  idempotency_key text, credits_reserved integer not null default 0, credits_charged integer not null default 0,
  provider_cost_usd numeric(12,6), input_tokens integer, output_tokens integer, retry_count integer not null default 0, priority integer not null default 0,
  error text, metadata jsonb default '{}'::jsonb, started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now()
);
create unique index generation_jobs_idempotency_active_idx on public.generation_jobs(user_id,idempotency_key) where idempotency_key is not null and status in ('pending','reserved','processing');
create table public.workspaces(id text primary key, owner_id uuid not null references auth.users(id));
create table public.generations(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), user_email text, prompt text, final_prompt text, model text, credits_spent integer not null default 0, tool_id text, kind text, output_urls text[], selections jsonb, workspace_id text references public.workspaces(id), created_at timestamptz default now());
create table public.credit_transactions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),job_id uuid references public.generation_jobs(id),type text not null check(type in ('reserve','charge','refund','manual_adjustment','release')),amount integer not null check(amount>=0),balance_after integer,idempotency_key text,metadata jsonb default '{}'::jsonb,created_at timestamptz default now());
create unique index credit_transactions_one_charge_per_job_idx on public.credit_transactions(job_id) where type='charge' and job_id is not null;
create table public.pricing_snapshots(id uuid primary key default gen_random_uuid(),job_id uuid references public.generation_jobs(id),generation_id uuid references public.generations(id),user_id uuid,kind text,snapshot jsonb);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));

-- MARO Engine â€” Phase 2A foundation (additive, backwards-compatible)
-- Requires 0021_control_center_foundation.sql

-- ---------------------------------------------------------------------------
-- tool_engine_config â€” per-tool Engine metadata (one row per canonical tool id)
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
-- system_prompt_versions â€” versioned internal system prompts
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
-- prompt_layers â€” conditional internal prompt intelligence
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
-- tool_input_fields â€” schema-driven tool / maroFort inputs
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
-- tool_model_configs â€” per-tool model enablement (no secrets)
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

create table public.app_settings(id integer primary key check(id=1));
insert into app_settings values(1);
create table public.audit_events(id uuid primary key default gen_random_uuid(),actor_id uuid,action text,target_type text,target_id text,before_state jsonb,after_state jsonb,request_id text,metadata jsonb default '{}',created_at timestamptz default now());
insert into tool_engine_config(tool_id,display_name,registry_tool_id) values('maro_imazh','maroImazh','reklama'),('maro_logo','maroLogo','logo');
