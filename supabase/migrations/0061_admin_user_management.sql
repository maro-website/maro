-- Existing admin workflows: atomic plan changes, durable notifications and storage overrides.
-- No existing account, file, order or credit balance is deleted or changed by this migration.
begin;

create function public.admin_can_manage_users(p_actor uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.role()='service_role' and exists(select 1 from profiles where id=p_actor and
    (case when access_role in ('super_admin','administrator','developer','editor') then access_role
      when is_admin then 'super_admin' end) in ('super_admin','administrator')),false);
$$;
revoke all on function public.admin_can_manage_users(uuid) from public,anon,authenticated;

create table public.user_storage_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  limit_bytes bigint not null check(limit_bytes between 0 and 1000000000000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.user_storage_overrides enable row level security;
revoke all on public.user_storage_overrides from public,anon,authenticated;
grant select,insert,update,delete on public.user_storage_overrides to service_role;

create or replace function public.maro_storage_limit_internal(p_user uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce((select limit_bytes from user_storage_overrides where user_id=p_user),
    case public.maro_active_plan(p_user) when 'pro' then 5000000000::bigint
      when 'business' then null::bigint else 1000000000::bigint end);
$$;
revoke all on function public.maro_storage_limit_internal(uuid) from public,anon,authenticated;

create function public.admin_set_user_storage(p_actor uuid,p_user uuid,p_limit_bytes bigint,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old_limit bigint;
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_limit_bytes is not null and (p_limit_bytes<0 or p_limit_bytes>1000000000000) then
    return jsonb_build_object('ok',false,'error','invalid_limit'); end if;
  if p_note is null or length(trim(p_note)) not between 3 and 1000 then
    return jsonb_build_object('ok',false,'error','invalid_note'); end if;
  perform 1 from profiles where id=p_user for update;
  if not found then return jsonb_build_object('ok',false,'error','user_not_found'); end if;
  select limit_bytes into old_limit from user_storage_overrides where user_id=p_user;
  if p_limit_bytes is null then delete from user_storage_overrides where user_id=p_user;
  else insert into user_storage_overrides(user_id,limit_bytes,updated_by) values(p_user,p_limit_bytes,p_actor)
    on conflict(user_id) do update set limit_bytes=excluded.limit_bytes,updated_by=excluded.updated_by,updated_at=now(); end if;
  insert into audit_events(actor_id,action,target_type,target_id,before_state,after_state,metadata)
    values(p_actor,'users.storage_limit_changed','user',p_user::text,
      jsonb_build_object('override_bytes',old_limit),jsonb_build_object('override_bytes',p_limit_bytes),
      jsonb_build_object('note',trim(p_note)));
  return jsonb_build_object('ok',true,'limitBytes',public.maro_storage_limit_internal(p_user));
end;
$$;
revoke all on function public.admin_set_user_storage(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.admin_set_user_storage(uuid,uuid,bigint,text) to service_role;

create unique index audit_plan_change_request_once on public.audit_events(target_id) where action='users.plan_changed';
create function public.admin_change_user_plan(p_actor uuid,p_user uuid,p_plan text,p_duration_days integer,
  p_note text,p_change_id uuid,p_expected_membership uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.memberships%rowtype; prior public.audit_events%rowtype; expiry timestamptz;
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_plan is null or p_plan not in ('free','standard','pro','business') or
    (p_plan<>'free' and not exists(select 1 from commerce_plans where id=p_plan and enabled)) then
    return jsonb_build_object('ok',false,'error','invalid_plan'); end if;
  if p_duration_days is null or p_duration_days not between 1 and 365 then
    return jsonb_build_object('ok',false,'error','invalid_duration'); end if;
  if p_note is null or length(trim(p_note)) not between 3 and 1000 or p_change_id is null then
    return jsonb_build_object('ok',false,'error','invalid_note'); end if;
  perform 1 from profiles where id=p_user for update;
  if not found then return jsonb_build_object('ok',false,'error','user_not_found'); end if;
  select * into prior from audit_events where action='users.plan_changed' and target_id=p_change_id::text;
  if found then
    if prior.actor_id is distinct from p_actor or prior.metadata->>'user_id' is distinct from p_user::text or
      prior.metadata->>'note' is distinct from trim(p_note) or prior.metadata->>'duration_days' is distinct from p_duration_days::text or
      prior.after_state->>'plan_id' is distinct from p_plan or prior.metadata->>'expected_membership' is distinct from p_expected_membership::text then
      return jsonb_build_object('ok',false,'error','idempotency_conflict'); end if;
    return jsonb_build_object('ok',true,'already',true,'membership_id',prior.after_state->>'membership_id','expires_at',prior.after_state->>'expires_at');
  end if;
  select * into existing from memberships where user_id=p_user and started_at<=now() and expires_at>now() and not suspended
    order by expires_at desc limit 1 for update;
  if existing.id is distinct from p_expected_membership then return jsonb_build_object('ok',false,'error','stale_membership'); end if;
  if existing.payment_provider='paddle' and existing.renewal_mode='automatic' then
    return jsonb_build_object('ok',false,'error','automatic_subscription'); end if;
  if exists(select 1 from raiaccept_checkouts where user_id=p_user and holds_membership) then
    return jsonb_build_object('ok',false,'error','active_payment'); end if;
  -- Preserve the original paid membership and its timestamps for payment/audit history.
  update memberships set suspended=true,updated_at=now() where user_id=p_user and expires_at>now() and not suspended;
  if p_plan<>'free' then
    expiry:=now()+p_duration_days*interval '1 day';
    insert into memberships(id,user_id,plan_id,started_at,expires_at,renewal_mode)
      values(p_change_id,p_user,p_plan,now(),expiry,'manual');
  end if;
  update profiles set maro_plan=case when p_plan='free' then null else p_plan end where id=p_user;
  insert into audit_events(actor_id,action,target_type,target_id,before_state,after_state,metadata)
    values(p_actor,'users.plan_changed','plan_change',p_change_id::text,to_jsonb(existing),
      jsonb_build_object('user_id',p_user,'plan_id',p_plan,'membership_id',case when p_plan='free' then null else p_change_id end,'expires_at',expiry),
      jsonb_build_object('user_id',p_user,'source','manual','note',trim(p_note),'duration_days',p_duration_days,
        'expected_membership',p_expected_membership,'actor_email',(select email from profiles where id=p_actor),'credits_granted',0));
  return jsonb_build_object('ok',true,'already',false,'membership_id',case when p_plan='free' then null else p_change_id end,'expires_at',expiry);
end;
$$;
revoke all on function public.admin_change_user_plan(uuid,uuid,text,integer,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_change_user_plan(uuid,uuid,text,integer,text,uuid,uuid) to service_role;

create function public.maro_notify_manual_plan()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid; plan_name text;
begin
  if new.action not in ('users.plan_granted_manually','users.plan_changed') then return new; end if;
  recipient:=(new.after_state->>'user_id')::uuid;
  select display_name into plan_name from commerce_plans where id=new.after_state->>'plan_id';
  insert into user_notifications(user_id,dedupe_key,kind,title,body,action_href,metadata)
    values(recipient,'manual_plan:'||new.action||':'||new.target_id,'billing',
      case when new.action='users.plan_changed' then 'Plani yt u ndryshua' else 'Plani yt u aktivizua' end,
      case when new.after_state->>'plan_id'='free' then 'Llogaria jote tani përdor planin falas.'
        else coalesce(plan_name,new.after_state->>'plan_id')||' është aktiv. Kreditet menaxhohen veçmas.' end,
      '/account?tab=billing',jsonb_build_object('plan_id',new.after_state->>'plan_id','expires_at',new.after_state->>'expires_at'))
    on conflict(user_id,dedupe_key) do nothing;
  return new;
end;
$$;
revoke all on function public.maro_notify_manual_plan() from public,anon,authenticated;
create trigger maro_manual_plan_notification after insert on public.audit_events
  for each row execute function public.maro_notify_manual_plan();

create function public.maro_notify_manual_credits()
returns trigger language plpgsql security definer set search_path=public as $$
declare delta integer;
begin
  if new.type not in ('manual_adjustment','admin_grant','admin_adjustment') or new.user_id is null then return new; end if;
  delta:=coalesce((new.metadata->>'delta')::integer,new.amount);
  insert into user_notifications(user_id,dedupe_key,kind,title,body,action_href,metadata)
    values(new.user_id,'manual_credits:'||new.id,'credits',case when delta>0 then 'Kreditet u shtuan' else 'Kreditet u përditësuan' end,
      case when delta>0 then '+' else '' end||delta::text||' kredite. Bilanci yt: '||new.balance_after::text||' kredite.',
      '/account?tab=billing',jsonb_build_object('delta',delta,'balance',new.balance_after))
    on conflict(user_id,dedupe_key) do nothing;
  return new;
end;
$$;
revoke all on function public.maro_notify_manual_credits() from public,anon,authenticated;
create trigger maro_manual_credit_notification after insert on public.credit_transactions
  for each row execute function public.maro_notify_manual_credits();

-- A suspended older membership cannot override the replacement's workspace allowance.
create or replace function public.resolve_workspace_limit_internal(p_user_id uuid)
returns integer language plpgsql stable security definer set search_path=public as $$
declare m record; bo jsonb;
begin
  select m2.plan_id,m2.business_overrides,cp.workspace_limit into m from memberships m2
    join commerce_plans cp on cp.id=m2.plan_id where m2.user_id=p_user_id and m2.started_at<=now()
      and m2.expires_at>now() and not m2.suspended order by m2.expires_at desc limit 1;
  if not found then return 1; end if;
  if m.plan_id='business' then
    bo:=coalesce(m.business_overrides,'{}'::jsonb);
    if bo ? 'workspace_limit' and bo->>'workspace_limit' ~ '^[0-9]+$' then
      return greatest(1,(bo->>'workspace_limit')::integer); end if;
  end if;
  return greatest(1,coalesce(m.workspace_limit,1));
end;
$$;
revoke all on function public.resolve_workspace_limit_internal(uuid) from public,anon,authenticated;
grant execute on function public.resolve_workspace_limit_internal(uuid) to service_role;

-- Retain financial entries and checkout proofs when an administrator later deletes an account.
alter table public.credit_transactions alter column user_id drop not null;
alter table public.credit_transactions drop constraint credit_transactions_user_id_fkey;
alter table public.credit_transactions add constraint credit_transactions_user_id_fkey
  foreign key(user_id) references auth.users(id) on delete set null;
alter table public.raiaccept_checkouts alter column user_id drop not null;
alter table public.raiaccept_checkouts drop constraint raiaccept_checkouts_user_id_fkey;
alter table public.raiaccept_checkouts add constraint raiaccept_checkouts_user_id_fkey
  foreign key(user_id) references auth.users(id) on delete set null;
alter table public.raiaccept_checkouts drop constraint raiaccept_checkouts_expected_membership_id_fkey;
alter table public.raiaccept_checkouts add constraint raiaccept_checkouts_expected_membership_id_fkey
  foreign key(expected_membership_id) references public.memberships(id) on delete set null;

create function public.admin_user_directory(p_search text default '',p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; total bigint;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset<0 or length(p_search)>100 then raise exception 'invalid_request'; end if;
  select count(*) into total from profiles p where p_search='' or position(lower(p_search) in lower(coalesce(p.email,'')||' '||coalesce(p.full_name,'')))>0;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'email',coalesce(p.email,''),'full_name',p.full_name,
    'credits',p.credits,'is_creator',p.is_creator,'is_admin',p.is_admin,'access_role',p.access_role,'created_at',p.created_at,
    'plan',coalesce(m.plan_id,'free'),'membershipId',m.id,'planExpiresAt',m.expires_at,
    'storageUsedBytes',public.maro_storage_used_internal(p.id),'storageLimitBytes',public.maro_storage_limit_internal(p.id),
    'storageOverrideBytes',(select limit_bytes from user_storage_overrides where user_id=p.id)) order by p.created_at desc,p.id),'[]'::jsonb)
    into result from (select * from profiles where p_search='' or position(lower(p_search) in lower(coalesce(email,'')||' '||coalesce(full_name,'')))>0
      order by created_at desc,id limit p_limit offset p_offset) p
    left join lateral(select id,plan_id,expires_at from memberships where user_id=p.id and started_at<=now() and expires_at>now() and not suspended
      order by expires_at desc limit 1) m on true;
  return jsonb_build_object('users',result,'total',total);
end;
$$;
revoke all on function public.admin_user_directory(text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_user_directory(text,integer,integer) to service_role;

create function public.admin_user_storage_objects(p_user uuid)
returns table(bucket_id text,name text) language plpgsql stable security definer set search_path=public,storage as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
  return query select o.bucket_id,o.name from storage.objects o
    where (o.owner_id=p_user::text or public.maro_storage_owner(o.bucket_id,o.name,o.user_metadata)=p_user)
    order by o.bucket_id,o.name;
end;
$$;
revoke all on function public.admin_user_storage_objects(uuid) from public,anon,authenticated;
grant execute on function public.admin_user_storage_objects(uuid) to service_role;

-- Serialize deletion against new jobs, uploads and checkout creation. The lock
-- stays in place on partial storage failure so an administrator can safely retry.
create table public.admin_user_deletion_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.admin_user_deletion_locks enable row level security;
revoke all on public.admin_user_deletion_locks from public,anon,authenticated;
grant select,insert,delete on public.admin_user_deletion_locks to service_role;

create function public.maro_guard_deleting_user()
returns trigger language plpgsql security definer set search_path=public,storage as $$
declare uid uuid;
begin
  if tg_table_schema='storage' then
    uid:=public.maro_storage_owner(new.bucket_id,new.name,new.user_metadata);
    if uid is null and new.owner_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then uid:=new.owner_id::uuid; end if;
  else uid:=new.user_id; end if;
  if uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('maro:user-delete:'||uid::text,0));
    if exists(select 1 from admin_user_deletion_locks where user_id=uid) then
      raise exception 'account_deletion_in_progress' using errcode='42501'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.maro_guard_deleting_user() from public,anon,authenticated;
create trigger maro_account_delete_guard before insert on public.generation_jobs
  for each row execute function public.maro_guard_deleting_user();
create trigger maro_account_delete_guard before insert on public.credit_orders
  for each row execute function public.maro_guard_deleting_user();
create trigger maro_account_delete_guard before insert on public.raiaccept_checkouts
  for each row execute function public.maro_guard_deleting_user();
create trigger maro_account_delete_guard before insert or update on storage.objects
  for each row execute function public.maro_guard_deleting_user();

create function public.admin_begin_user_delete(p_actor uuid,p_user uuid,p_email text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target profiles%rowtype;
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_actor=p_user then return jsonb_build_object('ok',false,'error','self_delete_forbidden'); end if;
  perform pg_advisory_xact_lock(hashtextextended('maro:user-delete:'||p_user::text,0));
  select * into target from profiles where id=p_user for update;
  if not found then return jsonb_build_object('ok',false,'error','user_not_found'); end if;
  if target.is_admin or target.access_role in ('super_admin','administrator','developer','editor') then
    return jsonb_build_object('ok',false,'error','protected_account'); end if;
  if lower(target.email) is distinct from lower(p_email) then return jsonb_build_object('ok',false,'error','confirmation_mismatch'); end if;
  if exists(select 1 from generation_jobs where user_id=p_user and status in ('pending','reserved','processing')) then
    return jsonb_build_object('ok',false,'error','active_generation'); end if;
  if exists(select 1 from raiaccept_checkouts c join credit_orders o on o.id=c.order_id
    where c.user_id=p_user and (c.holds_membership or (o.status='pending' and c.creation_state<>'rejected'))) or
    exists(select 1 from credit_orders where user_id=p_user and status='pending' and provider in ('paddle','raiffeisen')) then
    return jsonb_build_object('ok',false,'error','active_payment'); end if;
  if exists(select 1 from memberships where user_id=p_user and payment_provider='paddle' and renewal_mode='automatic'
    and not suspended and expires_at>now()) then return jsonb_build_object('ok',false,'error','automatic_subscription'); end if;
  insert into admin_user_deletion_locks(user_id,actor_id) values(p_user,p_actor) on conflict(user_id) do nothing;
  insert into audit_events(actor_id,action,target_type,target_id,before_state,metadata)
    values(p_actor,'users.deletion_requested','user',p_user::text,
      jsonb_build_object('email',target.email,'credits',target.credits),jsonb_build_object('financial_history_retained',true));
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.admin_begin_user_delete(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_begin_user_delete(uuid,uuid,text) to service_role;

notify pgrst,'reload schema';
commit;
