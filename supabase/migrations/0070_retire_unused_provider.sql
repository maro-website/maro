-- Retire the rejected provider after confirming it has no production history.
-- Applied migrations remain immutable; shared order accounting is retained.
begin;
set local lock_timeout='5s';
lock table public.credit_orders, public.memberships, public.paddle_webhook_events in access exclusive mode;
do $$ begin
  if exists(select 1 from public.credit_orders where provider='paddle')
    or exists(select 1 from public.memberships where payment_provider='paddle')
    or exists(select 1 from public.paddle_webhook_events) then
    raise exception 'provider_retirement_has_history';
  end if;
  if exists(select 1 from public.credit_orders where paddle_customer_id is not null or paddle_subscription_id is not null
      or paddle_price_id is not null or paddle_period_start is not null or paddle_period_end is not null)
    or exists(select 1 from public.memberships where paddle_customer_id is not null or paddle_subscription_id is not null
      or paddle_price_id is not null or paddle_status is not null or paddle_scheduled_change is not null
      or paddle_paid_through is not null or paddle_origin_order_id is not null or paddle_event_at is not null) then
    raise exception 'provider_retirement_has_metadata';
  end if;
end $$;

-- Rename the existing accounting helpers, retaining their restricted ACLs.
alter function public.fulfill_non_paddle_commerce_order(uuid,text) rename to fulfill_manual_commerce_order;
alter function public.cancel_non_paddle_credit_order(uuid,text) rename to cancel_manual_credit_order;

CREATE OR REPLACE FUNCTION public.reserve_raiaccept_checkout(p_user_id uuid, p_request_key uuid, p_item_id text, p_environment text, p_merchant text, p_billing jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    where m2.user_id=p_user_id order by (not m2.suspended and m2.started_at<=now() and m2.expires_at>now()) desc,m2.expires_at desc limit 1;
  if m.id is not null then effective := public.membership_effective_status(m.expires_at,m.renewal_window_days,m.plan_id,m.suspended,now()); end if;
  if p_item_id like 'topup-%' then
    if effective not in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then return jsonb_build_object('ok',false,'error','topup_requires_active_plan'); end if;
    select * into tp from public.commerce_topups where id=p_item_id and enabled;
    if tp.id is null or tp.currency<>'EUR' then return jsonb_build_object('ok',false,'error','invalid_item'); end if;
    kind := 'topup'; amount := tp.price_cents; credit_count := tp.credits; label := tp.credits::text || ' kredite Top-up';
    snapshot := jsonb_build_object('topup_id',tp.id);
  else
    if m.id is not null and m.renewal_mode='automatic' and not m.suspended then
      return jsonb_build_object('ok',false,'error','automatic_subscription');
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
$function$;

CREATE OR REPLACE FUNCTION public.apply_raiaccept_verification(p_order_id uuid, p_lease_id uuid, p_order jsonb, p_transaction jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c public.raiaccept_checkouts%rowtype; o public.credit_orders%rowtype; m record;
  payment public.raiaccept_verified_payments%rowtype; uid uuid; bank_paid_at timestamptz; reason text;
  effective text:='NO_PLAN'; new_balance integer; granted_membership_id uuid; days integer; new_expires timestamptz;
  bank_status text:=p_order->>'status'; tx_id text:=p_transaction->>'id'; count_paid integer;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  select user_id into uid from public.raiaccept_checkouts where order_id=p_order_id;
  if uid is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,742));
  select * into c from public.raiaccept_checkouts where order_id=p_order_id for update;
  if p_lease_id is null or c.verification_lease_id is distinct from p_lease_id then return jsonb_build_object('ok',false,'error','lease_mismatch'); end if;
  select * into o from public.credit_orders where id=p_order_id for update;
  if p_order->>'id' is null or p_order->>'id' !~ '^[A-Za-z0-9_-]{1,150}$'
    or (c.provider_order_id is not null and c.provider_order_id is distinct from p_order->>'id')
    or p_order->>'merchantAccountId' is distinct from c.merchant_account_id or p_order->>'merchantReference' is distinct from c.merchant_reference
    or p_order->>'currency' is distinct from c.currency or jsonb_typeof(p_order->'amountCents') is distinct from 'number'
    or (p_order->>'amountCents')::numeric<>c.amount_cents or jsonb_typeof(p_order->'isProduction') is distinct from 'boolean'
    or (p_order->>'isProduction')::boolean is distinct from (c.environment='production')
    or bank_status is null or bank_status not in ('DRAFT','CHECKOUT','PAID','PARTIALLY_REFUNDED','FULLY_REFUNDED','FAILED','CANCELED','ABANDONED') then
    return jsonb_build_object('ok',false,'error','provider_order_mismatch'); end if;
  if o.provider is distinct from 'raiaccept' or o.user_id is distinct from c.user_id or o.amount_cents<>c.amount_cents or o.credits<>c.credits
    or o.currency<>c.currency or o.order_kind is distinct from c.commercial_snapshot->>'order_kind'
    or o.commercial_snapshot is distinct from c.commercial_snapshot or o.billing_snapshot is distinct from c.billing_snapshot then
    return jsonb_build_object('ok',false,'error','local_snapshot_mismatch'); end if;
  if c.provider_order_id is null then
    -- A notification may discover an order after a lost creation response. Only authenticated matching evidence binds it.
    update public.raiaccept_checkouts set provider_order_id=p_order->>'id',creation_state='created',lease_id=null,
      session_state=case when bank_status='DRAFT' then session_state else 'creation_unknown' end where order_id=p_order_id;
    update public.credit_orders set provider_order_id=p_order->>'id' where id=p_order_id;
  end if;
  update public.raiaccept_checkouts set verified_order_status=bank_status,last_verified_at=now(),last_error=null,updated_at=now(),
    last_verified_summary=jsonb_build_object('provider_order_id',p_order->>'id','status',bank_status,'amount_cents',c.amount_cents,
      'currency',c.currency,'merchant_reference',c.merchant_reference,'environment',c.environment,'transaction_id',tx_id,
      'successful_purchase_count',p_order->'purchaseCount') where order_id=p_order_id;
  if bank_status in ('PAID','PARTIALLY_REFUNDED','FULLY_REFUNDED') then
    if p_transaction is null or tx_id is null or tx_id !~ '^[A-Za-z0-9_-]{1,150}$'
      or p_transaction->>'orderId' is distinct from p_order->>'id' or p_transaction->>'merchantAccountId' is distinct from c.merchant_account_id
      or p_transaction->>'merchantReference' is distinct from c.merchant_reference or p_transaction->>'currency' is distinct from c.currency
      or jsonb_typeof(p_transaction->'amountCents') is distinct from 'number' or (p_transaction->>'amountCents')::numeric<>c.amount_cents
      or jsonb_typeof(p_transaction->'isProduction') is distinct from 'boolean' or (p_transaction->>'isProduction')::boolean is distinct from (c.environment='production')
      or p_transaction->>'type' is distinct from 'PURCHASE' or p_transaction->>'status' is distinct from 'SUCCESS' or p_transaction->>'statusCode' is distinct from '0000'
      or jsonb_typeof(p_order->'purchaseCount') is distinct from 'number' or (p_order->>'purchaseCount')::numeric not between 1 and 20
      or (p_order->>'purchaseCount')::numeric<>trunc((p_order->>'purchaseCount')::numeric) then
      return jsonb_build_object('ok',false,'error','successful_purchase_required'); end if;
    count_paid:=(p_order->>'purchaseCount')::integer;
    if p_transaction->>'updatedAt' is null or p_transaction->>'updatedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$' then
      return jsonb_build_object('ok',false,'error','invalid_paid_timestamp'); end if;
    bank_paid_at:=(p_transaction->>'updatedAt')::timestamptz;
    if bank_paid_at<c.created_at-interval '1 minute' or bank_paid_at>now()+interval '5 minutes' then return jsonb_build_object('ok',false,'error','invalid_paid_timestamp'); end if;
    insert into public.raiaccept_verified_payments(environment,merchant_account_id,transaction_id,order_id,amount_cents,currency,paid_at)
      values(c.environment,c.merchant_account_id,tx_id,p_order_id,c.amount_cents,c.currency,bank_paid_at) on conflict do nothing;
    select * into payment from public.raiaccept_verified_payments where environment=c.environment and merchant_account_id=c.merchant_account_id and transaction_id=tx_id;
    if payment.order_id is distinct from p_order_id then return jsonb_build_object('ok',false,'error','provider_transaction_duplicate'); end if;
    if o.provider_transaction_id is not null and o.provider_transaction_id<>tx_id then reason:='multiple_successful_purchases'; end if;
    if count_paid<>1 then reason:='multiple_successful_purchases'; end if;
    update public.credit_orders set status='paid',paid_at=coalesce(credit_orders.paid_at,bank_paid_at),provider_transaction_id=coalesce(provider_transaction_id,tx_id) where id=p_order_id;
    if (c.payment_state='fully_refunded' and bank_status<>'FULLY_REFUNDED') or (c.payment_state='partially_refunded' and bank_status='PAID') then
      reason:='bank_state_regression';
    else
      update public.raiaccept_checkouts set payment_state=case bank_status when 'PAID' then 'paid' when 'PARTIALLY_REFUNDED' then 'partially_refunded' else 'fully_refunded' end where order_id=p_order_id;
    end if;
    if bank_status<>'PAID' then reason:='refund_detected'; end if;
    if c.fulfillment_state='manual_review' and reason is null then reason:=coalesce(c.review_reason,'manual_review'); end if;
    if c.fulfillment_state<>'fulfilled' and reason is null then
      perform 1 from public.profiles where id=uid for update;
      if not found then reason:='profile_missing'; end if;
      select m2.*,cp.renewal_window_days into m from public.memberships m2 join public.commerce_plans cp on cp.id=m2.plan_id
        where m2.user_id=uid order by (not m2.suspended and m2.started_at<=now() and m2.expires_at>now()) desc,m2.expires_at desc limit 1;
      if m.id is not null then effective:=public.membership_effective_status(m.expires_at,m.renewal_window_days,m.plan_id,m.suspended,now()); end if;
      if reason is not null then null;
      elsif exists(select 1 from public.memberships where user_id=uid and renewal_mode='automatic' and not suspended)
        and o.order_kind<>'topup' then reason:='automatic_subscription';
      elsif exists(select 1 from public.profiles where id=uid and credits::bigint+c.credits>2147483647) then reason:='credit_balance_overflow';
      elsif o.order_kind='topup' then
        if effective not in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') or m.suspended then reason:='topup_plan_changed'; else granted_membership_id:=m.id; end if;
      elsif o.order_kind='plan_purchase' then
        if (m.id is not null and not m.suspended and m.expires_at>now()) or effective in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then reason:='plan_already_active'; end if;
      elsif o.order_kind in ('plan_upgrade','plan_renewal') then
        if m.id is distinct from c.expected_membership_id or m.expires_at is distinct from c.expected_membership_expires_at
          or m.plan_id is distinct from (case when o.order_kind='plan_upgrade' then 'standard' else c.commercial_snapshot->>'plan_id' end)
          or m.suspended or m.renewal_mode<>'manual' then reason:='membership_changed';
        elsif o.order_kind='plan_upgrade' and effective not in ('ACTIVE','RENEWAL_WINDOW') then reason:='upgrade_expired';
        elsif o.order_kind='plan_renewal' and (bank_paid_at>m.expires_at or bank_paid_at<m.expires_at-(c.commercial_snapshot->>'renewal_window_days')::integer*interval '1 day'
          or m.cycle_renewal_fulfilled_at>=m.expires_at-(c.commercial_snapshot->>'renewal_window_days')::integer*interval '1 day') then reason:='renewal_cycle_changed';
        else granted_membership_id:=m.id; end if;
      else reason:='unsupported_order_kind'; end if;
      if o.order_kind<>'topup' then
        days:=(c.commercial_snapshot->>'duration_days')::integer;
        if days is null or days not between 1 and 366 or c.commercial_snapshot->>'plan_id' is null or c.commercial_snapshot->>'plan_id' not in ('standard','pro') then reason:='invalid_frozen_plan'; end if;
        if o.order_kind='plan_renewal' and m.expires_at+days*interval '1 day'<=now() then reason:='renewal_processing_delayed'; end if;
      end if;
      if reason is null then
        if o.order_kind='plan_purchase' then
          new_expires:=now()+days*interval '1 day';
          insert into public.memberships(user_id,plan_id,started_at,expires_at,renewal_mode,renewed_from_id,payment_provider)
            values(uid,c.commercial_snapshot->>'plan_id',now(),new_expires,'manual',m.id,'raiaccept') returning id into granted_membership_id;
        elsif o.order_kind='plan_renewal' then
          new_expires:=m.expires_at+days*interval '1 day';
          update public.memberships set expires_at=new_expires,cycle_renewal_fulfilled_at=now(),payment_provider='raiaccept',updated_at=now() where id=granted_membership_id;
        elsif o.order_kind='plan_upgrade' then
          update public.memberships set plan_id='pro',payment_provider='raiaccept',updated_at=now() where id=granted_membership_id;
        end if;
        update public.profiles set credits=credits+c.credits,
          maro_plan=case when o.order_kind='topup' then maro_plan else c.commercial_snapshot->>'plan_id' end where id=uid returning credits into new_balance;
        insert into public.credit_transactions(user_id,type,amount,balance_after,idempotency_key,order_id,membership_id,metadata)
          values(uid,o.order_kind,c.credits,new_balance,'raiaccept:'||c.environment||':'||tx_id,p_order_id,granted_membership_id,
            jsonb_build_object('provider','raiaccept','environment',c.environment,'provider_transaction_id',tx_id,'merchant_reference',c.merchant_reference,'frozen_snapshot',c.commercial_snapshot));
        update public.credit_orders set membership_id=granted_membership_id where id=p_order_id;
        update public.raiaccept_checkouts set fulfillment_state='fulfilled',holds_membership=false where order_id=p_order_id;
        insert into public.raiaccept_receipt_jobs(order_id) values(p_order_id) on conflict do nothing;
      end if;
    end if;
    if reason is not null then
      update public.raiaccept_checkouts set fulfillment_state=case when fulfillment_state='fulfilled' then fulfillment_state else 'manual_review' end,
        review_reason=reason,holds_membership=case when bank_status='FULLY_REFUNDED' then false else holds_membership end where order_id=p_order_id;
    end if;
  elsif bank_status in ('FAILED','CANCELED','ABANDONED') then
    if c.payment_state in ('paid','partially_refunded','fully_refunded') then reason:='bank_state_regression';
    else
      update public.raiaccept_checkouts set payment_state='unpaid',holds_membership=false where order_id=p_order_id;
      update public.credit_orders set status=case when bank_status='FAILED' then 'failed' else 'canceled' end,cancel_reason='bank_verified_'||lower(bank_status) where id=p_order_id and status<>'paid';
    end if;
  elsif c.payment_state in ('paid','partially_refunded','fully_refunded') then reason:='bank_state_regression';
  end if;
  if reason='bank_state_regression' then update public.raiaccept_checkouts set review_reason=reason where order_id=p_order_id; end if;
  update public.raiaccept_checkouts set verification_lease_id=null,
    next_check_at=case when payment_state in ('paid','partially_refunded','fully_refunded') then now()+interval '6 hours'
      when payment_state='unpaid' then null else now()+interval '2 minutes' end,updated_at=now() where order_id=p_order_id returning * into c;
  update public.raiaccept_verification_queue set processed_version=greatest(processed_version,c.verification_queue_version) where order_id=p_order_id;
  return jsonb_build_object('ok',true,'payment_state',c.payment_state,'fulfillment_state',c.fulfillment_state,'review_reason',c.review_reason);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fulfill_commerce_order(p_order_id uuid, p_provider_transaction_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.credit_orders%rowtype;
begin
  select * into o from public.credit_orders where id=p_order_id;
  if o.provider='raiaccept' then return jsonb_build_object('ok',false,'error','raiaccept_verified_payment_required'); end if;
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,742));
  if o.order_kind in ('plan_purchase','plan_renewal','plan_upgrade','business_payment') and exists(
    select 1 from public.memberships where user_id=o.user_id and renewal_mode='automatic' and not suspended
  ) then return jsonb_build_object('ok',false,'error','automatic_subscription'); end if;
  return public.fulfill_manual_commerce_order(p_order_id,p_provider_transaction_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_credit_order(p_order_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists(select 1 from public.credit_orders where id=p_order_id and provider='raiaccept') then return jsonb_build_object('ok',false,'error','raiaccept_bank_verification_required'); end if;
  return public.cancel_manual_credit_order(p_order_id,p_reason);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_change_user_plan(p_actor uuid, p_user uuid, p_plan text, p_duration_days integer, p_note text, p_change_id uuid, p_expected_membership uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if existing.renewal_mode='automatic' then
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_begin_user_delete(p_actor uuid, p_user uuid, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    exists(select 1 from credit_orders where user_id=p_user and status='pending' and provider='raiffeisen') then
    return jsonb_build_object('ok',false,'error','active_payment'); end if;
  if exists(select 1 from memberships where user_id=p_user and renewal_mode='automatic'
    and not suspended and expires_at>now()) then return jsonb_build_object('ok',false,'error','automatic_subscription'); end if;
  insert into admin_user_deletion_locks(user_id,actor_id) values(p_user,p_actor) on conflict(user_id) do nothing;
  insert into audit_events(actor_id,action,target_type,target_id,before_state,metadata)
    values(p_actor,'users.deletion_requested','user',p_user::text,
      jsonb_build_object('email',target.email,'credits',target.credits),jsonb_build_object('financial_history_retained',true));
  return jsonb_build_object('ok',true);
end;
$function$;

-- The reporting view retains all actual orders and the bank verification filter.
drop view if exists public.admin_real_paid_orders;
drop function public.apply_paddle_event(jsonb);
drop function public.create_paddle_order(uuid,text,text,jsonb);
drop table public.paddle_webhook_events;
alter table public.credit_orders
  drop column paddle_customer_id, drop column paddle_subscription_id, drop column paddle_price_id,
  drop column paddle_period_start, drop column paddle_period_end;
alter table public.memberships
  drop column paddle_customer_id, drop column paddle_subscription_id, drop column paddle_price_id,
  drop column paddle_status, drop column paddle_scheduled_change, drop column paddle_paid_through,
  drop column paddle_origin_order_id, drop column paddle_event_at;
create view public.admin_real_paid_orders with (security_invoker=true) as
select o.* from public.credit_orders o
where o.status='paid' and o.paid_at is not null and o.provider in ('raiaccept','raiffeisen')
  and coalesce(o.commercial_snapshot->>'environment','production')<>'sandbox'
  and (o.provider<>'raiaccept' or exists(select 1 from public.raiaccept_checkouts c
    where c.order_id=o.id and c.environment='production' and c.fulfillment_state='fulfilled'
      and c.payment_state in ('paid','partially_refunded','fully_refunded')));
revoke all on public.admin_real_paid_orders from public,anon,authenticated;
grant select on public.admin_real_paid_orders to service_role;
commit;
