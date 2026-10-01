-- Paddle extends the canonical commerce tables. No parallel credit or plan system.
alter table public.memberships
  add column if not exists payment_provider text,
  add column if not exists paddle_subscription_id text unique,
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_price_id text,
  add column if not exists paddle_origin_order_id uuid references public.credit_orders(id),
  add column if not exists paddle_status text,
  add column if not exists paddle_event_at timestamptz,
  add column if not exists paddle_scheduled_change jsonb,
  add column if not exists paddle_paid_through timestamptz;

alter table public.credit_orders
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists paddle_price_id text,
  add column if not exists paddle_period_start timestamptz,
  add column if not exists paddle_period_end timestamptz;

create unique index if not exists paddle_paid_cycle_once
  on public.credit_orders(paddle_subscription_id, paddle_period_start)
  where provider = 'paddle' and status = 'paid' and paddle_subscription_id is not null;

create table if not exists public.paddle_webhook_events (
  event_id text primary key,
  event_type text not null,
  occurred_at timestamptz not null,
  processed_at timestamptz not null default now()
);
alter table public.paddle_webhook_events enable row level security;
revoke all on public.paddle_webhook_events from public, anon, authenticated;
grant all on public.paddle_webhook_events to service_role;

-- An order is the server-owned identity bridge. Never map ownership by email or
-- accept prices, credit quantities, or user IDs from browser custom_data.
create or replace function public.create_paddle_order(
  p_user uuid, p_item text, p_price text, p_billing jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.credit_orders%rowtype;
  cp public.commerce_plans%rowtype;
  tp public.commerce_topups%rowtype;
  n integer; amount integer; days integer; label text; email_address text; kind text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 742));
  if p_price !~ '^pri_[a-z0-9]{26}$' or (p_billing->>'legalConsent')::boolean is distinct from true then
    raise exception 'invalid_checkout';
  end if;
  select email into email_address from auth.users where id = p_user;
  if email_address is null then raise exception 'unknown_user'; end if;
  if p_item in ('standard', 'pro') then
    if exists(select 1 from public.memberships where user_id = p_user and
      (expires_at > now() or (payment_provider = 'paddle' and paddle_status <> 'canceled'))) then
      raise exception 'plan_already_active_or_managed';
    end if;
    select * into cp from public.commerce_plans where id = p_item and enabled and not contact_only;
    if cp.id is null or cp.currency <> 'EUR' then raise exception 'invalid_plan'; end if;
    n := cp.included_credits; amount := cp.price_cents; days := cp.duration_days;
    label := cp.display_name; kind := 'plan_purchase';
  else
    if not exists(select 1 from public.memberships where user_id = p_user and expires_at > now()
      and not suspended and (payment_provider is distinct from 'paddle' or paddle_status = 'active')) then
      raise exception 'topup_requires_active_plan';
    end if;
    select * into tp from public.commerce_topups where id = p_item and enabled;
    if tp.id is null or tp.currency <> 'EUR' then raise exception 'invalid_topup'; end if;
    n := tp.credits; amount := tp.price_cents; label := p_item; kind := 'topup';
  end if;
  if n <= 0 or amount <= 0 then raise exception 'invalid_catalog'; end if;
  select * into o from public.credit_orders where user_id = p_user and provider = 'paddle'
    and status = 'pending' and (item_id = p_item or (kind = 'plan_purchase' and order_kind = kind))
    order by created_at desc limit 1 for update;
  if o.id is not null then
    if o.item_id <> p_item then raise exception 'paddle_checkout_already_pending'; end if;
    if o.provider_transaction_id is not null then
      return jsonb_build_object('created', false, 'order', to_jsonb(o));
    end if;
    if o.created_at > now() - interval '10 minutes' then raise exception 'paddle_checkout_in_progress'; end if;
    -- No transaction was bound or returned to the browser. Retire an interrupted
    -- reservation; never retire a bound checkout that can still be paid.
    update public.credit_orders set status = 'failed' where id = o.id;
  end if;
  insert into public.credit_orders(user_id, user_email, credits, amount_cents, currency,
    status, provider, item_type, item_id, order_kind, commercial_snapshot, billing_snapshot, paddle_price_id)
  values(p_user, email_address, n, amount, 'EUR', 'pending', 'paddle',
    case when kind = 'topup' then 'topup' else 'plan' end, p_item, kind,
    jsonb_build_object('captured_at', now(), 'order_kind', kind, 'plan_id', cp.id,
      'plan_name_snapshot', label, 'credits_snapshot', n, 'price_cents', amount,
      'currency', 'EUR', 'duration_days', days, 'config_version', 'paddle_v1'),
    p_billing || jsonb_build_object('email', email_address), p_price)
  returning * into o;
  return jsonb_build_object('created', true, 'order', to_jsonb(o));
end;
$$;

-- Verify signatures before calling this RPC. Event receipt, membership state,
-- order settlement, balance increment, and credit ledger commit atomically.
create or replace function public.apply_paddle_event(p_event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  seed public.credit_orders%rowtype;
  o public.credit_orders%rowtype;
  m public.memberships%rowtype;
  kind text := p_event->>'kind';
  event_time timestamptz := (p_event->>'occurredAt')::timestamptz;
  period_start timestamptz := (p_event->>'startsAt')::timestamptz;
  period_end timestamptz := (p_event->>'endsAt')::timestamptz;
  sub_id text := p_event->>'subscriptionId';
  tx_id text := p_event->>'transactionId';
  customer_id text := p_event->>'customerId';
  state text := p_event->>'status';
  new_balance integer; added integer; order_type text; new_expiry timestamptz;
begin
  if p_event->>'eventId' is null or event_time is null then raise exception 'invalid_event'; end if;
  insert into public.paddle_webhook_events(event_id, event_type, occurred_at)
    values(p_event->>'eventId', p_event->>'eventType', event_time) on conflict do nothing;
  get diagnostics added = row_count;
  if added = 0 then return jsonb_build_object('duplicate', true); end if;
  if kind = 'ignored' then return jsonb_build_object('ignored', true); end if;
  if kind not in ('subscription', 'transaction') then raise exception 'invalid_event_kind'; end if;
  select * into seed from public.credit_orders where id = (p_event->>'seedOrderId')::uuid;
  if seed.id is null or seed.provider <> 'paddle' or seed.user_id::text <> p_event->>'userId'
    or seed.provider_transaction_id is null or seed.paddle_customer_id is distinct from customer_id
    or seed.paddle_price_id is distinct from p_event->>'priceId'
    or (seed.paddle_subscription_id is not null and seed.paddle_subscription_id is distinct from sub_id) then
    raise exception 'paddle_mapping_mismatch';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(seed.user_id::text, 742));
  -- A customer must never become a portal bridge across maro accounts.
  if exists(select 1 from public.credit_orders where paddle_customer_id = customer_id
    and user_id <> seed.user_id) then raise exception 'paddle_customer_ownership_mismatch'; end if;
  select * into m from public.memberships where paddle_subscription_id = sub_id for update;
  if m.id is not null and (m.user_id <> seed.user_id or m.paddle_customer_id <> customer_id
    or m.paddle_origin_order_id <> seed.id) then raise exception 'paddle_subscription_ownership_mismatch'; end if;

  if sub_id is not null and m.id is null then
    -- Only the bound initial transaction or subscription.created's transaction_id
    -- can establish a subscription link. Updated events arriving first are retried.
    if tx_id is distinct from seed.provider_transaction_id or seed.order_kind <> 'plan_purchase' then
      raise exception 'paddle_subscription_not_bound';
    end if;
    if exists(select 1 from public.memberships where user_id = seed.user_id
      and (expires_at > now() or (payment_provider = 'paddle' and paddle_status <> 'canceled'))) then
      raise exception 'another_membership_active';
    end if;
    insert into public.memberships(user_id, plan_id, started_at, expires_at, renewal_mode,
      payment_provider, paddle_subscription_id, paddle_customer_id, paddle_price_id,
      paddle_origin_order_id, paddle_status)
    values(seed.user_id, seed.item_id, coalesce(period_start, event_time),
      coalesce(period_start, event_time), 'automatic', 'paddle', sub_id, customer_id,
      seed.paddle_price_id, seed.id, 'pending') returning * into m;
    update public.credit_orders set paddle_subscription_id = sub_id where id = seed.id;
  end if;

  if kind = 'subscription' then
    if m.id is null or state not in ('active', 'trialing', 'past_due', 'paused', 'canceled') then
      raise exception 'invalid_subscription';
    end if;
    if m.paddle_event_at is null or event_time > m.paddle_event_at then
      -- A lifecycle event cannot extend paid time. Only completed payment can.
      new_expiry := coalesce(m.paddle_paid_through, m.expires_at);
      if state in ('canceled', 'paused') then new_expiry := least(new_expiry, event_time); end if;
      update public.memberships set paddle_status = state, paddle_event_at = event_time,
        paddle_scheduled_change = nullif(p_event->'scheduledChange', 'null'::jsonb),
        expires_at = new_expiry, updated_at = now()
        where id = m.id;
    end if;
    return jsonb_build_object('synchronized', true);
  end if;

  if state <> 'completed' or tx_id is null or (p_event->>'amount')::integer <> seed.amount_cents
    or p_event->>'currency' <> seed.currency then raise exception 'paddle_amount_mismatch'; end if;
  select * into o from public.credit_orders where provider_transaction_id = tx_id for update;
  if o.id is not null and (o.provider <> 'paddle' or o.user_id <> seed.user_id) then
    raise exception 'paddle_transaction_ownership_mismatch';
  end if;
  if o.status = 'paid' then return jsonb_build_object('duplicate_transaction', true); end if;
  if sub_id is null then
    if seed.order_kind <> 'topup' or tx_id <> seed.provider_transaction_id then raise exception 'invalid_topup_transaction'; end if;
    o := seed;
    order_type := 'topup';
    -- Eligibility was checked when checkout was created. A delayed paid webhook
    -- still delivers purchased credits even if the membership has since expired.
  else
    if m.id is null or period_start is null or period_end is null or period_end <= period_start
      or period_end - period_start <> ((seed.commercial_snapshot->>'duration_days')::integer * interval '1 day') then
      raise exception 'invalid_billing_period';
    end if;
    if exists(select 1 from public.credit_orders where provider = 'paddle' and status = 'paid'
      and paddle_subscription_id = sub_id and paddle_period_start = period_start) then
      return jsonb_build_object('duplicate_period', true);
    end if;
    -- Reject overlapping payments without dropping legitimate late older periods.
    if exists(select 1 from public.credit_orders where provider = 'paddle' and status = 'paid'
      and paddle_subscription_id = sub_id and paddle_period_start < period_end
      and paddle_period_end > period_start) then raise exception 'overlapping_billing_period'; end if;
    if tx_id = seed.provider_transaction_id then
      o := seed; order_type := 'plan_purchase';
    else
      if p_event->>'origin' <> 'subscription_recurring' then raise exception 'unexpected_transaction_origin'; end if;
      order_type := 'plan_renewal';
      insert into public.credit_orders(user_id, user_email, credits, amount_cents, currency, status,
        provider, item_type, item_id, order_kind, commercial_snapshot, billing_snapshot,
        provider_transaction_id, paddle_customer_id, paddle_subscription_id, paddle_price_id)
      values(seed.user_id, seed.user_email, seed.credits, seed.amount_cents, seed.currency, 'pending',
        'paddle', 'plan', seed.item_id, order_type,
        seed.commercial_snapshot || jsonb_build_object('order_kind', order_type, 'captured_at', event_time),
        seed.billing_snapshot, tx_id, customer_id, sub_id, seed.paddle_price_id) returning * into o;
    end if;
    -- Lifecycle ordering is independent from paid-period ordering.
    new_expiry := greatest(coalesce(m.paddle_paid_through, period_end), period_end);
    if m.paddle_status in ('canceled', 'paused') then
      new_expiry := least(new_expiry, m.paddle_event_at);
    end if;
    update public.memberships set paddle_paid_through = greatest(paddle_paid_through, period_end),
      expires_at = new_expiry, started_at = least(started_at, period_start),
      paddle_status = case when paddle_status = 'pending' then 'active' else paddle_status end,
      updated_at = now() where id = m.id;
  end if;
  if o.status <> 'pending' then raise exception 'invalid_order_status'; end if;
  update public.profiles set credits = credits + seed.credits,
    maro_plan = case when sub_id is not null and new_expiry > now() then seed.item_id else maro_plan end
    where id = seed.user_id returning credits into new_balance;
  if new_balance is null then raise exception 'profile_missing'; end if;
  insert into public.credit_transactions(user_id, type, amount, balance_after, idempotency_key,
    order_id, membership_id, metadata)
  values(seed.user_id, order_type, seed.credits, new_balance, 'paddle:' || tx_id, o.id, m.id,
    jsonb_build_object('provider', 'paddle', 'transaction_id', tx_id, 'event_id', p_event->>'eventId'));
  update public.credit_orders set status = 'paid', paid_at = event_time, membership_id = m.id,
    paddle_subscription_id = sub_id, paddle_period_start = period_start, paddle_period_end = period_end
    where id = o.id;
  return jsonb_build_object('fulfilled', true, 'order_id', o.id);
end;
$$;

-- Preserve the existing Raiffeisen/test implementation verbatim behind a guard.
alter function public.fulfill_commerce_order(uuid, text) rename to fulfill_non_paddle_commerce_order;
create function public.fulfill_commerce_order(p_order_id uuid, p_provider_transaction_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.credit_orders%rowtype;
begin
  select * into o from public.credit_orders where id = p_order_id;
  if o.provider = 'paddle' then return jsonb_build_object('ok', false, 'error', 'paddle_webhook_required'); end if;
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text, 742));
  if o.order_kind in ('plan_purchase', 'plan_renewal', 'plan_upgrade', 'business_payment') and exists(
    select 1 from public.memberships where user_id = o.user_id and payment_provider = 'paddle'
      and (paddle_status <> 'canceled' or expires_at > now())
  ) then return jsonb_build_object('ok', false, 'error', 'paddle_managed_subscription'); end if;
  return public.fulfill_non_paddle_commerce_order(p_order_id, p_provider_transaction_id);
end;
$$;

revoke all on function public.create_paddle_order(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.apply_paddle_event(jsonb) from public, anon, authenticated;
revoke all on function public.fulfill_commerce_order(uuid, text) from public, anon, authenticated;
-- Only the guarded wrapper may invoke the original routine.
revoke all on function public.fulfill_non_paddle_commerce_order(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.create_paddle_order(uuid, text, text, jsonb) to service_role;
grant execute on function public.apply_paddle_event(jsonb) to service_role;
grant execute on function public.fulfill_commerce_order(uuid, text) to service_role;

-- Do not let local order cancellation race a successful provider payment.
alter function public.cancel_credit_order(uuid, text) rename to cancel_non_paddle_credit_order;
create function public.cancel_credit_order(p_order_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if exists(select 1 from public.credit_orders where id = p_order_id and provider = 'paddle') then
    return jsonb_build_object('ok', false, 'error', 'paddle_managed_payment');
  end if;
  return public.cancel_non_paddle_credit_order(p_order_id, p_reason);
end;
$$;
revoke all on function public.cancel_credit_order(uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_non_paddle_credit_order(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.cancel_credit_order(uuid, text) to service_role;
notify pgrst, 'reload schema';
