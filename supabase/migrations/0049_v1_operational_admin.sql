begin;
-- Logo content belongs to the existing settings singleton, outside Fort schemas.
alter table public.app_settings add column if not exists logo_wizard_content jsonb;

-- The legacy settings table has admin UPDATE policies. This new authoritative
-- column must be written through the validated, MFA-gated service API instead.
create or replace function public.guard_logo_wizard_content_write()
returns trigger language plpgsql set search_path=public as $$
begin
  if (tg_op='INSERT' and new.logo_wizard_content is not null)
    or (tg_op='UPDATE' and new.logo_wizard_content is distinct from old.logo_wizard_content) then
    if current_user <> 'service_role' and not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and rolsuper) then
      raise exception 'logo_content_requires_admin_api' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_logo_wizard_content_write on public.app_settings;
create trigger guard_logo_wizard_content_write before insert or update of logo_wizard_content on public.app_settings
for each row execute function public.guard_logo_wizard_content_write();

-- Atomic admin mutations of existing production configuration. No duplicate store.
create or replace function public.admin_publish_v1_prompt(p_id uuid, p_actor uuid, p_rollback boolean default false)
returns public.system_prompt_versions language plpgsql security definer set search_path=public as $$
declare t public.system_prompt_versions;
begin
  select * into t from public.system_prompt_versions where id=p_id;
  if t.id is null or t.tool_id not in ('maro_imazh','maro_logo') then raise exception 'invalid_prompt'; end if;
  perform 1 from public.tool_engine_config where tool_id=t.tool_id for update;
  select * into t from public.system_prompt_versions where id=p_id for update;
  if (not p_rollback and t.status not in ('draft','review')) or (p_rollback and t.status <> 'archived') then raise exception 'invalid_prompt_status'; end if;
  if length(btrim(t.content))=0 or length(t.content)>100000 then raise exception 'invalid_prompt_content'; end if;
  update public.system_prompt_versions set status='archived' where tool_id=t.tool_id and status='live';
  update public.system_prompt_versions set status='live',published_by=p_actor,published_at=now() where id=p_id returning * into t;
  return t;
end $$;

create or replace function public.admin_save_v1_models(p_tool text, p_models jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare m jsonb; expected_count integer;
begin
  if p_tool not in ('maro_imazh','maro_logo') then raise exception 'invalid_module'; end if;
  perform 1 from public.tool_engine_config where tool_id=p_tool for update;
  expected_count := case when p_tool='maro_logo' then 1 else 2 end;
  if jsonb_typeof(p_models) <> 'array' or jsonb_array_length(p_models) <> expected_count then raise exception 'invalid_model_set'; end if;
  if (select count(distinct value->>'key') from jsonb_array_elements(p_models)) <> expected_count
    or (select count(*) from jsonb_array_elements(p_models) where value->>'isDefault'='true') <> 1
    or (select count(*) from jsonb_array_elements(p_models) where value->>'isDefault'='true' and value->>'enabled'='true') <> 1 then raise exception 'invalid_default'; end if;
  for m in select value from jsonb_array_elements(p_models) loop
    if m->>'key' not in ('flare','sunburst') or (p_tool='maro_logo' and m->>'key'<>'flare')
      or jsonb_typeof(m->'enabled') is distinct from 'boolean' or jsonb_typeof(m->'isDefault') is distinct from 'boolean'
      or jsonb_typeof(m->'customerCredits') is distinct from 'number' or (m->>'customerCredits') !~ '^[1-9][0-9]*$'
      or (m->>'customerCredits')::numeric>2147483647
      or jsonb_typeof(m->'order') is distinct from 'number' or (m->>'order') !~ '^[0-9]+$'
      or (m->>'order')::numeric>2147483647
      or jsonb_typeof(m->'label') is distinct from 'string' or length(btrim(m->>'label')) not between 1 and 80
      or jsonb_typeof(m->'descriptor') is distinct from 'string' or length(m->>'descriptor')>240
      then raise exception 'invalid_model_configuration'; end if;
    if not exists(select 1 from public.tool_model_configs where tool_id=p_tool and model_id=m->>'key'
      and provider='openai' and metadata->>'providerModelId'='gpt-image-2.5-'||(m->>'key')) then raise exception 'model_not_configured'; end if;
  end loop;
  -- Unique partial index requires clearing the old default within this transaction.
  update public.tool_model_configs set is_default=false where tool_id=p_tool and is_default;
  for m in select value from jsonb_array_elements(p_models) loop
    update public.tool_model_configs set display_name=btrim(m->>'label'),enabled=(m->>'enabled')::boolean,
      is_default=(m->>'isDefault')::boolean,coming_soon=false,sort_order=(m->>'order')::integer,
      metadata=metadata||jsonb_build_object('description',m->>'descriptor'),
      cost_metadata=cost_metadata||jsonb_build_object('customerCredits',(m->>'customerCredits')::integer),updated_at=clock_timestamp()
      where tool_id=p_tool and model_id=m->>'key';
  end loop;
end $$;

revoke all on function public.admin_publish_v1_prompt(uuid,uuid,boolean), public.admin_save_v1_models(text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_publish_v1_prompt(uuid,uuid,boolean), public.admin_save_v1_models(text,jsonb) to service_role;

-- Safe operational projection; neither prompts, Brain, nor output URLs are returned.
create or replace function public.admin_v1_operations(p_before timestamptz default null, p_status text default null)
returns jsonb language sql stable security definer set search_path=public as $$
with jobs as (
 select * from public.generation_jobs where metadata->>'v1_durable'='true' and metadata#>>'{v1_request,module}' in ('maro_imazh','maro_logo')
), page as (
 select * from jobs where (p_before is null or created_at<p_before) and (p_status is null or status=p_status)
 order by created_at desc,id desc limit 50
), evidence as (
 select j.*, g.id as generation_id,
 exists(select 1 from storage.objects o where o.bucket_id='generations' and o.name=j.user_id::text||'/'||j.id::text||'/output.png' and coalesce((o.metadata->>'size')::bigint,0)>0) as stored,
 exists(select 1 from public.credit_transactions t where t.job_id=j.id and t.type='charge') as charged,
 exists(select 1 from public.credit_transactions t where t.job_id=j.id and t.type='release') as released
 from page j left join public.generations g on g.job_id=j.id
)
select jsonb_build_object(
 'counts',(select jsonb_build_object('total',count(*),'failed',count(*) filter(where status='failed'),
 'pending',count(*) filter(where status in ('pending','reserved','processing')),
 'stale',count(*) filter(where status in ('pending','reserved','processing') and created_at<=now()-interval '15 minutes'),
 'settlementPending',count(*) filter(where metadata#>>'{v1_lifecycle,phase}'='settlement_pending' and status not in ('completed','failed','cancelled'))) from jobs),
 'jobs',coalesce((select jsonb_agg(jsonb_build_object(
 'id',id,'createdAt',created_at,'userId',user_id,'module',metadata#>>'{v1_request,module}','model',metadata#>>'{v1_request,logicalModel}',
 'provider',metadata#>>'{v1_request,model,provider}','providerModelId',metadata#>>'{v1_request,model,providerModelId}',
 'status',status,'generationId',generation_id,'reserved',credits_reserved,'charged',credits_charged,
 'configuredCredits',metadata#>'{v1_request,model,customerCredits}',
 'output',case when stored then 'stored' else 'missing' end,'history',case when generation_id is not null then 'saved' else 'missing' end,
 'settlement',case when charged then 'charged' when released then 'released' when credits_reserved>0 then 'reserved' else 'none' end,
 'phase',metadata#>>'{v1_lifecycle,phase}',
 'failure',case when error in ('provider_failed','provider_output_invalid','storage_failed','history_failed','execution_trace_unavailable','execution_interrupted','settlement_pending') then error when error is not null then 'other_failure' else null end,
 'retainedOrphan',stored and generation_id is null and (status in ('failed','cancelled') or created_at<=now()-interval '15 minutes'),'recoveredFromJobId',metadata->>'recovered_from_job_id',
 'latencyMs',metadata#>'{execution,image_provider,latencyMs}',
 'eligible',status in ('pending','reserved','processing') and created_at<=now()-interval '15 minutes'
 ) order by created_at desc,id desc) from evidence),'[]'::jsonb),
 'recentReconciliation',coalesce((select jsonb_agg(a) from (select created_at,action,target_id,metadata from public.audit_events
 where action='v1.job.reconciled' order by created_at desc limit 10) a),'[]'::jsonb)
);
$$;
revoke all on function public.admin_v1_operations(timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_v1_operations(timestamptz,text) to service_role;

notify pgrst, 'reload schema';
commit;
