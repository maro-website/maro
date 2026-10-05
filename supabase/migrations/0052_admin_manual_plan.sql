-- Manual plan access and its private audit entry commit together. No payment or credits.
begin;

create or replace function public.admin_grant_plan(
  p_actor uuid,
  p_user uuid,
  p_plan text,
  p_duration_days integer,
  p_note text,
  p_grant_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  actor_role text;
  actor_email text;
  existing public.memberships%rowtype;
  grant_audit public.audit_events%rowtype;
  grant_expiry timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select case
    when access_role in ('super_admin', 'administrator', 'developer', 'editor') then access_role
    when is_admin then 'super_admin'
    else null end, email
  into actor_role, actor_email from public.profiles where id = p_actor;
  if actor_role is null or actor_role not in ('super_admin', 'administrator') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_plan is null or p_plan not in ('standard', 'pro', 'business')
    or not exists(select 1 from public.commerce_plans where id = p_plan and enabled) then
    return jsonb_build_object('ok', false, 'error', 'invalid_plan');
  end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 365 then
    return jsonb_build_object('ok', false, 'error', 'invalid_duration');
  end if;
  if p_note is null or length(trim(p_note)) < 3 or length(trim(p_note)) > 1000 or p_grant_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_note');
  end if;

  -- Serialize manual grants for this account, including retries from another tab.
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;
  select * into existing from public.memberships where id = p_grant_id;
  if found then
    select * into grant_audit from public.audit_events
      where action = 'users.plan_granted_manually' and target_type = 'membership'
        and target_id = p_grant_id::text limit 1;
    if existing.user_id is distinct from p_user or existing.plan_id is distinct from p_plan
      or grant_audit.actor_id is distinct from p_actor
      or grant_audit.metadata->>'note' is distinct from trim(p_note)
      or grant_audit.metadata->>'duration_days' is distinct from p_duration_days::text then
      return jsonb_build_object('ok', false, 'error', 'idempotency_conflict');
    end if;
    return jsonb_build_object('ok', true, 'already', true,
      'membership_id', existing.id, 'expires_at', existing.expires_at);
  end if;

  -- Never replace, shorten, or hide a paid/current membership.
  select * into existing from public.memberships
    where user_id = p_user and expires_at > now()
    order by expires_at desc limit 1;
  if found then
    return jsonb_build_object('ok', false, 'error', 'existing_plan', 'expires_at', existing.expires_at);
  end if;

  grant_expiry := now() + p_duration_days * interval '1 day';
  insert into public.memberships(id, user_id, plan_id, started_at, expires_at, renewal_mode)
    values(p_grant_id, p_user, p_plan, now(), grant_expiry, 'manual');
  update public.profiles set maro_plan = p_plan where id = p_user;
  -- Private comments must not live in memberships, which owners can read through RLS.
  insert into public.audit_events(actor_id, action, target_type, target_id, after_state, metadata)
    values(p_actor, 'users.plan_granted_manually', 'membership', p_grant_id::text,
      jsonb_build_object('user_id', p_user, 'plan_id', p_plan, 'expires_at', grant_expiry),
      jsonb_build_object('source', 'manual', 'note', trim(p_note), 'duration_days', p_duration_days,
        'actor_email', actor_email, 'credits_granted', 0));
  return jsonb_build_object('ok', true, 'already', false,
    'membership_id', p_grant_id, 'expires_at', grant_expiry);
end;
$$;

revoke all on function public.admin_grant_plan(uuid, uuid, text, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_grant_plan(uuid, uuid, text, integer, text, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
