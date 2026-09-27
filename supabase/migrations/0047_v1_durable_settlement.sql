-- V1 durable image progression; no balance/history rewrite or payment changes.
begin;

alter table public.generations add column if not exists job_id uuid references public.generation_jobs(id) on delete set null;
create unique index if not exists generations_one_per_job_idx on public.generations(job_id) where job_id is not null;

-- Keep existing active uniqueness; serialize creation against a completed V1 purchase too.
create or replace function public.guard_generation_job_transition() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' and new.idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.idempotency_key, 0));
    if exists(select 1 from public.generation_jobs where user_id = new.user_id and idempotency_key = new.idempotency_key and status in ('pending','reserved','processing','completed')) then
      raise unique_violation using message = 'generation_idempotency_conflict';
    end if;
  elsif TG_OP = 'UPDATE' then
    if old.metadata->>'v1_durable'='true' and (new.user_id<>old.user_id or new.module<>old.module or new.model is distinct from old.model
      or new.metadata->'v1_durable' is distinct from old.metadata->'v1_durable' or new.metadata->'v1_request' is distinct from old.metadata->'v1_request'
      or new.metadata->'canonical_prompt' is distinct from old.metadata->'canonical_prompt') then raise exception 'immutable_v1_snapshot'; end if;
    if old.status in ('completed','failed','cancelled') and (new.status <> old.status or new.credits_charged <> old.credits_charged or new.credits_reserved <> old.credits_reserved) then
      raise exception 'terminal_generation_job';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_generation_job_transition on public.generation_jobs;
create trigger guard_generation_job_transition before insert or update on public.generation_jobs for each row execute function public.guard_generation_job_transition();

create or replace function public.reserve_credits(p_user uuid, p_amount integer, p_job_id uuid, p_idempotency_key text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.user_id <> p_user or j.status not in ('pending','reserved','processing') or p_amount <= 0 then return -1; end if;
  if j.metadata->>'v1_durable' = 'true' and p_amount is distinct from (j.metadata#>>'{v1_request,model,customerCredits}')::integer then return -1; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is not null then
    if r.user_id <> p_user or r.amount <> p_amount then return -1; end if;
    select credits into bal from public.profiles where id=p_user;
    return bal;
  end if;
  -- credits is already the spendable balance: reserve debits it exactly once.
  select credits into bal from public.profiles where id=p_user for update;
  if bal is null or bal < p_amount then return -1; end if;
  update public.profiles set credits=credits-p_amount, credits_reserved=credits_reserved+p_amount where id=p_user returning credits into bal;
  insert into public.credit_transactions(user_id,job_id,type,amount,balance_after,idempotency_key) values(p_user,p_job_id,'reserve',p_amount,bal,p_idempotency_key);
  update public.generation_jobs set status='reserved',credits_reserved=p_amount where id=p_job_id;
  return bal;
end $$;

-- Small durable checkpoint before upload; only the service role can assert provider completion.
create or replace function public.v1_image_lifecycle_version() returns integer language sql security definer set search_path=public as $$ select 1 $$;
create or replace function public.start_v1_image_job(p_job_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' or j.status <> 'reserved' or j.credits_reserved <= 0 then return false; end if;
  update public.generation_jobs set status='processing',started_at=now() where id=p_job_id;
  return true;
end $$;

create or replace function public.mark_v1_image_provider_result(p_job_id uuid, p_sha256 text, p_observation jsonb default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' or j.status not in ('reserved','processing') or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$' then return false; end if;
  if j.metadata#>>'{v1_lifecycle,phase}' in ('provider_succeeded','persisted','settlement_pending') then
    return j.metadata#>>'{v1_lifecycle,output_sha256}' = p_sha256;
  end if;
  update public.generation_jobs set metadata=metadata || jsonb_build_object('v1_lifecycle',jsonb_build_object('phase','provider_succeeded','output_sha256',p_sha256,'storage_ref','storage:generations/'||j.user_id||'/'||j.id||'/output.png'),'execution',coalesce(metadata->'execution','{}'::jsonb)||jsonb_build_object('image_provider',p_observation)) where id=p_job_id;
  return true;
end $$;

-- Storage is external. Check its committed metadata before atomically inserting history + linking job.
create or replace function public.persist_v1_image_generation(p_job_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs; s jsonb; g public.generations; path text; ref text;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' or j.status not in ('reserved','processing','completed') then raise exception 'invalid_persistence_state'; end if;
  select * into g from public.generations where job_id=p_job_id;
  if g.id is not null then return g.id; end if;
  if j.status='completed' or j.metadata#>>'{v1_lifecycle,phase}' is distinct from 'provider_succeeded' then raise exception 'provider_result_missing'; end if;
  s := j.metadata->'v1_request';
  path := j.user_id::text||'/'||j.id::text||'/output.png'; ref := 'storage:generations/'||path;
  if not exists(select 1 from storage.objects where bucket_id='generations' and name=path and coalesce((metadata->>'size')::bigint,0)>0) then raise exception 'durable_output_missing'; end if;
  if s->>'userId' is distinct from j.user_id::text or s->>'registryToolId' is distinct from j.module or s#>>'{model,providerModelId}' is distinct from j.model or (s->>'imageCount')::integer is distinct from 1 then raise exception 'invalid_generation_snapshot'; end if;
  insert into public.generations(job_id,user_id,user_email,tool_id,model,kind,prompt,final_prompt,credits_spent,output_urls,selections,workspace_id)
    values(j.id,j.user_id,(select email from public.profiles where id=j.user_id),j.module,j.model,'image',s->>'prompt','',0,array[ref],coalesce(s->'selections','{}'::jsonb),nullif(s->>'workspaceId','')::uuid) returning * into g;
  update public.generation_jobs set metadata=jsonb_set(metadata,'{v1_lifecycle}',coalesce(metadata->'v1_lifecycle','{}'::jsonb)||jsonb_build_object('phase','persisted','generation_id',g.id)) where id=j.id;
  return g.id;
end $$;

create or replace function public.v1_image_success_evidence(p_job_id uuid)
returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.generation_jobs j join public.generations g on g.job_id=j.id
    join storage.objects o on o.bucket_id='generations' and o.name=j.user_id::text||'/'||j.id::text||'/output.png'
    where j.id=p_job_id and j.metadata->>'v1_durable'='true'
      and j.metadata#>>'{v1_lifecycle,phase}' in ('persisted','settlement_pending','completed')
      and g.id::text=j.metadata#>>'{v1_lifecycle,generation_id}' and g.user_id=j.user_id and g.tool_id=j.module and g.model=j.model and g.kind='image'
      and g.output_urls=array['storage:generations/'||o.name] and coalesce((o.metadata->>'size')::bigint,0)>0
      and j.metadata#>>'{v1_request,userId}'=j.user_id::text and j.metadata#>>'{v1_request,registryToolId}'=j.module
      and j.metadata#>>'{v1_request,model,providerModelId}'=j.model and j.metadata#>>'{v1_request,imageCount}'='1'
      and exists(select 1 from public.pricing_snapshots p where p.job_id=j.id and p.snapshot->>'record_type'='v1_image_execution'
        and p.snapshot#>>'{canonical,provenance,promptHash}'=j.metadata#>>'{canonical_prompt,hash}'));
$$;

create or replace function public.finalize_credit_charge(p_job_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null then return false; end if;
  if exists(select 1 from public.credit_transactions where job_id=p_job_id and type='charge') then
    select * into r from public.credit_transactions where job_id=p_job_id and type='charge';
    return j.status='completed' and j.credits_charged=r.amount and r.user_id=j.user_id and j.credits_reserved=0
      and (j.metadata->>'v1_durable' is distinct from 'true' or (public.v1_image_success_evidence(p_job_id)
        and exists(select 1 from public.generations where job_id=j.id and credits_spent=r.amount)));
  end if;
  if j.status not in ('reserved','processing') or exists(select 1 from public.credit_transactions where job_id=p_job_id and type in ('release','refund')) then return false; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is null or r.user_id <> j.user_id or r.amount <> j.credits_reserved then return false; end if;
  if j.metadata->>'v1_durable'='true' then
    if not public.v1_image_success_evidence(p_job_id) or r.amount is distinct from (j.metadata#>>'{v1_request,model,customerCredits}')::integer then return false; end if;
    update public.generations set credits_spent=r.amount where job_id=j.id;
  end if;
  update public.profiles set credits_reserved=credits_reserved-r.amount where id=r.user_id and credits_reserved>=r.amount returning credits into bal;
  if not found then raise exception 'reservation_accounting_mismatch'; end if;
  insert into public.credit_transactions(user_id,job_id,type,amount,balance_after) values(r.user_id,j.id,'charge',r.amount,bal);
  update public.generation_jobs set credits_reserved=0,credits_charged=r.amount,status='completed',finished_at=now(),error=null,
    metadata=case when metadata->>'v1_durable'='true' then jsonb_set(metadata,'{v1_lifecycle,phase}','"completed"') else metadata end where id=j.id;
  return true;
end $$;

-- A richer V1 result contract without breaking legacy boolean RPC callers.
create or replace function public.settle_v1_image_job(p_job_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs; already boolean;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' then return 'invalid_state'; end if;
  already := exists(select 1 from public.credit_transactions where job_id=p_job_id and type='charge');
  if public.finalize_credit_charge(p_job_id) then return case when already then 'already_finalized' else 'finalized' end; end if;
  if j.status in ('failed','cancelled','completed') then return 'invalid_state'; end if;
  if public.v1_image_success_evidence(p_job_id) then
    update public.generation_jobs set error='settlement_pending',metadata=jsonb_set(metadata,'{v1_lifecycle,phase}','"settlement_pending"') where id=p_job_id;
    return 'settlement_pending';
  end if;
  return 'evidence_missing';
end $$;

create or replace function public.release_credit_reserve(p_job_id uuid,p_idempotency_key text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  -- Same lock/order as reserve/finalize/persist/reconcile. No process-local locking.
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null then return false; end if;
  if j.status='completed' or exists(select 1 from public.credit_transactions where job_id=p_job_id and type='charge') then return false; end if;
  if exists(select 1 from public.credit_transactions where job_id=p_job_id and type in ('release','refund')) then return true; end if;
  -- Retain a persisted result and hold for reconciliation; never compensate an uncertain charge.
  if j.metadata->>'v1_durable'='true' and exists(select 1 from public.generations where job_id=p_job_id) then return false; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is not null then
    update public.profiles set credits=credits+r.amount,credits_reserved=credits_reserved-r.amount where id=r.user_id and credits_reserved>=r.amount returning credits into bal;
    if not found then raise exception 'reservation_accounting_mismatch'; end if;
    insert into public.credit_transactions(user_id,job_id,type,amount,balance_after,idempotency_key) values(r.user_id,p_job_id,'release',r.amount,bal,p_idempotency_key);
  end if;
  if j.status not in ('failed','cancelled') then
    update public.generation_jobs set status='failed',credits_reserved=0,finished_at=now(),error=coalesce(error,'generation_failed') where id=p_job_id;
  end if;
  return true;
end $$;

create or replace function public.fail_v1_image_job(p_job_id uuid,p_reason text)
returns text language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs;
begin
  if p_reason not in ('provider_failed','provider_output_invalid','storage_failed','history_failed','execution_trace_unavailable','execution_interrupted') then raise exception 'invalid_failure_reason'; end if;
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' then return 'invalid_state'; end if;
  if j.status='completed' then return 'already_finalized'; end if;
  if j.status in ('failed','cancelled') then return 'released'; end if;
  if exists(select 1 from public.generations where job_id=p_job_id) then return 'settlement_pending'; end if;
  update public.generation_jobs set error=p_reason,metadata=jsonb_set(metadata,'{v1_lifecycle}',coalesce(metadata->'v1_lifecycle','{}'::jsonb)||jsonb_build_object('failure',p_reason)) where id=p_job_id;
  if public.release_credit_reserve(p_job_id,'fail-'||p_job_id) then return 'released'; end if;
  return 'reconciliation_pending';
end $$;

create or replace function public.reconcile_generation_job(p_job_id uuid,p_stale_minutes integer default 15)
returns text language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null then return 'missing'; end if;
  if j.status in ('completed','failed','cancelled') then return j.status; end if;
  if j.created_at > now()-make_interval(mins=>greatest(1,p_stale_minutes)) then return 'active'; end if;
  if j.metadata->>'v1_durable'='true' then
    if not exists(select 1 from public.generations where job_id=j.id)
      and j.metadata#>>'{v1_lifecycle,phase}'='provider_succeeded'
      and exists(select 1 from storage.objects where bucket_id='generations' and name=j.user_id::text||'/'||j.id::text||'/output.png' and coalesce((metadata->>'size')::bigint,0)>0) then
      -- Process died after storage; the trusted snapshot supplies the required history.
      perform public.persist_v1_image_generation(j.id);
    end if;
    if exists(select 1 from public.generations where job_id=j.id) then return public.settle_v1_image_job(j.id); end if;
    return public.fail_v1_image_job(j.id,'execution_interrupted');
  end if;
  if public.release_credit_reserve(j.id,'stale-'||j.id) then return 'released'; end if;
  return 'unchanged';
end $$;

create or replace function public.reconcile_stale_generation_jobs(p_stale_minutes integer default 15)
returns integer language plpgsql security definer set search_path=public as $$
declare r record; n integer:=0;
begin
  for r in select id from public.generation_jobs where status in ('pending','reserved','processing') and created_at < now()-make_interval(mins=>greatest(1,p_stale_minutes)) order by id for update skip locked loop
    perform public.reconcile_generation_job(r.id,p_stale_minutes); n:=n+1;
  end loop;
  return n;
end $$;

-- New SECURITY DEFINER functions must not inherit PostgreSQL's PUBLIC execute default.
revoke all on function public.v1_image_lifecycle_version(), public.start_v1_image_job(uuid) from public, anon, authenticated;
grant execute on function public.v1_image_lifecycle_version(), public.start_v1_image_job(uuid) to service_role;
revoke all on function public.mark_v1_image_provider_result(uuid,text,jsonb), public.persist_v1_image_generation(uuid), public.v1_image_success_evidence(uuid), public.settle_v1_image_job(uuid), public.fail_v1_image_job(uuid,text), public.reconcile_generation_job(uuid,integer) from public, anon, authenticated;
grant execute on function public.mark_v1_image_provider_result(uuid,text,jsonb), public.persist_v1_image_generation(uuid), public.v1_image_success_evidence(uuid), public.settle_v1_image_job(uuid), public.fail_v1_image_job(uuid,text), public.reconcile_generation_job(uuid,integer) to service_role;
revoke all on function public.reserve_credits(uuid,integer,uuid,text), public.finalize_credit_charge(uuid), public.release_credit_reserve(uuid,text), public.reconcile_stale_generation_jobs(integer) from public, anon, authenticated;
grant execute on function public.reserve_credits(uuid,integer,uuid,text), public.finalize_credit_charge(uuid), public.release_credit_reserve(uuid,text), public.reconcile_stale_generation_jobs(integer) to service_role;
notify pgrst,'reload schema';
commit;
