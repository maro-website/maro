-- Editable Code Drops and code reuse without losing prior claims or credit history.
begin;

alter table public.freebie_drops add column deleted_at timestamptz;
alter table public.freebie_drops add column credits_given bigint not null default 0 check (credits_given>=0);
update public.freebie_drops d set credits_given=coalesce((select sum(c.credits) from public.freebie_claims c where c.drop_id=d.id),0);
alter table public.freebie_drops drop constraint freebie_drops_code_key;
create unique index freebie_drops_available_code_idx on public.freebie_drops(code) where deleted_at is null;

create or replace function public.admin_create_freebie_drop(p_actor uuid,p_drop_id uuid,p_code text,p_title text,
  p_credits integer,p_max_claims integer,p_min_generations integer,p_target_user uuid,
  p_plan text,p_plan_days integer,p_starts_at timestamptz,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.freebie_drops%rowtype; normalized text:=upper(trim(p_code));
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_drop_id is null or normalized is null or normalized !~ '^[A-Z0-9][A-Z0-9_-]{2,63}$' or
    p_title is null or length(trim(p_title)) not between 3 and 160 or
    p_credits is null or p_credits not between 1 and 10000 or
    p_max_claims is null or p_max_claims not between 1 and 100000 or
    p_min_generations is null or p_min_generations not between 0 and 10000 or
    p_starts_at is null or (p_expires_at is not null and p_expires_at<=p_starts_at) or
    (p_target_user is not null and p_max_claims<>1) then
    return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  if p_target_user is not null and not exists(select 1 from profiles where id=p_target_user) then
    return jsonb_build_object('ok',false,'error','user_not_found'); end if;
  if (p_plan is null and p_plan_days is not null) or (p_plan is not null and
    (p_plan_days is null or p_plan_days not between 1 and 365 or
     not exists(select 1 from commerce_plans where id=p_plan and enabled))) then
    return jsonb_build_object('ok',false,'error','invalid_plan'); end if;
  -- A client-generated request ID makes retries safe without recreating a promotion.
  perform pg_advisory_xact_lock(hashtextextended('maro:freebie-create:'||p_drop_id::text,0));
  select * into d from freebie_drops where id=p_drop_id;
  if found then
    if d.deleted_at is not null then return jsonb_build_object('ok',false,'error','drop_deleted'); end if;
    if d.created_by is distinct from p_actor or d.code is distinct from normalized or d.title is distinct from trim(p_title) or
      d.credits is distinct from p_credits or d.max_claims is distinct from p_max_claims or
      d.min_generations_7d is distinct from p_min_generations or d.target_user_id is distinct from p_target_user or
      d.plan_id is distinct from p_plan or d.plan_days is distinct from p_plan_days or
      d.starts_at is distinct from p_starts_at or d.expires_at is distinct from p_expires_at then
      return jsonb_build_object('ok',false,'error','idempotency_conflict'); end if;
    return jsonb_build_object('ok',true,'already',true,'drop_id',d.id); end if;
  if exists(select 1 from freebie_drops where code=normalized and deleted_at is null) then
    return jsonb_build_object('ok',false,'error','code_exists'); end if;
  insert into freebie_drops(id,code,title,credits,max_claims,min_generations_7d,audience,target_user_id,
    plan_id,plan_days,starts_at,expires_at,created_by)
    values(p_drop_id,normalized,trim(p_title),p_credits,p_max_claims,p_min_generations,
      case when p_target_user is null then 'all' else 'user' end,p_target_user,p_plan,p_plan_days,p_starts_at,p_expires_at,p_actor);
  insert into audit_events(actor_id,action,target_type,target_id,after_state)
    values(p_actor,'freebies.created','freebie_drop',p_drop_id::text,
      jsonb_build_object('code',normalized,'credits',p_credits,'max_claims',p_max_claims,
        'budget_credits',p_credits::bigint*p_max_claims,'target_user_id',p_target_user,'plan_id',p_plan));
  return jsonb_build_object('ok',true,'already',false,'drop_id',p_drop_id);
end;
$$;

create or replace function public.admin_set_freebie_active(p_actor uuid,p_drop_id uuid,p_active boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare previous boolean;
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_active is null then return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  select active into previous from freebie_drops where id=p_drop_id and deleted_at is null for update;
  if not found then return jsonb_build_object('ok',false,'error','drop_not_found'); end if;
  if previous is distinct from p_active then
    update freebie_drops set active=p_active,updated_at=now() where id=p_drop_id;
    insert into audit_events(actor_id,action,target_type,target_id,before_state,after_state)
      values(p_actor,'freebies.status_changed','freebie_drop',p_drop_id::text,
        jsonb_build_object('active',previous),jsonb_build_object('active',p_active)); end if;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.claim_freebie_drop(p_user uuid,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.freebie_drops%rowtype; existing public.freebie_claims%rowtype;
  activity integer; balance integer; claim_id uuid:=gen_random_uuid(); membership_id uuid; expiry timestamptz;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_user is null or p_code is null or upper(trim(p_code)) !~ '^[A-Z0-9][A-Z0-9_-]{2,63}$' then
    return jsonb_build_object('ok',false,'error','invalid_code'); end if;
  perform pg_advisory_xact_lock(hashtextextended('maro:user-delete:'||p_user::text,0));
  if exists(select 1 from admin_user_deletion_locks where user_id=p_user) then
    return jsonb_build_object('ok',false,'error','account_unavailable'); end if;
  if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then
    return jsonb_build_object('ok',false,'error','email_unconfirmed'); end if;
  -- This row lock serializes the last available claim across different accounts.
  select * into d from freebie_drops where code=upper(trim(p_code)) and deleted_at is null for update;
  if not found then return jsonb_build_object('ok',false,'error','invalid_code'); end if;
  -- A deleted target must never turn a personal link into a public promotion.
  if d.audience='user' and d.target_user_id is distinct from p_user then
    return jsonb_build_object('ok',false,'error','wrong_account'); end if;
  select * into existing from freebie_claims where drop_id=d.id and user_id=p_user;
  if found then return jsonb_build_object('ok',false,'error','already_claimed'); end if;
  if not d.active then return jsonb_build_object('ok',false,'error','code_inactive'); end if;
  if d.starts_at>now() then return jsonb_build_object('ok',false,'error','not_started'); end if;
  if d.expires_at is not null and d.expires_at<=now() then return jsonb_build_object('ok',false,'error','code_expired'); end if;
  if d.claims_count>=d.max_claims then return jsonb_build_object('ok',false,'error','claims_exhausted'); end if;
  if d.min_generations_7d>0 then
    select count(*) into activity from generation_jobs where user_id=p_user and status='completed'
      and finished_at between now()-interval '7 days' and now();
    if activity<d.min_generations_7d then return jsonb_build_object('ok',false,'error','activity_required',
      'required',d.min_generations_7d,'current',activity); end if; end if;
  select credits into balance from profiles where id=p_user for update;
  if not found then return jsonb_build_object('ok',false,'error','account_unavailable'); end if;
  if balance::bigint+d.credits>2147483647 then return jsonb_build_object('ok',false,'error','balance_limit'); end if;
  if d.plan_id is not null then
    if not exists(select 1 from commerce_plans where id=d.plan_id and enabled) then
      return jsonb_build_object('ok',false,'error','plan_unavailable'); end if;
    if exists(select 1 from memberships where user_id=p_user and expires_at>now() and not suspended) then
      return jsonb_build_object('ok',false,'error','existing_plan'); end if;
    if exists(select 1 from raiaccept_checkouts where user_id=p_user and holds_membership) then
      return jsonb_build_object('ok',false,'error','active_payment'); end if;
    membership_id:=claim_id; expiry:=now()+d.plan_days*interval '1 day';
    insert into memberships(id,user_id,plan_id,started_at,expires_at,renewal_mode)
      values(membership_id,p_user,d.plan_id,now(),expiry,'manual');
    update profiles set maro_plan=d.plan_id where id=p_user;
  end if;
  balance:=balance+d.credits;
  update profiles set credits=balance where id=p_user;
  insert into freebie_claims(id,drop_id,user_id,credits,balance_after,membership_id)
    values(claim_id,d.id,p_user,d.credits,balance,membership_id);
  update freebie_drops set claims_count=claims_count+1,credits_given=credits_given+d.credits,updated_at=clock_timestamp() where id=d.id;
  insert into credit_transactions(user_id,type,amount,balance_after,idempotency_key,metadata)
    values(p_user,'manual_adjustment',d.credits,balance,'freebie:'||d.id::text,
      jsonb_build_object('source','freebie','drop_id',d.id,'claim_id',claim_id,'delta',d.credits,'code',d.code));
  insert into audit_events(actor_id,action,target_type,target_id,after_state,metadata)
    values(d.created_by,'freebies.claimed','freebie_claim',claim_id::text,
      jsonb_build_object('user_id',p_user,'drop_id',d.id,'credits',d.credits,'balance',balance,
        'plan_id',d.plan_id,'membership_id',membership_id,'expires_at',expiry),jsonb_build_object('source','freebie'));
  if d.plan_id is not null then
    insert into user_notifications(user_id,dedupe_key,kind,title,body,action_href,metadata)
      values(p_user,'freebie_plan:'||claim_id,'billing','Plani yt u aktivizua',
        'Plani nga kodi '||d.code||' është aktiv deri më '||to_char(expiry,'DD.MM.YYYY')||'.',
        '/account?tab=billing',jsonb_build_object('plan_id',d.plan_id,'expires_at',expiry))
      on conflict(user_id,dedupe_key) do nothing; end if;
  return jsonb_build_object('ok',true,'credits',d.credits,'balance',balance,'claim_id',claim_id,
    'plan_id',d.plan_id,'expires_at',expiry);
end;
$$;

create function public.admin_update_freebie_drop(p_actor uuid,p_drop_id uuid,p_title text,
  p_credits integer,p_max_claims integer,p_min_generations integer,p_plan text,p_plan_days integer,
  p_expires_at timestamptz,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.freebie_drops%rowtype;
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_drop_id is null or p_expected_updated_at is null or p_title is null or length(trim(p_title)) not between 3 and 160 or
    p_credits is null or p_credits not between 1 and 10000 or
    p_max_claims is null or p_max_claims not between 1 and 100000 or
    p_min_generations is null or p_min_generations not between 0 and 10000 then
    return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  select * into d from freebie_drops where id=p_drop_id and deleted_at is null for update;
  if not found then return jsonb_build_object('ok',false,'error','drop_not_found'); end if;
  if d.updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object('ok',false,'error','drop_changed'); end if;
  if p_max_claims<d.claims_count then return jsonb_build_object('ok',false,'error','claims_below_used'); end if;
  if (d.audience='user' and p_max_claims<>1) or (p_expires_at is not null and p_expires_at<=d.starts_at) then
    return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  if (p_plan is null and p_plan_days is not null) or (p_plan is not null and
    (p_plan_days is null or p_plan_days not between 1 and 365 or
     not exists(select 1 from commerce_plans where id=p_plan and enabled))) then
    return jsonb_build_object('ok',false,'error','invalid_plan'); end if;
  update freebie_drops set title=trim(p_title),credits=p_credits,max_claims=p_max_claims,
    min_generations_7d=p_min_generations,plan_id=p_plan,plan_days=p_plan_days,expires_at=p_expires_at,
    updated_at=clock_timestamp() where id=d.id;
  insert into audit_events(actor_id,action,target_type,target_id,before_state,after_state)
    values(p_actor,'freebies.updated','freebie_drop',d.id::text,
      jsonb_build_object('code',d.code,'title',d.title,'credits',d.credits,'max_claims',d.max_claims,
        'min_generations_7d',d.min_generations_7d,'plan_id',d.plan_id,'plan_days',d.plan_days,
        'expires_at',d.expires_at,'claims_count',d.claims_count,'credits_given',d.credits_given),
      jsonb_build_object('code',d.code,'title',trim(p_title),'credits',p_credits,'max_claims',p_max_claims,
        'min_generations_7d',p_min_generations,'plan_id',p_plan,'plan_days',p_plan_days,
        'expires_at',p_expires_at,'claims_count',d.claims_count,'credits_given',d.credits_given,
        'budget_credits',d.credits_given+(p_max_claims-d.claims_count)::bigint*p_credits));
  return jsonb_build_object('ok',true,'drop_id',d.id);
end;
$$;

create function public.admin_delete_freebie_drop(p_actor uuid,p_drop_id uuid,p_code text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.freebie_drops%rowtype;
begin
  if not public.admin_can_manage_users(p_actor) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_drop_id is null or p_code is null or p_expected_updated_at is null then
    return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  select * into d from freebie_drops where id=p_drop_id for update;
  if not found then return jsonb_build_object('ok',false,'error','drop_not_found'); end if;
  if d.code is distinct from upper(trim(p_code)) then return jsonb_build_object('ok',false,'error','confirmation_mismatch'); end if;
  if d.deleted_at is not null then return jsonb_build_object('ok',true,'already',true); end if;
  if d.updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object('ok',false,'error','drop_changed'); end if;
  update freebie_drops set active=false,deleted_at=clock_timestamp(),updated_at=clock_timestamp() where id=d.id;
  insert into audit_events(actor_id,action,target_type,target_id,before_state,after_state)
    values(p_actor,'freebies.deleted','freebie_drop',d.id::text,
      jsonb_build_object('code',d.code,'active',d.active,'credits',d.credits,'max_claims',d.max_claims,
        'claims_count',d.claims_count,'credits_given',d.credits_given),
      jsonb_build_object('active',false,'deleted',true,'code_released',d.code));
  return jsonb_build_object('ok',true,'already',false);
end;
$$;

revoke all on function public.admin_update_freebie_drop(uuid,uuid,text,integer,integer,integer,text,integer,timestamptz,timestamptz),
  public.admin_delete_freebie_drop(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_update_freebie_drop(uuid,uuid,text,integer,integer,integer,text,integer,timestamptz,timestamptz),
  public.admin_delete_freebie_drop(uuid,uuid,text,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
