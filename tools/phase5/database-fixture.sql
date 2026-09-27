-- Disposable local PostgreSQL fixture: relevant existing columns/constraints only.
-- Not a production migration and never run against Supabase.
create role anon;
create role authenticated;
create role service_role;
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
