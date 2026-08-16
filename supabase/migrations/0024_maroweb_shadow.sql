-- Phase 2B.1 — maroWeb shadow rollout (additive)
-- Requires 0023_engine_hardening.sql

alter table public.engine_shadow_comparisons
  add column if not exists review_status text not null default 'unreviewed',
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists critical_mismatch boolean not null default false,
  add column if not exists critical_flags jsonb not null default '[]'::jsonb,
  add column if not exists compile_status text not null default 'success',
  add column if not exists context_metadata jsonb not null default '{}'::jsonb;

alter table public.engine_shadow_comparisons
  drop constraint if exists engine_shadow_comparisons_review_status_check;

alter table public.engine_shadow_comparisons
  add constraint engine_shadow_comparisons_review_status_check
  check (review_status in ('unreviewed', 'looks_good', 'needs_fix', 'expected_difference'));

alter table public.engine_shadow_comparisons
  drop constraint if exists engine_shadow_comparisons_compile_status_check;

alter table public.engine_shadow_comparisons
  add constraint engine_shadow_comparisons_compile_status_check
  check (compile_status in ('success', 'failed'));

create index if not exists engine_shadow_comparisons_review_idx
  on public.engine_shadow_comparisons (tool_id, review_status, created_at desc);

create index if not exists engine_shadow_comparisons_critical_idx
  on public.engine_shadow_comparisons (tool_id, critical_mismatch, created_at desc)
  where critical_mismatch = true;

-- Phase 2B.1: maroWeb shadow ONLY; all other live tools remain legacy
update public.tool_engine_config
set production_pipeline = 'legacy', updated_at = now()
where tool_id in ('maro_imazh', 'maro_logo', 'maro_marketing', 'maro_filma', 'maro_zo');

update public.tool_engine_config
set production_pipeline = 'shadow', updated_at = now()
where tool_id = 'maro_web';

notify pgrst, 'reload schema';
