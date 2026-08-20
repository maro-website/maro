-- MARO — Commerce ledger types, order extensions, fulfill_commerce_order RPC

-- ---------------------------------------------------------------------------
-- credit_orders extensions
-- ---------------------------------------------------------------------------
alter table public.credit_orders
  add column if not exists order_kind text
    check (order_kind is null or order_kind in (
      'plan_purchase', 'plan_renewal', 'plan_upgrade', 'topup', 'business_payment'
    )),
  add column if not exists membership_id uuid references public.memberships (id) on delete set null,
  add column if not exists commercial_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists provider_transaction_id text;

create unique index if not exists credit_orders_provider_tx_unique_idx
  on public.credit_orders (provider_transaction_id)
  where provider_transaction_id is not null;

-- ---------------------------------------------------------------------------
-- credit_transactions extensions
-- ---------------------------------------------------------------------------
alter table public.credit_transactions
  add column if not exists order_id uuid references public.credit_orders (id) on delete set null,
  add column if not exists membership_id uuid references public.memberships (id) on delete set null,
  add column if not exists reason text;

alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check check (type in (
    'reserve', 'charge', 'release', 'refund',
    'manual_adjustment',
    'plan_purchase', 'plan_renewal', 'plan_upgrade', 'topup',
    'admin_grant', 'admin_adjustment'
  ));

-- ---------------------------------------------------------------------------
-- Helper: derive membership status at a point in time (for fulfillment validation)
-- ---------------------------------------------------------------------------
create or replace function public.membership_effective_status(
  p_expires_at timestamptz,
  p_renewal_window_days integer,
  p_plan_id text,
  p_suspended boolean,
  p_at timestamptz default now()
)
returns text
language plpgsql
immutable
as $$
begin
  if p_plan_id = 'business' then
    if p_suspended then return 'BUSINESS_SUSPENDED'; end if;
    if p_expires_at <= p_at then return 'BUSINESS_EXPIRED'; end if;
    return 'BUSINESS_ACTIVE';
  end if;
  if p_expires_at <= p_at then return 'EXPIRED'; end if;
  if p_at >= (p_expires_at - (p_renewal_window_days || ' days')::interval) then
    return 'RENEWAL_WINDOW';
  end if;
  return 'ACTIVE';
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: fulfill_commerce_order — idempotent transactional fulfillment
-- ---------------------------------------------------------------------------
create or replace function public.fulfill_commerce_order(
  p_order_id uuid,
  p_provider_transaction_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  m record;
  cp record;
  tp record;
  new_balance integer;
  idem text;
  eff_status text;
  renewal_days integer;
  new_expires timestamptz;
  upgrade_from text;
  pro_plan record;
  std_plan record;
  new_membership_id uuid;
begin
  select * into o from public.credit_orders where id = p_order_id for update;
  if o.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if o.status = 'paid' then
    return jsonb_build_object('ok', true, 'already', true, 'order_id', o.id);
  end if;

  if o.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', o.status);
  end if;

  if o.user_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_user');
  end if;

  if p_provider_transaction_id is not null then
    if exists (
      select 1 from public.credit_orders
      where provider_transaction_id = p_provider_transaction_id
        and status = 'paid'
        and id <> o.id
    ) then
      return jsonb_build_object('ok', false, 'error', 'provider_tx_duplicate');
    end if;
  end if;

  idem := coalesce(
    p_provider_transaction_id,
    'purchase-' || o.id::text
  );

  if exists (
    select 1 from public.credit_transactions
    where user_id = o.user_id and idempotency_key = idem
      and type in ('plan_purchase', 'plan_renewal', 'plan_upgrade', 'topup', 'manual_adjustment')
  ) then
    update public.credit_orders
    set status = 'paid',
        paid_at = coalesce(paid_at, now()),
        provider = coalesce(provider, 'test'),
        provider_transaction_id = coalesce(provider_transaction_id, p_provider_transaction_id)
    where id = o.id;
    select credits into new_balance from public.profiles where id = o.user_id;
    return jsonb_build_object('ok', true, 'already', true, 'order_id', o.id, 'balance', new_balance);
  end if;

  -- Load current membership (latest by expires_at)
  select m2.*, cp2.renewal_window_days as plan_renewal_window_days
  into m
  from public.memberships m2
  join public.commerce_plans cp2 on cp2.id = m2.plan_id
  where m2.user_id = o.user_id
  order by m2.expires_at desc
  limit 1;

  if m.id is not null then
    eff_status := public.membership_effective_status(
      m.expires_at, m.plan_renewal_window_days, m.plan_id, m.suspended, now()
    );
  else
    eff_status := 'NO_PLAN';
  end if;

  -- -------------------------------------------------------------------------
  -- TOPUP
  -- -------------------------------------------------------------------------
  if o.order_kind = 'topup' then
    if eff_status not in ('ACTIVE', 'RENEWAL_WINDOW', 'BUSINESS_ACTIVE') then
      return jsonb_build_object('ok', false, 'error', 'topup_requires_active_plan');
    end if;

    select * into tp from public.commerce_topups where id = o.item_id and enabled = true;
    if tp.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_topup');
    end if;

    update public.profiles
    set credits = credits + o.credits
    where id = o.user_id
    returning credits into new_balance;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'topup', o.credits, new_balance, idem, o.id, m.id,
      jsonb_build_object('item_id', o.item_id, 'order_kind', o.order_kind)
    );

  -- -------------------------------------------------------------------------
  -- PLAN UPGRADE (standard -> pro)
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'plan_upgrade' then
    if eff_status not in ('ACTIVE', 'RENEWAL_WINDOW') or m.plan_id <> 'standard' then
      return jsonb_build_object('ok', false, 'error', 'upgrade_not_eligible');
    end if;

    select * into std_plan from public.commerce_plans where id = 'standard';
    select * into pro_plan from public.commerce_plans where id = 'pro';

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = 'pro'
    where id = o.user_id
    returning credits into new_balance;

    update public.memberships
    set plan_id = 'pro',
        updated_at = now()
    where id = m.id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_upgrade', o.credits, new_balance, idem, o.id, m.id,
      jsonb_build_object(
        'from_plan', 'standard', 'to_plan', 'pro',
        'order_kind', o.order_kind
      )
    );

  -- -------------------------------------------------------------------------
  -- PLAN RENEWAL
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'plan_renewal' then
    if eff_status <> 'RENEWAL_WINDOW' then
      return jsonb_build_object('ok', false, 'error', 'renewal_not_available');
    end if;

    if m.cycle_renewal_fulfilled_at is not null
       and m.cycle_renewal_fulfilled_at >= (m.expires_at - (m.plan_renewal_window_days || ' days')::interval) then
      return jsonb_build_object('ok', false, 'error', 'renewal_already_fulfilled');
    end if;

    select * into cp from public.commerce_plans where id = m.plan_id and enabled = true and contact_only = false;
    if cp.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_plan');
    end if;

    new_expires := m.expires_at + (cp.duration_days || ' days')::interval;

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = m.plan_id
    where id = o.user_id
    returning credits into new_balance;

    update public.memberships
    set expires_at = new_expires,
        cycle_renewal_fulfilled_at = now(),
        updated_at = now()
    where id = m.id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_renewal', o.credits, new_balance, idem, o.id, m.id,
      jsonb_build_object('plan_id', m.plan_id, 'new_expires_at', new_expires)
    );

  -- -------------------------------------------------------------------------
  -- PLAN PURCHASE (new or after expiry)
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'plan_purchase' then
    if eff_status in ('ACTIVE', 'RENEWAL_WINDOW', 'BUSINESS_ACTIVE') then
      return jsonb_build_object('ok', false, 'error', 'plan_already_active');
    end if;

    select * into cp from public.commerce_plans where id = o.item_id and enabled = true and contact_only = false;
    if cp.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_plan');
    end if;

    new_expires := now() + (cp.duration_days || ' days')::interval;

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = cp.id
    where id = o.user_id
    returning credits into new_balance;

    insert into public.memberships (
      user_id, plan_id, started_at, expires_at, renewal_mode, renewed_from_id
    ) values (
      o.user_id, cp.id, now(), new_expires, cp.renewal_mode,
      case when m.id is not null then m.id else null end
    )
    returning id into new_membership_id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_purchase', o.credits, new_balance, idem, o.id, new_membership_id,
      jsonb_build_object('plan_id', cp.id, 'expires_at', new_expires)
    );

  -- -------------------------------------------------------------------------
  -- BUSINESS PAYMENT (admin-configured)
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'business_payment' then
    select * into cp from public.commerce_plans where id = 'business';

    new_expires := now() + (coalesce((o.commercial_snapshot->>'duration_days')::integer, cp.duration_days) || ' days')::interval;

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = 'business'
    where id = o.user_id
    returning credits into new_balance;

    insert into public.memberships (
      user_id, plan_id, started_at, expires_at, renewal_mode, business_overrides
    ) values (
      o.user_id, 'business', now(), new_expires, 'manual',
      coalesce(o.commercial_snapshot->'business_overrides', '{}'::jsonb)
    )
    returning id into new_membership_id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_purchase', o.credits, new_balance, idem, o.id, new_membership_id,
      jsonb_build_object('plan_id', 'business', 'order_kind', 'business_payment')
    );

  else
    -- Legacy fallback: treat as old fulfill_credit_order behavior without fort grant
    update public.profiles
    set credits = credits + o.credits
    where id = o.user_id
    returning credits into new_balance;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, metadata
    ) values (
      o.user_id, 'manual_adjustment', o.credits, new_balance, idem, o.id,
      jsonb_build_object('order_id', o.id, 'item_type', o.item_type, 'item_id', o.item_id, 'legacy', true)
    );

    if o.item_type = 'plan' and o.item_id in ('standard', 'pro', 'business') then
      select * into cp from public.commerce_plans where id = o.item_id;
      new_expires := now() + (cp.duration_days || ' days')::interval;
      update public.profiles set maro_plan = o.item_id where id = o.user_id;
      insert into public.memberships (user_id, plan_id, started_at, expires_at)
      values (o.user_id, o.item_id, now(), new_expires);
    end if;
  end if;

  update public.credit_orders
  set status = 'paid',
      paid_at = now(),
      provider = coalesce(provider, 'test'),
      provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
      membership_id = coalesce(new_membership_id, membership_id)
  where id = o.id;

  select credits into new_balance from public.profiles where id = o.user_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'credits', o.credits,
    'balance', new_balance,
    'order_kind', o.order_kind,
    'membership_id', new_membership_id
  );
end;
$$;

-- Keep legacy wrapper pointing to new RPC
create or replace function public.fulfill_credit_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.fulfill_commerce_order(p_order_id, null);
end;
$$;

notify pgrst, 'reload schema';
