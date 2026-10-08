-- RaiAccept checkout intents only. No payment or credit fulfillment here.
begin;

create table public.raiaccept_checkouts (
  order_id uuid primary key references public.credit_orders(id),
  user_id uuid not null references auth.users(id),
  request_key uuid not null,
  requested_item text not null,
  environment text not null check(environment in ('sandbox','production')),
  merchant_account_id text not null,
  merchant_reference text not null,
  amount_cents integer not null check(amount_cents > 0),
  currency text not null check(currency = 'EUR'),
  credits integer not null check(credits > 0),
  commercial_snapshot jsonb not null,
  billing_snapshot jsonb not null,
  expected_membership_id uuid references public.memberships(id),
  expected_membership_expires_at timestamptz,
  holds_membership boolean not null default false,
  creation_state text not null default 'reserved' check(creation_state in ('reserved','creating','created','creation_unknown','rejected')),
  session_state text not null default 'not_started' check(session_state in ('not_started','creating','ready','creation_unknown','rejected')),
  lease_id uuid,
  lease_started_at timestamptz,
  request_payload jsonb,
  provider_order_id text,
  session_id text,
  redirect_url text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,environment,request_key),
  unique(environment,merchant_account_id,merchant_reference),
  unique(environment,merchant_account_id,provider_order_id)
);
create unique index raiaccept_membership_checkout_once on public.raiaccept_checkouts(user_id,environment) where holds_membership;
alter table public.raiaccept_checkouts enable row level security;
revoke all on public.raiaccept_checkouts from public,anon,authenticated;
grant select,insert,update on public.raiaccept_checkouts to service_role;

create function public.reserve_raiaccept_checkout(
  p_user_id uuid,p_request_key uuid,p_item_id text,p_environment text,p_merchant text,p_billing jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  c public.raiaccept_checkouts%rowtype;
  o public.credit_orders%rowtype;
  m record;
  cp public.commerce_plans%rowtype;
  tp public.commerce_topups%rowtype;
  effective text := 'NO_PLAN';
  kind text;
  amount integer;
  credit_count integer;
  label text;
  snapshot jsonb;
  order_uuid uuid := gen_random_uuid();
  email text;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_user_id is null or p_request_key is null or p_item_id is null or length(p_item_id)>64
    or p_environment is null or p_environment not in ('sandbox','production')
    or p_merchant is null or p_merchant !~ '^[A-Za-z0-9_-]{1,150}$' then
    return jsonb_build_object('ok',false,'error','invalid_request');
  end if;
  if p_billing is null or jsonb_typeof(p_billing)<>'object' or p_billing->'legalConsent' is distinct from 'true'::jsonb
    or coalesce(length(trim(p_billing->>'fullName')),0) not between 1 and 255
    or coalesce(length(trim(p_billing->>'email')),0) not between 1 and 255
    or coalesce(length(trim(p_billing->>'country')),0) not between 1 and 255
    or coalesce(length(trim(p_billing->>'city')),0) not between 1 and 255 then
    return jsonb_build_object('ok',false,'error','invalid_billing');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,742));
  perform 1 from public.profiles where id=p_user_id for update;
  if not found then return jsonb_build_object('ok',false,'error','user_not_found'); end if;
  select * into c from public.raiaccept_checkouts where user_id=p_user_id and environment=p_environment and request_key=p_request_key;
  if found then
    if c.requested_item is distinct from p_item_id or c.merchant_account_id is distinct from p_merchant or c.billing_snapshot is distinct from p_billing then
      return jsonb_build_object('ok',false,'error','idempotency_conflict');
    end if;
    select * into o from public.credit_orders where id=c.order_id;
    return jsonb_build_object('ok',true,'created',false,'checkout',to_jsonb(c),'order',to_jsonb(o));
  end if;
  select m2.*,cp2.renewal_window_days into m from public.memberships m2 join public.commerce_plans cp2 on cp2.id=m2.plan_id
    where m2.user_id=p_user_id order by m2.expires_at desc limit 1;
  if m.id is not null then effective := public.membership_effective_status(m.expires_at,m.renewal_window_days,m.plan_id,m.suspended,now()); end if;
  if p_item_id like 'topup-%' then
    if effective not in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then return jsonb_build_object('ok',false,'error','topup_requires_active_plan'); end if;
    select * into tp from public.commerce_topups where id=p_item_id and enabled;
    if tp.id is null or tp.currency<>'EUR' then return jsonb_build_object('ok',false,'error','invalid_item'); end if;
    kind := 'topup'; amount := tp.price_cents; credit_count := tp.credits; label := tp.credits::text || ' kredite Top-up';
    snapshot := jsonb_build_object('topup_id',tp.id);
  else
    if m.id is not null and m.payment_provider='paddle' and (m.paddle_status<>'canceled' or m.expires_at>now()) then
      return jsonb_build_object('ok',false,'error','paddle_managed_subscription');
    end if;
    if exists(select 1 from public.raiaccept_checkouts where user_id=p_user_id and environment=p_environment and holds_membership) then
      return jsonb_build_object('ok',false,'error','order_in_progress');
    end if;
    if p_item_id in ('standard','pro') then
      if effective in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then return jsonb_build_object('ok',false,'error','plan_already_active'); end if;
      select * into cp from public.commerce_plans where id=p_item_id and enabled and not contact_only;
      kind := 'plan_purchase';
    elsif p_item_id='renew' then
      if effective<>'RENEWAL_WINDOW' then return jsonb_build_object('ok',false,'error','renewal_not_available'); end if;
      if m.cycle_renewal_fulfilled_at is not null and m.cycle_renewal_fulfilled_at >= m.expires_at - m.renewal_window_days * interval '1 day' then
        return jsonb_build_object('ok',false,'error','renewal_already_fulfilled');
      end if;
      select * into cp from public.commerce_plans where id=m.plan_id and enabled and not contact_only;
      kind := 'plan_renewal';
    elsif p_item_id in ('upgrade','upgrade-pro') then
      if effective not in ('ACTIVE','RENEWAL_WINDOW') or m.plan_id<>'standard' then return jsonb_build_object('ok',false,'error','upgrade_not_eligible'); end if;
      select * into cp from public.commerce_plans where id='pro' and enabled and not contact_only;
      kind := 'plan_upgrade';
    else return jsonb_build_object('ok',false,'error','invalid_item'); end if;
    if cp.id is null or cp.currency<>'EUR' or cp.renewal_mode<>'manual' or cp.duration_days<1 then
      return jsonb_build_object('ok',false,'error','invalid_item');
    end if;
    amount := cp.price_cents; credit_count := cp.included_credits; label := cp.display_name;
    snapshot := jsonb_build_object('plan_id',cp.id,'duration_days',cp.duration_days,'renewal_window_days',cp.renewal_window_days);
    if kind='plan_upgrade' then
      select amount - price_cents,credit_count - included_credits into amount,credit_count from public.commerce_plans where id='standard' and enabled;
      snapshot := snapshot || jsonb_build_object('upgrade_from','standard','upgrade_to','pro');
    end if;
  end if;
  if amount is null or credit_count is null or amount<=0 or credit_count<=0 then return jsonb_build_object('ok',false,'error','invalid_item'); end if;
  snapshot := snapshot || jsonb_build_object('captured_at',now(),'order_kind',kind,'plan_name_snapshot',label,'price_cents',amount,'currency','EUR','credits_snapshot',credit_count);
  select u.email into email from auth.users u where u.id=p_user_id;
  insert into public.credit_orders(id,user_id,user_email,credits,amount_cents,currency,status,provider,item_type,item_id,order_kind,commercial_snapshot,billing_snapshot)
    values(order_uuid,p_user_id,email,credit_count,amount,'EUR','pending','raiaccept',case when kind='topup' then 'topup' else 'plan' end,
      case when kind='topup' then tp.id else cp.id end,kind,snapshot,p_billing) returning * into o;
  insert into public.raiaccept_checkouts(order_id,user_id,request_key,requested_item,environment,merchant_account_id,merchant_reference,
    amount_cents,currency,credits,commercial_snapshot,billing_snapshot,expected_membership_id,expected_membership_expires_at,holds_membership)
    values(order_uuid,p_user_id,p_request_key,p_item_id,p_environment,p_merchant,'MARO-' || case when p_environment='production' then 'P-' else 'S-' end || order_uuid::text,
      amount,'EUR',credit_count,snapshot,p_billing,m.id,m.expires_at,kind<>'topup') returning * into c;
  return jsonb_build_object('ok',true,'created',true,'checkout',to_jsonb(c),'order',to_jsonb(o));
end;
$$;

create function public.transition_raiaccept_checkout(p_order_id uuid,p_user_id uuid,p_lease_id uuid,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.raiaccept_checkouts%rowtype; claimed boolean := false;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  select * into c from public.raiaccept_checkouts where order_id=p_order_id and user_id=p_user_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if p_action='claim_order' then
    if c.creation_state='reserved' then
      if p_data->'invoice'->>'merchantOrderReference' is distinct from c.merchant_reference
        or p_data->'invoice'->>'currency' is distinct from c.currency
        or jsonb_typeof(p_data->'invoice'->'amount') is distinct from 'number'
        or (p_data->'invoice'->>'amount')::numeric*100<>c.amount_cents then
        return jsonb_build_object('ok',false,'error','payload_mismatch');
      end if;
      update public.raiaccept_checkouts set creation_state='creating',request_payload=p_data,lease_id=gen_random_uuid(),lease_started_at=now(),updated_at=now()
        where order_id=p_order_id returning * into c; claimed := true;
    end if;
  elsif p_action='claim_session' then
    if c.creation_state='created' and c.session_state='not_started' then
      update public.raiaccept_checkouts set session_state='creating',lease_id=gen_random_uuid(),lease_started_at=now(),updated_at=now()
        where order_id=p_order_id returning * into c; claimed := true;
    end if;
  else
    if p_lease_id is null or c.lease_id is distinct from p_lease_id then return jsonb_build_object('ok',false,'error','lease_mismatch'); end if;
    if p_action='bind_order' and c.creation_state='creating' then
      if p_data->>'id' is null or p_data->>'id' !~ '^[A-Za-z0-9_-]{1,150}$'
        or p_data->>'merchantAccountId' is distinct from c.merchant_account_id
        or p_data->>'merchantReference' is distinct from c.merchant_reference
        or p_data->>'currency' is distinct from c.currency or p_data->>'status' is distinct from 'DRAFT'
        or jsonb_typeof(p_data->'isProduction') is distinct from 'boolean'
        or (p_data->>'isProduction')::boolean is distinct from (c.environment='production')
        or jsonb_typeof(p_data->'amountCents') is distinct from 'number'
        or (p_data->>'amountCents')::numeric<>c.amount_cents then return jsonb_build_object('ok',false,'error','provider_order_mismatch'); end if;
      update public.raiaccept_checkouts set provider_order_id=p_data->>'id',creation_state='created',lease_id=null,updated_at=now()
        where order_id=p_order_id returning * into c;
      update public.credit_orders set provider_order_id=c.provider_order_id where id=p_order_id;
    elsif p_action='bind_session' and c.session_state='creating' then
      if p_data->>'sessionId' is null or p_data->>'sessionId' !~ '^[A-Za-z0-9_-]{1,150}$'
        or p_data->>'redirectUrl' is distinct from ('https://payment.raiaccept.com/checkout?paymentSession=' || (p_data->>'sessionId')) then
        return jsonb_build_object('ok',false,'error','provider_session_mismatch');
      end if;
      update public.raiaccept_checkouts set session_id=p_data->>'sessionId',redirect_url=p_data->>'redirectUrl',session_state='ready',lease_id=null,updated_at=now()
        where order_id=p_order_id returning * into c;
    elsif p_action='order_error' and c.creation_state='creating' or p_action='session_error' and c.session_state='creating' then
      if p_data->>'code' is null or p_data->>'code' !~ '^[a-z0-9_]{1,100}$' or jsonb_typeof(p_data->'uncertain') is distinct from 'boolean' then
        return jsonb_build_object('ok',false,'error','invalid_error');
      end if;
      if p_action='order_error' then
        update public.raiaccept_checkouts set creation_state=case when (p_data->>'uncertain')::boolean then 'creation_unknown' else 'rejected' end,
          holds_membership=case when (p_data->>'uncertain')::boolean then holds_membership else false end,last_error=p_data->>'code',lease_id=null,updated_at=now()
          where order_id=p_order_id returning * into c;
        if c.creation_state='rejected' then update public.credit_orders set status='failed',cancel_reason='gateway_order_rejected' where id=p_order_id; end if;
      else
        -- A bank order already exists. Session errors do not prove no payment.
        update public.raiaccept_checkouts set session_state='creation_unknown',last_error=p_data->>'code',lease_id=null,updated_at=now()
          where order_id=p_order_id returning * into c;
      end if;
    else return jsonb_build_object('ok',false,'error','invalid_transition'); end if;
  end if;
  return jsonb_build_object('ok',true,'claimed',claimed,'checkout',to_jsonb(c));
end;
$$;

revoke all on function public.reserve_raiaccept_checkout(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.transition_raiaccept_checkout(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_raiaccept_checkout(uuid,uuid,text,text,text,jsonb) to service_role;
grant execute on function public.transition_raiaccept_checkout(uuid,uuid,uuid,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
