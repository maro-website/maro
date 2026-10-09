-- Reuse the existing retention policy/run log. Preserve jobs, payments and credit ledgers.
begin;
create or replace function public.run_v1_debug_retention(p_batch integer default 500)
returns integer language plpgsql security definer set search_path = public
as $$
declare days integer; cutoff timestamptz; affected integer; prompts integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_batch < 1 or p_batch > 1000 then raise exception 'invalid_batch'; end if;
  if not pg_try_advisory_xact_lock(hashtext('maro_v1_debug_retention')) then return 0; end if;
  select retention_days into days from data_retention_policies where domain='generation_debug';
  if days is null or days < 1 or days > 3650 then raise exception 'invalid_retention_policy'; end if;
  cutoff := now()-make_interval(days=>days);
  with candidates as (
    select id from generation_jobs where created_at < cutoff and status in ('failed','completed','cancelled')
      and not (coalesce(metadata,'{}'::jsonb) ? 'debug_purged_at')
      and (status <> 'completed' or (coalesce(metadata,'{}'::jsonb) ?& array['spend_rollup_recorded_at','provider_cost_recorded_at']))
      and coalesce(metadata,'{}'::jsonb) ?| array['debug','tempPaths','promptPreview','v1_request','canonical_prompt','execution','compiled_prompt']
    order by created_at,id limit p_batch for update skip locked
  ) update generation_jobs j set metadata=coalesce(j.metadata,'{}'::jsonb)-
    array['debug','tempPaths','promptPreview','execution','compiled_prompt']
    || case when j.metadata ? 'v1_request' then jsonb_build_object('v1_request',
         (j.metadata->'v1_request')-array['prompt','references','logoWizard','preset','brain']) else '{}'::jsonb end
    || case when j.metadata ? 'canonical_prompt' then jsonb_build_object('canonical_prompt',
         (j.metadata->'canonical_prompt')-array['text','content','messages','compiledPrompt','compiled_prompt']) else '{}'::jsonb end
    || jsonb_build_object('debug_purged_at',now())
    from candidates c where j.id=c.id;
  get diagnostics affected = row_count;
  -- Only completed debug prompts; never remove a pending recovery payload.
  with candidates as (
    select p.generation_id from generation_internal_prompts p join generations g on g.id=p.generation_id join generation_jobs j on j.id=g.job_id
    where j.created_at < cutoff and j.status in ('failed','completed','cancelled')
    order by j.created_at,p.generation_id limit p_batch
  ) delete from generation_internal_prompts p using candidates c where p.generation_id=c.generation_id;
  get diagnostics prompts = row_count;
  insert into retention_execution_runs(domain,status,rows_affected,finished_at,metadata)
    values('generation_debug','success',affected+prompts,now(),jsonb_build_object('cutoff',cutoff,'policy_days',days,'job_rows',affected,'prompt_rows',prompts));
  return affected+prompts;
end $$;
revoke all on function public.run_v1_debug_retention(integer) from public,anon,authenticated;
grant execute on function public.run_v1_debug_retention(integer) to service_role;
notify pgrst, 'reload schema';
commit;
