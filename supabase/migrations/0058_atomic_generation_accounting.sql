-- Atomic, exactly-once spend rollups for the existing generation accounting.
begin;

-- Serialize V1 admission with rollup recording. Existing limits and cost
-- fallback estimates are reused; this reserves exposure, not customer credits.
create or replace function public.create_v1_generation_job(
  p_user_id uuid,p_module text,p_model text,p_idempotency_key text,p_priority integer,
  p_metadata jsonb,p_exposure_usd numeric,p_max_concurrent integer
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  j public.generation_jobs%rowtype; limits jsonb; admin_user boolean; paused boolean;
  active_global integer; active_user integer; exposure numeric; user_exposure numeric;
  hour_spend numeric; day_spend numeric; user_hour numeric; user_day numeric;
  utc_hour timestamptz := date_trunc('hour',now(),'UTC');
  utc_day timestamptz := date_trunc('day',now(),'UTC');
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_module is null or p_module not in ('reklama','logo') or p_exposure_usd is null or p_exposure_usd <= 0 or p_exposure_usd > 10000
    or p_max_concurrent is null or p_max_concurrent < 1 or p_max_concurrent > 100 then raise exception 'invalid_admission'; end if;
  perform pg_advisory_xact_lock(hashtext('maro-v1-spend-admission'));
  select is_admin into admin_user from public.profiles where id=p_user_id;
  if not found then raise exception 'admission_policy_unavailable'; end if;
  if not coalesce(admin_user,false) then
    select coalesce(platform_limits,'{}'::jsonb),coalesce(ai_paused,false) into limits,paused from public.app_settings where id=1;
    if not found then raise exception 'admission_policy_unavailable'; end if;
    if paused or coalesce((limits->>'aiPaused')::boolean,false) then raise exception 'ai_paused'; end if;
    if coalesce(limits->'pausedModules','[]'::jsonb) ? p_module then raise exception 'module_paused'; end if;
    select count(*)::integer,count(*) filter(where user_id=p_user_id)::integer,
      coalesce(sum(coalesce((metadata->>'budget_exposure_usd')::numeric,case when module='website' then 2.5 when module in ('logo','reklama') then 0.35 else 0 end)),0),
      coalesce(sum(coalesce((metadata->>'budget_exposure_usd')::numeric,case when module='website' then 2.5 when module in ('logo','reklama') then 0.35 else 0 end)) filter(where user_id=p_user_id),0)
      into active_global,active_user,exposure,user_exposure from public.generation_jobs
      where status in ('pending','reserved','processing');
    if active_global >= coalesce((limits->>'maxActiveJobsGlobal')::integer,50)
      or active_global >= coalesce((limits->>'maxQueueSize')::integer,200) then raise exception 'platform_busy'; end if;
    if active_user >= p_max_concurrent then raise exception 'concurrency_limit'; end if;
    select coalesce(sum(spend_usd) filter(where bucket_type='hour' and bucket_start=utc_hour and user_id='00000000-0000-0000-0000-000000000000'),0),
      coalesce(sum(spend_usd) filter(where bucket_type='day' and bucket_start=utc_day and user_id='00000000-0000-0000-0000-000000000000'),0),
      coalesce(sum(spend_usd) filter(where bucket_type='hour' and bucket_start=utc_hour and user_id=p_user_id),0),
      coalesce(sum(spend_usd) filter(where bucket_type='day' and bucket_start=utc_day and user_id=p_user_id),0)
      into hour_spend,day_spend,user_hour,user_day from public.platform_spend_rollup
      where bucket_start >= utc_day;
    -- Keep a completion whose auxiliary rollup is awaiting repair in the
    -- exposure calculation, so settlement cannot create an admission gap.
    select hour_spend+coalesce(sum(coalesce(provider_cost_usd,(metadata->>'budget_exposure_usd')::numeric,case when module='website' then 2.5 when module in ('logo','reklama') then 0.35 else 0 end)) filter(where finished_at>=utc_hour),0),
      day_spend+coalesce(sum(coalesce(provider_cost_usd,(metadata->>'budget_exposure_usd')::numeric,case when module='website' then 2.5 when module in ('logo','reklama') then 0.35 else 0 end)),0),
      user_hour+coalesce(sum(coalesce(provider_cost_usd,(metadata->>'budget_exposure_usd')::numeric,case when module='website' then 2.5 when module in ('logo','reklama') then 0.35 else 0 end)) filter(where user_id=p_user_id and finished_at>=utc_hour),0),
      user_day+coalesce(sum(coalesce(provider_cost_usd,(metadata->>'budget_exposure_usd')::numeric,case when module='website' then 2.5 when module in ('logo','reklama') then 0.35 else 0 end)) filter(where user_id=p_user_id),0)
      into hour_spend,day_spend,user_hour,user_day from public.generation_jobs
      where status='completed' and finished_at>=utc_day and not(coalesce(metadata,'{}'::jsonb) ? 'spend_rollup_recorded_at');
    if hour_spend+exposure+p_exposure_usd > coalesce((limits->>'hourlySpendUsd')::numeric,100) then raise exception 'hourly_spend_limit'; end if;
    if day_spend+exposure+p_exposure_usd > coalesce((limits->>'dailySpendUsd')::numeric,500) then raise exception 'daily_spend_limit'; end if;
    if user_hour+user_exposure+p_exposure_usd > coalesce((limits->>'userHourlyUsd')::numeric,10) then raise exception 'user_hourly_spend_limit'; end if;
    if user_day+user_exposure+p_exposure_usd > coalesce((limits->>'userDailyUsd')::numeric,50) then raise exception 'user_daily_spend_limit'; end if;
  end if;
  insert into public.generation_jobs(user_id,module,model,status,idempotency_key,priority,metadata)
    values(p_user_id,p_module,p_model,'pending',p_idempotency_key,p_priority,
      coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('budget_exposure_usd',p_exposure_usd)) returning * into j;
  return to_jsonb(j);
end $$;
revoke all on function public.create_v1_generation_job(uuid,text,text,text,integer,jsonb,numeric,integer) from public,anon,authenticated;
grant execute on function public.create_v1_generation_job(uuid,text,text,text,integer,jsonb,numeric,integer) to service_role;

create or replace function public.record_job_spend(
  p_job_id uuid, p_user_id uuid, p_module text, p_spend_usd numeric, p_credits integer
) returns boolean language plpgsql security definer set search_path = public
as $$
declare j public.generation_jobs%rowtype; bucket timestamptz; kind text; uid uuid; mod text;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_spend_usd is null or p_spend_usd < 0 or p_spend_usd > 10000
    or p_credits is null or p_credits < 0 or p_module is null or length(p_module) > 100 then
    raise exception 'invalid_spend';
  end if;
  perform pg_advisory_xact_lock(hashtext('maro-v1-spend-admission'));
  select * into j from public.generation_jobs where id = p_job_id for update;
  if not found or j.user_id is distinct from p_user_id or j.module <> p_module or j.status <> 'completed'
    or j.credits_charged is distinct from p_credits then
    raise exception 'completed_job_required';
  end if;
  if coalesce(j.metadata,'{}'::jsonb) ? 'spend_rollup_recorded_at' then return false; end if;
  foreach kind in array array['hour','day'] loop
    bucket := date_trunc(kind,coalesce(j.finished_at,now()),'UTC');
    for uid,mod in select '00000000-0000-0000-0000-000000000000'::uuid,''::text
      union all select p_user_id,p_module loop
      insert into public.platform_spend_rollup(bucket_start,bucket_type,user_id,module,spend_usd,credits_charged,job_count)
      values(bucket,kind,uid,mod,p_spend_usd,p_credits,1)
      on conflict(bucket_start,bucket_type,user_id,module) do update
        set spend_usd = platform_spend_rollup.spend_usd + excluded.spend_usd,
            credits_charged = platform_spend_rollup.credits_charged + excluded.credits_charged,
            job_count = platform_spend_rollup.job_count + 1;
    end loop;
  end loop;
  update public.generation_jobs set metadata = coalesce(metadata,'{}'::jsonb) ||
    jsonb_build_object('spend_rollup_recorded_at',now()) where id = p_job_id;
  return true;
end $$;
revoke all on function public.record_job_spend(uuid,uuid,text,numeric,integer) from public,anon,authenticated;
grant execute on function public.record_job_spend(uuid,uuid,text,numeric,integer) to service_role;

create or replace function public.record_provider_cost(p_job_id uuid,p_record jsonb)
returns boolean language plpgsql security definer set search_path = public
as $$
declare j public.generation_jobs%rowtype;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  select * into j from public.generation_jobs where id=p_job_id for update;
  if not found or j.status <> 'completed' then raise exception 'completed_job_required'; end if;
  if not exists(select 1 from public.provider_cost_estimates where job_id=p_job_id) then
    if (p_record->>'estimated_cost_usd')::numeric is null
      or (p_record->>'estimated_cost_usd')::numeric < 0
      or (p_record->>'estimated_cost_usd')::numeric > 10000 then raise exception 'invalid_cost'; end if;
    insert into public.provider_cost_estimates(
      generation_id,job_id,tool_id,model_id,provider,estimated_cost_usd,input_tokens,output_tokens,
      cost_source,reconciliation_status,metadata
    ) values (
      nullif(p_record->>'generation_id','')::uuid,p_job_id,j.module,
      p_record->>'model_id',p_record->>'provider',(p_record->>'estimated_cost_usd')::numeric,
      (p_record->>'input_tokens')::integer,(p_record->>'output_tokens')::integer,
      p_record->>'cost_source',p_record->>'reconciliation_status',coalesce(p_record->'metadata','{}'::jsonb)
    );
  end if;
  update public.generation_jobs set metadata=coalesce(metadata,'{}'::jsonb) ||
    jsonb_build_object('provider_cost_recorded_at',now()) where id=p_job_id;
  return true;
end $$;
revoke all on function public.record_provider_cost(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_provider_cost(uuid,jsonb) to service_role;

-- Existing completions used the old rollup mechanism. Do not replay their spend
-- into existing buckets during repair. Historical totals are not recalculated.
update public.generation_jobs set metadata=coalesce(metadata,'{}'::jsonb) ||
  jsonb_build_object('spend_rollup_recorded_at',now(),'spend_rollup_legacy',true)
  where status='completed' and not (coalesce(metadata,'{}'::jsonb) ? 'spend_rollup_recorded_at');
update public.generation_jobs j set metadata=coalesce(j.metadata,'{}'::jsonb) ||
  jsonb_build_object('provider_cost_recorded_at',now())
  where exists(select 1 from public.provider_cost_estimates c where c.job_id=j.id);

-- Complete period aggregation; no client row-limit truncation at campaign volume.
create or replace function public.provider_spend_total(p_scope text,p_scope_key text,p_since timestamptz)
returns numeric language sql stable security definer set search_path = public
as $$
  with exposure as (
    select estimated_cost_usd as usd,tool_id,provider from public.provider_cost_estimates where created_at>=p_since
    union all
    select coalesce(j.provider_cost_usd,(j.metadata->>'budget_exposure_usd')::numeric,
        case when j.module='website' then 2.5 when j.module in ('logo','reklama') then 0.35 else 0 end),j.module,
      coalesce(j.metadata->'v1_request'->'model'->>'provider',case when j.module in ('logo','reklama') then 'openai' when j.module='zo' then 'elevenlabs' else 'anthropic' end)
      from public.generation_jobs j
      where (j.status in ('pending','reserved','processing') or (j.status='completed' and j.finished_at>=p_since
        and not(coalesce(j.metadata,'{}'::jsonb) @> '{"spend_rollup_legacy":true}'::jsonb)))
        and not exists(select 1 from public.provider_cost_estimates c where c.job_id=j.id)
  )
  select coalesce(sum(usd),0) from exposure
  where coalesce(auth.role(),'') = 'service_role'
    and (p_scope <> 'tool' or tool_id = p_scope_key)
    and (p_scope <> 'provider' or provider = p_scope_key);
$$;
revoke all on function public.provider_spend_total(text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.provider_spend_total(text,text,timestamptz) to service_role;

notify pgrst, 'reload schema';
commit;
