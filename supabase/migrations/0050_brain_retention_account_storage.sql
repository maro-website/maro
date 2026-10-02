-- Paid maroBrain, 60-day recovery, and account-wide storage. Commerce is read only.
begin;

create or replace function public.maro_active_plan(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select plan_id from public.memberships
  where user_id = p_user and started_at <= now() and expires_at > now()
    and not suspended and plan_id in ('standard', 'pro', 'business')
  order by expires_at desc limit 1;
$$;
revoke all on function public.maro_active_plan(uuid) from public, anon, authenticated;
grant execute on function public.maro_active_plan(uuid) to service_role;

create or replace function public.maro_brain_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select public.maro_active_plan(auth.uid()) is not null;
$$;
revoke all on function public.maro_brain_allowed() from public, anon;
grant execute on function public.maro_brain_allowed() to authenticated, service_role;

alter table public.workspaces
  add column brain_retention_anchor_at timestamptz default now(),
  add column brain_reset_at timestamptz;
-- Existing never-paid profiles receive 60 days from rollout; paid profiles use expiry.
update public.workspaces w set brain_retention_anchor_at = coalesce(
  (select max(expires_at) from public.memberships where user_id = w.owner_id), now());

create table public.brain_retention_files (
  path text primary key,
  queued_at timestamptz not null default now()
);
alter table public.brain_retention_files enable row level security;
revoke all on public.brain_retention_files from anon, authenticated;
grant all on public.brain_retention_files to service_role;

create or replace function public.maro_refresh_brain_retention(p_user uuid)
returns integer language plpgsql volatile security definer set search_path = public, storage as $$
declare w record; m record; renewal record; cleared integer := 0; previous_flag text;
begin
  previous_flag := current_setting('maro.brain_retention', true);
  perform set_config('maro.brain_retention', 'on', true);
  for w in select * from public.workspaces where owner_id = p_user order by id for update loop
    select started_at, expires_at into m from public.memberships
      where user_id = p_user and started_at <= now() and expires_at > now() and not suspended
        and plan_id in ('standard','pro','business') order by expires_at desc limit 1;
    -- Walk renewals in order so several missed reconciliation runs cannot reset
    -- a continuously paid account. A real 60-day gap stops the recovery chain.
    for renewal in select started_at, expires_at from public.memberships
      where user_id = p_user and started_at <= now() and not suspended
        and plan_id in ('standard','pro','business') and expires_at > w.brain_retention_anchor_at
      order by started_at, expires_at loop
      exit when renewal.started_at >= w.brain_retention_anchor_at + interval '60 days';
      w.brain_retention_anchor_at := greatest(w.brain_retention_anchor_at, renewal.expires_at);
    end loop;
    update public.workspaces set brain_retention_anchor_at = w.brain_retention_anchor_at
      where id = w.id and brain_retention_anchor_at is distinct from w.brain_retention_anchor_at;
    -- Renewing before the deadline preserves everything. Renewing after it cannot
    -- resurrect a profile even if the scheduled cleanup was temporarily unavailable.
    if w.brain_retention_anchor_at is not null
       and w.brain_retention_anchor_at + interval '60 days' <= now()
       then
      insert into public.brain_retention_files(path)
        select name from storage.objects where bucket_id = 'generations'
          and starts_with(name, p_user::text || '/workspace-assets/' || w.id || '/')
        on conflict do nothing;
      delete from public.workspace_sources where workspace_id = w.id and owner_id = p_user;
      update public.workspaces set brain_profile = '{}'::jsonb,
        brand_name = case when brand_name = brain_profile #>> '{brand,name}' then null else brand_name end,
        brand_logo_url = case when brand_logo_url = coalesce(brain_profile #>> '{brand,logoStorageRef}', brain_profile #>> '{brand,logoUrl}') then null else brand_logo_url end,
        brain_reset_at = clock_timestamp(), brain_retention_anchor_at = case when m.expires_at > now() then m.expires_at else null end
        where id = w.id;
      cleared := cleared + 1;
    elsif m.expires_at > now() then
      update public.workspaces set brain_retention_anchor_at = m.expires_at
        where id = w.id and brain_retention_anchor_at is distinct from m.expires_at;
    end if;
  end loop;
  perform set_config('maro.brain_retention', coalesce(previous_flag, ''), true);
  return cleared;
end;
$$;
revoke all on function public.maro_refresh_brain_retention(uuid) from public, anon, authenticated;
grant execute on function public.maro_refresh_brain_retention(uuid) to service_role;

create or replace function public.maro_guard_brain_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('maro.brain_retention', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.brain_reset_at := null;
    select max(expires_at) into new.brain_retention_anchor_at from public.memberships where user_id = new.owner_id;
    new.brain_retention_anchor_at := coalesce(new.brain_retention_anchor_at, now());
    if new.brain_profile <> '{}'::jsonb and public.maro_active_plan(new.owner_id) is null then
      raise exception 'brain_plan_required' using errcode = '42501';
    end if;
    return new;
  end if;
  -- Workspace rename, icons, and other workspace settings remain independent.
  new.brain_retention_anchor_at := old.brain_retention_anchor_at;
  new.brain_reset_at := old.brain_reset_at;
  if new.brain_profile is distinct from old.brain_profile then
    if public.maro_active_plan(new.owner_id) is null then
      raise exception 'brain_plan_required' using errcode = '42501';
    end if;
    -- A stale editor must refresh after a retention reset before writing again.
    if old.brain_retention_anchor_at + interval '60 days' <= now() then
      raise exception 'brain_refresh_required' using errcode = '40001';
    end if;
    select expires_at into new.brain_retention_anchor_at from public.memberships
      where user_id = new.owner_id and started_at <= now() and expires_at > now() and not suspended
      order by expires_at desc limit 1;
  end if;
  return new;
end;
$$;
revoke all on function public.maro_guard_brain_update() from public, anon, authenticated;
create trigger maro_brain_paid_update before insert or update on public.workspaces
for each row execute function public.maro_guard_brain_update();

drop policy if exists workspace_sources_owner_all on public.workspace_sources;
create policy workspace_sources_owner_all on public.workspace_sources for all
using (auth.uid() = owner_id and public.maro_brain_allowed())
with check (auth.uid() = owner_id and public.maro_brain_allowed()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

create or replace function public.maro_storage_owner(p_bucket text, p_name text, p_metadata jsonb)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare candidate text;
begin
  if p_bucket = 'generations' then
    candidate := case when p_name like 'public/project-assets/%' then split_part(p_name,'/',3) else split_part(p_name,'/',1) end;
  elsif p_bucket = 'maro-public' and p_name like 'public/avatars/%' then
    candidate := split_part(p_name,'/',3);
  elsif p_bucket = 'maro-public' and p_name like 'public/explore/%' then
    candidate := p_metadata->>'maro_owner_id';
    if candidate is null then
      select user_id::text into candidate from public.public_creations
      where slug = split_part(p_name,'/',3) limit 1;
    end if;
  end if;
  if candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return candidate::uuid; end if;
  return null;
end;
$$;
revoke all on function public.maro_storage_owner(text,text,jsonb) from public, anon, authenticated;

create or replace function public.maro_storage_used_internal(p_user uuid)
returns bigint language plpgsql volatile security definer set search_path = public, storage as $$
declare used_bytes bigint;
begin
  select coalesce(sum(case when (o.metadata->>'size') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end),0)
    into used_bytes from storage.objects o
    where o.bucket_id in ('generations','maro-public')
      and public.maro_storage_owner(o.bucket_id,o.name,o.user_metadata) = p_user;
  return used_bytes;
end;
$$;
revoke all on function public.maro_storage_used_internal(uuid) from public, anon, authenticated;

create or replace function public.maro_storage_limit_internal(p_user uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select case public.maro_active_plan(p_user) when 'pro' then 5000000000::bigint
    when 'business' then null::bigint else 1000000000::bigint end;
$$;
revoke all on function public.maro_storage_limit_internal(uuid) from public, anon, authenticated;

create or replace function public.maro_enforce_account_storage_quota()
returns trigger language plpgsql volatile security definer set search_path = public, storage as $$
declare owner_user uuid; quota_bytes bigint; old_bytes bigint := 0; new_bytes bigint := 0;
begin
  owner_user := public.maro_storage_owner(new.bucket_id,new.name,new.user_metadata);
  if owner_user is null then return new; end if;
  if new.bucket_id = 'generations' and new.name like owner_user::text || '/workspace-assets/%'
     and public.maro_active_plan(owner_user) is null then
    raise exception 'brain_plan_required' using errcode = '42501';
  end if;
  if (new.metadata->>'size') ~ '^[0-9]+$' then new_bytes := (new.metadata->>'size')::bigint; end if;
  if tg_op = 'UPDATE' and public.maro_storage_owner(old.bucket_id,old.name,old.user_metadata) = owner_user
     and (old.metadata->>'size') ~ '^[0-9]+$' then old_bytes := (old.metadata->>'size')::bigint; end if;
  if new_bytes <= old_bytes then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_user::text,8647));
  quota_bytes := public.maro_storage_limit_internal(owner_user);
  -- AFTER includes the actual object and works for INSERT ... ON CONFLICT updates.
  -- VOLATILE obtains a fresh READ COMMITTED snapshot after the account lock.
  if quota_bytes is not null and public.maro_storage_used_internal(owner_user) > quota_bytes then
    raise exception 'storage_quota_exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.maro_enforce_account_storage_quota() from public, anon, authenticated;
create trigger maro_account_storage_quota after insert or update on storage.objects
for each row execute function public.maro_enforce_account_storage_quota();

create or replace function public.maro_account_policy(p_user uuid default auth.uid(), p_workspace text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare w record;
begin
  if p_user is null or (coalesce(auth.role(),'') <> 'service_role' and auth.uid() is distinct from p_user) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_workspace is not null and not exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user) then
    raise exception 'workspace_not_found' using errcode = '42501';
  end if;
  perform public.maro_refresh_brain_retention(p_user);
  select brain_reset_at, brain_retention_anchor_at into w from public.workspaces where id=p_workspace and owner_id=p_user;
  return jsonb_build_object('brainAccess',public.maro_active_plan(p_user) is not null,
    'brainResetAt',w.brain_reset_at,'brainDeleteAt',w.brain_retention_anchor_at + interval '60 days',
    'usedBytes',public.maro_storage_used_internal(p_user),'limitBytes',public.maro_storage_limit_internal(p_user));
end;
$$;
revoke all on function public.maro_account_policy(uuid,text) from public, anon;
grant execute on function public.maro_account_policy(uuid,text) to authenticated, service_role;

create or replace function public.maro_reset_expired_brains(p_limit integer default 200)
returns integer language plpgsql volatile security definer set search_path = public as $$
declare item record; cleared integer := 0;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'unauthorized'; end if;
  for item in select owner_id,min(brain_retention_anchor_at) oldest from public.workspaces
    where brain_retention_anchor_at + interval '60 days' <= now()
    group by owner_id order by oldest limit least(greatest(p_limit,1),500) loop
    cleared := cleared + public.maro_refresh_brain_retention(item.owner_id);
  end loop;
  return cleared;
end;
$$;
revoke all on function public.maro_reset_expired_brains(integer) from public, anon, authenticated;
grant execute on function public.maro_reset_expired_brains(integer) to service_role;

notify pgrst, 'reload schema';
commit;
