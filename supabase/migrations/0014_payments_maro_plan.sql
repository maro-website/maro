-- MARO — maro_plan, extended credit_orders, purchase fulfillment, remove maroHerët

-- ---------------------------------------------------------------------------
-- profiles.maro_plan: purchased plan tier (null = no plan yet)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists maro_plan text
  check (maro_plan is null or maro_plan in ('standard', 'pro', 'biz'));

-- ---------------------------------------------------------------------------
-- credit_orders extensions
-- ---------------------------------------------------------------------------
alter table public.credit_orders
  add column if not exists item_type text,
  add column if not exists item_id text,
  add column if not exists billing_snapshot jsonb default '{}'::jsonb,
  add column if not exists paid_at timestamptz,
  add column if not exists provider_order_id text,
  add column if not exists cancel_reason text;

-- ---------------------------------------------------------------------------
-- RPC: fulfill_credit_order — idempotent paid + credits + maro_plan
-- ---------------------------------------------------------------------------
create or replace function public.fulfill_credit_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  new_balance integer;
  idem text;
  fort_until_ts timestamptz;
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

  idem := 'purchase-' || o.id::text;

  if exists (
    select 1 from public.credit_transactions
    where user_id = o.user_id and idempotency_key = idem and type = 'manual_adjustment'
  ) then
    update public.credit_orders
    set status = 'paid', paid_at = coalesce(paid_at, now()), provider = coalesce(provider, 'test')
    where id = o.id;
    select credits into new_balance from public.profiles where id = o.user_id;
    return jsonb_build_object('ok', true, 'already', true, 'order_id', o.id, 'balance', new_balance);
  end if;

  update public.profiles
  set credits = credits + o.credits
  where id = o.user_id
  returning credits into new_balance;

  insert into public.credit_transactions (
    user_id, type, amount, balance_after, idempotency_key, metadata
  ) values (
    o.user_id,
    'manual_adjustment',
    o.credits,
    new_balance,
    idem,
    jsonb_build_object('order_id', o.id, 'item_type', o.item_type, 'item_id', o.item_id)
  );

  if o.item_type = 'plan' and o.item_id in ('standard', 'pro') then
    fort_until_ts := null;
    if o.item_id = 'pro' then
      fort_until_ts := now() + interval '14 days';
      update public.profiles
      set maro_plan = o.item_id,
          plan = 'fort',
          fort_until = fort_until_ts
      where id = o.user_id;
    else
      update public.profiles
      set maro_plan = o.item_id
      where id = o.user_id;
    end if;
  end if;

  update public.credit_orders
  set status = 'paid',
      paid_at = now(),
      provider = coalesce(provider, 'test')
  where id = o.id;

  return jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'credits', o.credits,
    'balance', new_balance,
    'item_type', o.item_type,
    'item_id', o.item_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: cancel_credit_order
-- ---------------------------------------------------------------------------
create or replace function public.cancel_credit_order(
  p_order_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
begin
  select * into o from public.credit_orders where id = p_order_id for update;
  if o.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if o.status = 'paid' then
    return jsonb_build_object('ok', false, 'error', 'already_paid');
  end if;

  if o.status = 'cancelled' then
    return jsonb_build_object('ok', true, 'already', true, 'order_id', o.id);
  end if;

  update public.credit_orders
  set status = 'cancelled',
      cancel_reason = coalesce(p_reason, cancel_reason)
  where id = o.id;

  return jsonb_build_object('ok', true, 'order_id', o.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Remove maroHerët from signup trigger
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email = 'erzen@nice.al',
    case when new.email = 'erzen@nice.al' then 100000 else 0 end
  );
  return new;
end;
$$;

drop function if exists public.grant_maro_heret(uuid);

notify pgrst, 'reload schema';
