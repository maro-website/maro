-- P0 credit hardening: idempotent finalize + safe release when already charged
-- Requires 0011_abuse_protection.sql

-- At most one charge row per generation job (concurrent finalize safety net)
create unique index if not exists credit_transactions_one_charge_per_job_idx
  on public.credit_transactions (job_id)
  where type = 'charge' and job_id is not null;

-- ---------------------------------------------------------------------------
-- RPC: finalize_credit_charge (idempotent — reserve -> charge, release hold)
-- ---------------------------------------------------------------------------
create or replace function public.finalize_credit_charge(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  bal integer;
begin
  if p_job_id is null then
    return false;
  end if;

  -- Serialize concurrent finalize attempts for the same job
  perform 1 from public.generation_jobs where id = p_job_id for update;

  -- Idempotent: already finalized
  if exists (
    select 1 from public.credit_transactions
    where job_id = p_job_id and type = 'charge'
  ) then
    return true;
  end if;

  -- Cannot finalize a reservation that was already released/refunded
  if exists (
    select 1 from public.credit_transactions
    where job_id = p_job_id and type in ('release', 'refund')
  ) then
    return false;
  end if;

  select user_id, amount into r
  from public.credit_transactions
  where job_id = p_job_id and type = 'reserve'
  order by created_at desc
  limit 1;

  if r.user_id is null then
    return false;
  end if;

  update public.profiles
  set credits_reserved = greatest(0, credits_reserved - r.amount)
  where id = r.user_id;

  select credits into bal from public.profiles where id = r.user_id;

  insert into public.credit_transactions (user_id, job_id, type, amount, balance_after)
  values (r.user_id, p_job_id, 'charge', r.amount, bal);

  update public.generation_jobs
  set credits_charged = r.amount, status = 'completed', finished_at = now()
  where id = p_job_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: release_credit_reserve — skip when job was already charged
-- ---------------------------------------------------------------------------
create or replace function public.release_credit_reserve(
  p_job_id uuid,
  p_idempotency_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  bal integer;
  already_released boolean;
begin
  if p_idempotency_key is not null then
    select exists(
      select 1 from public.credit_transactions
      where job_id = p_job_id and type = 'release'
        and idempotency_key = p_idempotency_key
    ) into already_released;
    if already_released then
      return true;
    end if;
  end if;

  -- Reservation already converted to a charge — nothing to release
  if exists (
    select 1 from public.credit_transactions
    where job_id = p_job_id and type = 'charge'
  ) then
    return false;
  end if;

  select user_id, amount into r
  from public.credit_transactions
  where job_id = p_job_id and type = 'reserve'
  order by created_at desc
  limit 1;

  if r.user_id is null then
    return false;
  end if;

  if exists (
    select 1 from public.credit_transactions
    where job_id = p_job_id and type in ('release', 'refund')
  ) then
    return true;
  end if;

  update public.profiles
  set credits = credits + r.amount,
      credits_reserved = greatest(0, credits_reserved - r.amount)
  where id = r.user_id
  returning credits into bal;

  insert into public.credit_transactions (user_id, job_id, type, amount, balance_after, idempotency_key)
  values (r.user_id, p_job_id, 'release', r.amount, bal, p_idempotency_key);

  update public.generation_jobs
  set status = 'failed', finished_at = now()
  where id = p_job_id and status not in ('completed', 'cancelled');

  return true;
end;
$$;

notify pgrst, 'reload schema';
