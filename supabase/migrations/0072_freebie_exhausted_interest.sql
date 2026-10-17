-- Interest after a Code Drop reaches its claim limit. No historical backfill.
begin;
alter table public.freebie_drops
  add column missed_users integer not null default 0 check(missed_users>=0),
  add column missed_attempts bigint not null default 0 check(missed_attempts>=missed_users);
create table public.freebie_exhausted_attempts (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.freebie_drops(id),
  user_id uuid references auth.users(id) on delete set null,
  attempts bigint not null default 1 check(attempts>0),
  first_attempt_at timestamptz not null default clock_timestamp(),
  last_attempt_at timestamptz not null default clock_timestamp(),
  unique(drop_id,user_id)
);
create index freebie_exhausted_attempts_drop_idx on public.freebie_exhausted_attempts(drop_id,last_attempt_at desc,id desc);
alter table public.freebie_exhausted_attempts enable row level security;
revoke all on public.freebie_exhausted_attempts from public,anon,authenticated;
grant select on public.freebie_exhausted_attempts to service_role;

create or replace function public.claim_freebie_drop(p_user uuid,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.freebie_drops%rowtype; existing public.freebie_claims%rowtype;
  missed_attempt_count bigint; activity integer; balance integer; claim_id uuid:=gen_random_uuid(); membership_id uuid; expiry timestamptz;
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
  if d.claims_count>=d.max_claims then
    -- The existing drop lock serializes counters with the final successful claim.
    -- Count each account once, retaining repeated attempts without duplicating people.
    insert into public.freebie_exhausted_attempts(drop_id,user_id) values(d.id,p_user)
      on conflict(drop_id,user_id) do update set attempts=freebie_exhausted_attempts.attempts+1,last_attempt_at=clock_timestamp()
      returning attempts into missed_attempt_count;
    update public.freebie_drops set missed_users=missed_users+case when missed_attempt_count=1 then 1 else 0 end,
      missed_attempts=missed_attempts+1 where id=d.id;
    return jsonb_build_object('ok',false,'error','claims_exhausted');
  end if;
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


revoke all on function public.claim_freebie_drop(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_freebie_drop(uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
