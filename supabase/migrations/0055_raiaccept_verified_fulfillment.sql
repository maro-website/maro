-- Authenticated bank evidence -> financial record -> atomic fulfillment/outbox.
-- Apply together with 0054 only after explicit live-schema preflight; never run the unrelated 0053.
begin;
alter table public.raiaccept_checkouts
  add column payment_state text not null default 'unverified' check(payment_state in ('unverified','unpaid','paid','partially_refunded','fully_refunded')),
  add column fulfillment_state text not null default 'pending' check(fulfillment_state in ('pending','fulfilled','manual_review')),
  add column review_reason text,
  add column verified_order_status text,
  add column last_verified_at timestamptz,
  add column last_verified_summary jsonb,
  add column next_check_at timestamptz default now(),
  add column verification_attempts integer not null default 0,
  add column verification_lease_id uuid,
  add column verification_lease_started_at timestamptz,
  add column verification_queue_version bigint;

create table public.raiaccept_verification_queue (
  order_id uuid primary key references public.raiaccept_checkouts(order_id),
  candidate_provider_order_id text not null,
  version bigint not null default 1,
  processed_version bigint not null default 0,
  last_notified_at timestamptz not null default now()
);
create table public.raiaccept_verified_payments (
  environment text not null, merchant_account_id text not null, transaction_id text not null,
  order_id uuid not null references public.raiaccept_checkouts(order_id),
  amount_cents integer not null check(amount_cents>0), currency text not null check(currency='EUR'),
  paid_at timestamptz not null, verified_at timestamptz not null default now(),
  primary key(environment,merchant_account_id,transaction_id)
);
create table public.raiaccept_receipt_jobs (
  order_id uuid primary key references public.raiaccept_checkouts(order_id),
  state text not null default 'pending' check(state in ('pending','sending','sent','failed')),
  attempts integer not null default 0, created_at timestamptz not null default now(), sent_at timestamptz,
  next_attempt_at timestamptz not null default now(), last_error text
);
alter table public.raiaccept_verification_queue enable row level security;
alter table public.raiaccept_verified_payments enable row level security;
alter table public.raiaccept_receipt_jobs enable row level security;
revoke all on public.raiaccept_verification_queue,public.raiaccept_verified_payments,public.raiaccept_receipt_jobs from public,anon,authenticated;
grant select,insert,update on public.raiaccept_verification_queue,public.raiaccept_verified_payments,public.raiaccept_receipt_jobs to service_role;
create index raiaccept_verification_due on public.raiaccept_checkouts(next_check_at) where next_check_at is not null;

create function public.enqueue_raiaccept_verification(p_environment text,p_merchant text,p_provider_order_id text,p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.raiaccept_checkouts%rowtype;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_provider_order_id is null or p_provider_order_id !~ '^[A-Za-z0-9_-]{1,150}$' then return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  select * into c from public.raiaccept_checkouts where environment=p_environment and merchant_account_id=p_merchant
    and merchant_reference=p_reference and (provider_order_id=p_provider_order_id or provider_order_id is null);
  if not found then return jsonb_build_object('ok',true,'known',false); end if;
  insert into public.raiaccept_verification_queue(order_id,candidate_provider_order_id) values(c.order_id,p_provider_order_id)
    on conflict(order_id) do update set version=raiaccept_verification_queue.version+1,
      candidate_provider_order_id=excluded.candidate_provider_order_id,last_notified_at=now();
  return jsonb_build_object('ok',true,'known',true);
end;
$$;

create function public.claim_raiaccept_verifications(p_environment text,p_merchant text,p_limit integer default 10,p_order_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.raiaccept_checkouts%rowtype; q public.raiaccept_verification_queue%rowtype; jobs jsonb:='[]'::jsonb;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_environment is null or p_environment not in ('sandbox','production') or p_limit is null or p_limit not between 1 and 20 then
    return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  for c in select c2.* from public.raiaccept_checkouts c2 left join public.raiaccept_verification_queue q2 on q2.order_id=c2.order_id
    where c2.environment=p_environment and c2.merchant_account_id=p_merchant and c2.creation_state in ('created','creation_unknown','creating')
      and (p_order_id is null or c2.order_id=p_order_id)
      and (c2.next_check_at<=now() or q2.version>q2.processed_version)
      and (c2.verification_lease_id is null or c2.verification_lease_started_at<now()-interval '2 minutes')
      and not(c2.creation_state='creating' and c2.lease_started_at>now()-interval '2 minutes')
    order by coalesce(c2.next_check_at,q2.last_notified_at) limit p_limit for update of c2 skip locked
  loop
    select * into q from public.raiaccept_verification_queue where order_id=c.order_id;
    update public.raiaccept_checkouts set verification_lease_id=gen_random_uuid(),verification_lease_started_at=now(),
      verification_queue_version=coalesce(q.version,0),verification_attempts=verification_attempts+1,
      creation_state=case when creation_state='creating' then 'creation_unknown' else creation_state end,updated_at=now()
      where order_id=c.order_id returning * into c;
    jobs:=jobs||jsonb_build_array(to_jsonb(c)||jsonb_build_object('provider_order_id',coalesce(c.provider_order_id,q.candidate_provider_order_id)));
  end loop;
  return jsonb_build_object('ok',true,'jobs',jobs);
end;
$$;

create function public.fail_raiaccept_verification(p_order_id uuid,p_lease_id uuid,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.raiaccept_checkouts%rowtype;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  select * into c from public.raiaccept_checkouts where order_id=p_order_id for update;
  if not found or p_lease_id is null or c.verification_lease_id is distinct from p_lease_id then return jsonb_build_object('ok',false,'error','lease_mismatch'); end if;
  if p_code is null or p_code !~ '^[a-z0-9_]{1,100}$' then return jsonb_build_object('ok',false,'error','invalid_error'); end if;
  update public.raiaccept_checkouts set last_error=p_code,verification_lease_id=null,next_check_at=now()+
    case when provider_order_id is null then interval '6 hours' else interval '2 minutes' end,updated_at=now() where order_id=p_order_id;
  update public.raiaccept_verification_queue set processed_version=greatest(processed_version,c.verification_queue_version) where order_id=p_order_id;
  return jsonb_build_object('ok',true);
end;
$$;

create function public.apply_raiaccept_verification(p_order_id uuid,p_lease_id uuid,p_order jsonb,p_transaction jsonb default null)
returns jsonb language plpgsql security definer set search_path=public as $$
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
        where m2.user_id=uid order by m2.expires_at desc limit 1;
      if m.id is not null then effective:=public.membership_effective_status(m.expires_at,m.renewal_window_days,m.plan_id,m.suspended,now()); end if;
      if reason is not null then null;
      elsif exists(select 1 from public.memberships where user_id=uid and payment_provider='paddle' and (paddle_status<>'canceled' or expires_at>now()))
        and o.order_kind<>'topup' then reason:='paddle_managed_subscription';
      elsif exists(select 1 from public.profiles where id=uid and credits::bigint+c.credits>2147483647) then reason:='credit_balance_overflow';
      elsif o.order_kind='topup' then
        if effective not in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') or m.suspended then reason:='topup_plan_changed'; else granted_membership_id:=m.id; end if;
      elsif o.order_kind='plan_purchase' then
        if (m.id is not null and m.expires_at>now()) or effective in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then reason:='plan_already_active'; end if;
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
$$;

-- Preserve the audited Paddle wrapper, adding only the RaiAccept verification guard.
create or replace function public.fulfill_commerce_order(p_order_id uuid,p_provider_transaction_id text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.credit_orders%rowtype;
begin
  select * into o from public.credit_orders where id=p_order_id;
  if o.provider='raiaccept' then return jsonb_build_object('ok',false,'error','raiaccept_verified_payment_required'); end if;
  if o.provider='paddle' then return jsonb_build_object('ok',false,'error','paddle_webhook_required'); end if;
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,742));
  if o.order_kind in ('plan_purchase','plan_renewal','plan_upgrade','business_payment') and exists(
    select 1 from public.memberships where user_id=o.user_id and payment_provider='paddle' and (paddle_status<>'canceled' or expires_at>now())
  ) then return jsonb_build_object('ok',false,'error','paddle_managed_subscription'); end if;
  return public.fulfill_non_paddle_commerce_order(p_order_id,p_provider_transaction_id);
end;
$$;
create or replace function public.cancel_credit_order(p_order_id uuid,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.credit_orders where id=p_order_id and provider='raiaccept') then return jsonb_build_object('ok',false,'error','raiaccept_bank_verification_required'); end if;
  if exists(select 1 from public.credit_orders where id=p_order_id and provider='paddle') then return jsonb_build_object('ok',false,'error','paddle_managed_payment'); end if;
  return public.cancel_non_paddle_credit_order(p_order_id,p_reason);
end;
$$;
revoke all on function public.enqueue_raiaccept_verification(text,text,text,text) from public,anon,authenticated;
revoke all on function public.claim_raiaccept_verifications(text,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.fail_raiaccept_verification(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.apply_raiaccept_verification(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_raiaccept_verification(text,text,text,text) to service_role;
grant execute on function public.claim_raiaccept_verifications(text,text,integer,uuid) to service_role;
grant execute on function public.fail_raiaccept_verification(uuid,uuid,text) to service_role;
grant execute on function public.apply_raiaccept_verification(uuid,uuid,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
