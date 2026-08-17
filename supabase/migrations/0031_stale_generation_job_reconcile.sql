-- Process-death recovery: reconcile stale in-flight generation jobs without app traffic.
-- Requires 0011_abuse_protection.sql and 0027_credit_finalize_idempotency.sql

create or replace function public.reconcile_stale_generation_jobs(p_stale_minutes integer default 15)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reconciled integer := 0;
  r record;
  cutoff timestamptz := now() - make_interval(mins => p_stale_minutes);
begin
  for r in
    select id
    from public.generation_jobs
    where status in ('pending', 'reserved', 'processing')
      and created_at < cutoff
  loop
    perform public.release_credit_reserve(r.id, 'stale-' || r.id::text);
    update public.generation_jobs
    set status = 'failed',
        error = 'stale_timeout',
        finished_at = coalesce(finished_at, now())
    where id = r.id
      and status not in ('completed', 'cancelled');
    reconciled := reconciled + 1;
  end loop;

  return reconciled;
end;
$$;

comment on function public.reconcile_stale_generation_jobs(integer) is
  'Fail stale in-flight generation_jobs and release reserved credits. Idempotent via release_credit_reserve.';

-- Manual Supabase pg_cron setup (after enabling pg_cron extension in Dashboard):
-- select cron.schedule(
--   'reconcile-stale-generation-jobs',
--   '*/10 * * * *',
--   $$ select public.reconcile_stale_generation_jobs(15); $$
-- );

notify pgrst, 'reload schema';
