-- Additive private pilot. Existing image lifecycle, settings and customer data are unchanged.
begin;
create table public.maro_feed_config (
  id integer primary key check(id=1), config jsonb not null, revision integer not null default 1,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table public.maro_feeds (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  workspace_id text not null references public.workspaces(id), request_id uuid not null,
  reference text not null, category text not null check(category in ('drinks','food','fashion','beauty','services','tech','home','other')),
  brief jsonb not null, brain_context text not null default '', config jsonb not null,
  order_job_id uuid not null references public.generation_jobs(id), free_used integer not null default 0 check(free_used between 0 and 3),
  refunded boolean not null default false, created_at timestamptz not null default now(), unique(owner_id,request_id)
);
create index maro_feeds_owner_workspace on public.maro_feeds(owner_id,workspace_id,created_at desc);
create table public.maro_feed_attempts (
  id uuid primary key default gen_random_uuid(), feed_id uuid not null references public.maro_feeds(id),
  owner_id uuid not null references auth.users(id), request_id uuid not null, slot integer not null check(slot between 0 and 8),
  job_id uuid not null unique references public.generation_jobs(id), regenerate boolean not null, free_regen boolean not null,
  status text not null default 'running' check(status in ('running','completed','failed')),
  feedback text not null default '', generation_id uuid references public.generations(id), error text,
  created_at timestamptz not null default now(), finished_at timestamptz, unique(feed_id,request_id)
);
create unique index maro_feed_one_running_per_owner on public.maro_feed_attempts(owner_id) where status='running';
create index maro_feed_attempts_feed on public.maro_feed_attempts(feed_id,slot,created_at desc);
alter table public.maro_feed_config enable row level security;
alter table public.maro_feeds enable row level security;
alter table public.maro_feed_attempts enable row level security;
revoke all on public.maro_feed_config,public.maro_feeds,public.maro_feed_attempts from public,anon,authenticated;
grant all on public.maro_feed_config,public.maro_feeds,public.maro_feed_attempts to service_role;

create function public.maro_feed_guard(p_user uuid,p_workspace text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  if not exists(select 1 from auth.users where id=p_user and lower(email)='erzen@nice.al' and email_confirmed_at is not null) then raise exception 'feed_not_available'; end if;
  if not exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user) then raise exception 'workspace_not_found'; end if;
end $$;

create function public.maro_feed_create(p_user uuid,p_workspace text,p_request uuid,p_reference text,p_category text,p_brief jsonb,p_context text,p_config jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare f public.maro_feeds; j uuid; balance integer;
begin
  perform public.maro_feed_guard(p_user,p_workspace);
  if not exists(select 1 from public.profiles where id=p_user and not coalesce(generation_paused,false)) then raise exception 'generation_paused'; end if;
  perform pg_advisory_xact_lock(hashtextextended('feed-create:'||p_user::text,0));
  select * into f from public.maro_feeds where owner_id=p_user and request_id=p_request;
  if found then return f.id; end if;
  if p_request is null or length(p_context)>24000 or pg_column_size(p_brief)>12000 or pg_column_size(p_config)>60000
    or p_reference not like 'storage:generations/'||p_user::text||'/%'
    or not exists(select 1 from storage.objects where bucket_id='generations' and name=substring(p_reference from 21) and coalesce((metadata->>'size')::bigint,0)>0)
    then raise exception 'invalid_request'; end if;
  if exists(select 1 from public.maro_feeds where owner_id=p_user and not refunded and created_at>now()-interval '1 minute') then raise exception 'rate_limited'; end if;
  insert into public.generation_jobs(user_id,module,model,status,idempotency_key,metadata)
    values(p_user,'reklama','maroFeed','pending','feed-order-'||p_request,jsonb_build_object('maro_feed_order',true)) returning id into j;
  balance:=public.reserve_credits(p_user,50,j,'feed-order-'||p_request);
  if balance<0 then raise exception 'insufficient_credits'; end if;
  if not public.finalize_credit_charge(j) then raise exception 'settlement_failed'; end if;
  perform public.record_job_spend(j,p_user,'reklama',0,50);
  insert into public.maro_feeds(owner_id,workspace_id,request_id,reference,category,brief,brain_context,config,order_job_id)
    values(p_user,p_workspace,p_request,p_reference,p_category,p_brief,coalesce(p_context,''),p_config,j) returning * into f;
  return f.id;
end $$;

create function public.maro_feed_claim(p_user uuid,p_feed uuid,p_request uuid,p_slot integer,p_regenerate boolean,p_feedback text,p_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.maro_feeds; a public.maro_feed_attempts; j jsonb; jid uuid; free boolean; price integer;
begin
  select * into f from public.maro_feeds where id=p_feed and owner_id=p_user for update;
  if not found then raise exception 'feed_not_found'; end if;
  perform public.maro_feed_guard(p_user,f.workspace_id);
  if not exists(select 1 from public.profiles where id=p_user and not coalesce(generation_paused,false)) then raise exception 'generation_paused'; end if;
  if f.refunded then raise exception 'feed_refunded'; end if;
  select * into a from public.maro_feed_attempts where feed_id=p_feed and request_id=p_request;
  if found then return jsonb_build_object('claimed',false,'attempt',to_jsonb(a)); end if;
  if p_slot is null or p_slot<0 or p_slot>8 or p_request is null or p_regenerate is null or length(p_feedback)>600 or p_model is null then raise exception 'invalid_request'; end if;
  if exists(select 1 from public.maro_feed_attempts where owner_id=p_user and status='running') then raise exception 'feed_busy'; end if;
  if (select count(*) from public.maro_feed_attempts where feed_id=p_feed)>=200 then raise exception 'retry_limit'; end if;
  if p_regenerate then
    if (select count(distinct slot) from public.maro_feed_attempts where feed_id=p_feed and status='completed')<>9 then raise exception 'feed_not_complete'; end if;
  elsif exists(select 1 from public.maro_feed_attempts where feed_id=p_feed and slot=p_slot and status='completed') then raise exception 'slot_complete'; end if;
  if not p_regenerate and (select count(*) from public.maro_feed_attempts where feed_id=p_feed and slot=p_slot and not regenerate)>=5 then raise exception 'retry_limit'; end if;
  free:=p_regenerate and f.free_used<3;
  price:=case when p_regenerate and not free then 5 else 0 end;
  j:=public.create_v1_generation_job(p_user,'reklama',p_model,'feed-image-'||p_request,0,
    jsonb_build_object('maro_feed_id',f.id,'maro_feed_slot',p_slot,'maro_feed_price',price),0.35,1);
  jid:=(j->>'id')::uuid;
  if price>0 and public.reserve_credits(p_user,price,jid,'feed-image-'||p_request)<0 then raise exception 'insufficient_credits'; end if;
  update public.generation_jobs set status='processing',started_at=now() where id=jid;
  insert into public.maro_feed_attempts(feed_id,owner_id,request_id,slot,job_id,regenerate,free_regen,feedback)
    values(p_feed,p_user,p_request,p_slot,jid,p_regenerate,free,coalesce(p_feedback,'')) returning * into a;
  if free then update public.maro_feeds set free_used=free_used+1 where id=p_feed; end if;
  return jsonb_build_object('claimed',true,'attempt',to_jsonb(a));
end $$;

create function public.maro_feed_finish(p_attempt uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.maro_feed_attempts; f public.maro_feeds; j public.generation_jobs; gid uuid; ref text; price integer;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  -- Consistent lock ordering: feed, attempt, job, profile.
  select * into f from public.maro_feeds where id=(select feed_id from public.maro_feed_attempts where id=p_attempt) for update;
  select * into a from public.maro_feed_attempts where id=p_attempt for update;
  if a.status='completed' then return a.generation_id; end if;
  select * into j from public.generation_jobs where id=a.job_id for update;
  if a.id is null or a.status<>'running' or j.status<>'processing' or f.refunded then raise exception 'invalid_state'; end if;
  ref:='storage:generations/'||a.owner_id::text||'/'||j.id::text||'/output.png';
  if not exists(select 1 from storage.objects where bucket_id='generations' and name=substring(ref from 21) and coalesce((metadata->>'size')::bigint,0)>0)
    or not exists(select 1 from public.pricing_snapshots where job_id=j.id and snapshot->>'record_type'='maro_feed_execution') then raise exception 'durable_output_missing'; end if;
  price:=(j.metadata->>'maro_feed_price')::integer;
  insert into public.generations(job_id,user_id,user_email,tool_id,model,kind,prompt,final_prompt,credits_spent,output_urls,selections,workspace_id)
    values(j.id,a.owner_id,(select email from public.profiles where id=a.owner_id),'reklama',j.model,'image','maroFeed · '||(a.slot+1)::text,'',price,array[ref],
      jsonb_build_object('source','maroFeed','feedId',f.id,'slot',a.slot),f.workspace_id) returning id into gid;
  if price>0 then
    if not public.finalize_credit_charge(j.id) then raise exception 'settlement_failed'; end if;
  else
    update public.generation_jobs set status='completed',credits_charged=0,finished_at=now() where id=j.id;
  end if;
  update public.maro_feed_attempts set status='completed',generation_id=gid,finished_at=now() where id=a.id;
  return gid;
end $$;

create function public.maro_feed_recover(p_user uuid,p_feed uuid,p_fail uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare f public.maro_feeds; a public.maro_feed_attempts; j public.generation_jobs;
begin
  select * into f from public.maro_feeds where id=p_feed and owner_id=p_user for update;
  if not found then raise exception 'feed_not_found'; end if;
  perform public.maro_feed_guard(p_user,f.workspace_id);
  for a in select * from public.maro_feed_attempts where feed_id=p_feed and status='running' for update loop
    select * into j from public.generation_jobs where id=a.job_id for update;
    if j.status='processing' and exists(select 1 from storage.objects where bucket_id='generations' and name=p_user::text||'/'||j.id::text||'/output.png' and coalesce((metadata->>'size')::bigint,0)>0) then
      perform public.maro_feed_finish(a.id);
    elsif j.status in ('failed','cancelled') or a.id=p_fail or a.created_at<now()-interval '15 minutes' then
      if j.status not in ('failed','cancelled') then perform public.release_credit_reserve(j.id,'feed-failed-'||a.id); end if;
      update public.maro_feed_attempts set status='failed',error='generation_failed',finished_at=now() where id=a.id;
      if a.free_regen then update public.maro_feeds set free_used=greatest(0,free_used-1) where id=f.id; end if;
    end if;
  end loop;
end $$;

create function public.maro_feed_refund(p_user uuid,p_feed uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare f public.maro_feeds;
begin
  select * into f from public.maro_feeds where id=p_feed and owner_id=p_user for update;
  if not found then raise exception 'feed_not_found'; end if;
  perform public.maro_feed_guard(p_user,f.workspace_id);
  if f.refunded then return true; end if;
  if exists(select 1 from public.maro_feed_attempts where feed_id=p_feed and status in ('running','completed')) then raise exception 'refund_unavailable'; end if;
  perform public.refund_credits_atomic(p_user,50,'feed-refund-'||p_feed);
  update public.maro_feeds set refunded=true where id=p_feed;
  return true;
end $$;

revoke all on function public.maro_feed_guard(uuid,text),public.maro_feed_create(uuid,text,uuid,text,text,jsonb,text,jsonb),
 public.maro_feed_claim(uuid,uuid,uuid,integer,boolean,text,text),public.maro_feed_finish(uuid),public.maro_feed_recover(uuid,uuid,uuid),public.maro_feed_refund(uuid,uuid) from public,anon,authenticated;
grant execute on function public.maro_feed_guard(uuid,text),public.maro_feed_create(uuid,text,uuid,text,text,jsonb,text,jsonb),
 public.maro_feed_claim(uuid,uuid,uuid,integer,boolean,text,text),public.maro_feed_finish(uuid),public.maro_feed_recover(uuid,uuid,uuid),public.maro_feed_refund(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
