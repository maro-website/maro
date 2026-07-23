-- MARO — maroFort mode (premium expert creation) + subscription plan
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- ---------------------------------------------------------------------------
-- profiles: subscription plan (free | fort). fort_until reserved for future
-- expiry enforcement (renewals). hasFort is derived as plan = 'fort'.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  add column if not exists fort_until timestamptz;

-- ---------------------------------------------------------------------------
-- app_settings: admin-managed maroFort configuration (schema overrides,
-- prompt layers, labels, defaults). Kept separate from `pricing`.
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column if not exists fort_config jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- generations: persist the composer selections and the maroFort payload
-- (enabled status, field values, applied prompt-layer ids, optional brief).
-- ---------------------------------------------------------------------------
alter table public.generations
  add column if not exists selections jsonb;

alter table public.generations
  add column if not exists fort jsonb;

notify pgrst, 'reload schema';
