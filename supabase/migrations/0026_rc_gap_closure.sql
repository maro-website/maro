-- RC gap closure — budget guards seed, retention runs, snapshot/cost columns, help archive

alter table public.provider_cost_estimates
  add column if not exists cost_source text not null default 'usage_calculated',
  add column if not exists reconciliation_status text not null default 'estimated';

alter table public.pricing_snapshots
  add column if not exists kind text not null default 'purchase',
  add column if not exists generation_id uuid,
  add column if not exists job_id uuid,
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists pricing_snapshots_generation_idx
  on public.pricing_snapshots (generation_id);

alter table public.help_articles
  add column if not exists archived boolean not null default false;

alter table public.creator_commissions
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by uuid references auth.users (id) on delete set null,
  add column if not exists payment_reference text,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid references auth.users (id) on delete set null;

create table if not exists public.retention_execution_runs (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  status text not null check (status in ('success', 'partial', 'failed')),
  rows_affected integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists retention_execution_runs_started_idx
  on public.retention_execution_runs (started_at desc);

alter table public.retention_execution_runs enable row level security;

drop policy if exists "retention_runs_admin" on public.retention_execution_runs;
create policy "retention_runs_admin" on public.retention_execution_runs
  for select using (public.has_admin_access());

insert into public.budget_guards (scope, scope_key, daily_limit_usd, monthly_limit_usd, enabled, metadata)
values
  (
    'global',
    null,
    500,
    10000,
    false,
    '{"action":"block","warn_pct":80,"description":"Global AI spend guard (estimated USD)"}'::jsonb
  ),
  (
    'tool',
    'generate',
    200,
    null,
    false,
    '{"action":"warn","warn_pct":75,"description":"maroWeb generation spend (estimated)"}'::jsonb
  ),
  (
    'provider',
    'anthropic',
    300,
    null,
    false,
    '{"action":"block","warn_pct":85,"description":"Anthropic provider spend guard (estimated)"}'::jsonb
  )
on conflict do nothing;

notify pgrst, 'reload schema';
