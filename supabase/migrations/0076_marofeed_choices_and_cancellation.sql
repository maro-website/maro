-- Extend only the private Feed pilot; ordinary image generation remains unchanged.
begin;
alter table public.maro_feeds
  add column references_list text[] not null default '{}',
  add column content_type text not null default 'mix' check(content_type in ('mix','hero','lifestyle','detail','benefit','signature','ritual','mood','engagement','conversion')),
  add column text_mode boolean not null default true,
  add column cancel_requested boolean not null default false,
  add column cancelled_at timestamptz,
  add column refund_credits integer not null default 0 check(refund_credits between 0 and 45);
update public.maro_feeds set references_list=array[reference] where cardinality(references_list)=0;
alter table public.maro_feeds add constraint maro_feed_reference_count check(cardinality(references_list) between 1 and 10);

create function public.maro_feed_create_v2(p_user uuid,p_workspace text,p_request uuid,p_references text[],p_category text,p_brief jsonb,p_context text,p_config jsonb,p_content_type text,p_text_mode boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare fid uuid; ref text;
begin
  perform public.maro_feed_guard(p_user,p_workspace);
  perform pg_advisory_xact_lock(hashtextextended('feed-create:'||p_user::text,0));
  select id into fid from public.maro_feeds where owner_id=p_user and request_id=p_request;
  if found then return fid; end if;
  if p_references is null or cardinality(p_references)<1 or cardinality(p_references)>10
    or (select count(distinct value) from unnest(p_references) value)<>cardinality(p_references)
    or p_content_type is null or p_content_type not in ('mix','hero','lifestyle','detail','benefit','signature','ritual','mood','engagement','conversion') or p_text_mode is null then raise exception 'invalid_request'; end if;
  foreach ref in array p_references loop
    if ref is null or length(ref)>1024 or ref not like 'storage:generations/'||p_user::text||'/%'
      or not exists(select 1 from storage.objects where bucket_id='generations' and name=substring(ref from 21) and coalesce((metadata->>'size')::bigint,0)>0) then raise exception 'invalid_request'; end if;
  end loop;
  -- The original create RPC inserts the first reference; its new column defaults
  -- must also support a request from the preceding application during deploy.
  fid:=public.maro_feed_create(p_user,p_workspace,p_request,p_references[1],p_category,p_brief,p_context,p_config);
  update public.maro_feeds set references_list=p_references,content_type=p_content_type,text_mode=p_text_mode where id=fid;
  return fid;
end $$;

-- Supply the reference list for the preceding create RPC without changing its billing.
create function public.maro_feed_reference_defaults() returns trigger language plpgsql set search_path='' as $$
begin
  if cardinality(new.references_list)=0 then new.references_list:=array[new.reference]; end if;
  return new;
end $$;
create trigger maro_feed_reference_defaults before insert on public.maro_feeds for each row execute function public.maro_feed_reference_defaults();

create function public.maro_feed_settle_cancel(p_feed uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare f public.maro_feeds; completed integer; amount integer; balance integer;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  select * into f from public.maro_feeds where id=p_feed for update;
  if not found then raise exception 'feed_not_found'; end if;
  if f.refunded or f.cancelled_at is not null then return true; end if;
  if not f.cancel_requested or exists(select 1 from public.maro_feed_attempts where feed_id=f.id and status='running') then return false; end if;
  select count(distinct slot)::integer into completed from public.maro_feed_attempts where feed_id=f.id and status='completed' and not regenerate;
  amount:=greatest(0,45-5*completed);
  if amount>0 then
    balance:=public.refund_credits_atomic(f.owner_id,amount,'feed-cancel-'||f.id);
    if balance<0 then raise exception 'refund_failed'; end if;
  end if;
  update public.maro_feeds set cancelled_at=now(),refund_credits=amount where id=f.id;
  return true;
end $$;

alter function public.maro_feed_claim(uuid,uuid,uuid,integer,boolean,text,text) rename to maro_feed_claim_v1;
create function public.maro_feed_claim(p_user uuid,p_feed uuid,p_request uuid,p_slot integer,p_regenerate boolean,p_feedback text,p_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.maro_feeds;
begin
  select * into f from public.maro_feeds where id=p_feed and owner_id=p_user for update;
  if not found then raise exception 'feed_not_found'; end if;
  perform public.maro_feed_guard(p_user,f.workspace_id);
  if f.cancel_requested or f.cancelled_at is not null then raise exception 'feed_cancelled'; end if;
  return public.maro_feed_claim_v1(p_user,p_feed,p_request,p_slot,p_regenerate,p_feedback,p_model);
end $$;

alter function public.maro_feed_finish(uuid) rename to maro_feed_finish_v1;
create function public.maro_feed_finish(p_attempt uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare gid uuid; fid uuid;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  gid:=public.maro_feed_finish_v1(p_attempt);
  select feed_id into fid from public.maro_feed_attempts where id=p_attempt;
  perform public.maro_feed_settle_cancel(fid);
  return gid;
end $$;

alter function public.maro_feed_recover(uuid,uuid,uuid) rename to maro_feed_recover_v1;
create function public.maro_feed_recover(p_user uuid,p_feed uuid,p_fail uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform public.maro_feed_recover_v1(p_user,p_feed,p_fail);
  perform public.maro_feed_settle_cancel(p_feed);
end $$;

create function public.maro_feed_cancel(p_user uuid,p_feed uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare f public.maro_feeds;
begin
  select * into f from public.maro_feeds where id=p_feed and owner_id=p_user for update;
  if not found then raise exception 'feed_not_found'; end if;
  perform public.maro_feed_guard(p_user,f.workspace_id);
  if f.refunded or f.cancelled_at is not null then return true; end if;
  update public.maro_feeds set cancel_requested=true where id=f.id;
  perform public.maro_feed_recover(p_user,p_feed);
  return public.maro_feed_settle_cancel(p_feed);
end $$;

-- Old clients cannot bypass the new fixed 5-credit setup fee via the old refund action.
create or replace function public.maro_feed_refund(p_user uuid,p_feed uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin return public.maro_feed_cancel(p_user,p_feed); end $$;

revoke all on function public.maro_feed_create_v2(uuid,text,uuid,text[],text,jsonb,text,jsonb,text,boolean),public.maro_feed_reference_defaults(),
 public.maro_feed_settle_cancel(uuid),public.maro_feed_cancel(uuid,uuid),public.maro_feed_claim(uuid,uuid,uuid,integer,boolean,text,text),
 public.maro_feed_finish(uuid),public.maro_feed_recover(uuid,uuid,uuid),public.maro_feed_refund(uuid,uuid),
 public.maro_feed_claim_v1(uuid,uuid,uuid,integer,boolean,text,text),public.maro_feed_finish_v1(uuid),public.maro_feed_recover_v1(uuid,uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.maro_feed_create_v2(uuid,text,uuid,text[],text,jsonb,text,jsonb,text,boolean),public.maro_feed_reference_defaults(),
 public.maro_feed_settle_cancel(uuid),public.maro_feed_cancel(uuid,uuid),public.maro_feed_claim(uuid,uuid,uuid,integer,boolean,text,text),
 public.maro_feed_finish(uuid),public.maro_feed_recover(uuid,uuid,uuid),public.maro_feed_refund(uuid,uuid),
 public.maro_feed_claim_v1(uuid,uuid,uuid,integer,boolean,text,text),public.maro_feed_finish_v1(uuid),public.maro_feed_recover_v1(uuid,uuid,uuid)
 to service_role;
notify pgrst,'reload schema';
commit;
