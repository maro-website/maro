-- V1: close direct-client administration paths. Existing server APIs own writes.
-- Apply before releasing the matching application. No customer data is deleted.
begin;

create or replace function public.has_admin_access()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((auth.jwt()->>'aal') = 'aal2' and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and p.access_role in ('super_admin','administrator','developer','editor')
  ), false);
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((auth.jwt()->>'aal') = 'aal2' and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and (p.access_role in ('super_admin','administrator')
        or (p.access_role is null and p.is_admin = true))
  ), false);
$$;

-- An ALL policy also grants SELECT: preserve the read capability while removing
-- its mutation capability. Mixed user/admin tables keep their user policies.
do $$ declare p record;
begin
  for p in select * from pg_policies where schemaname = 'public'
    and cmd in ('ALL','INSERT','UPDATE','DELETE')
    and (coalesce(qual,'') || coalesce(with_check,'')) ~ '(has_admin_access|is_admin)\('
  loop
    execute format('drop policy %I on %I.%I', p.policyname,p.schemaname,p.tablename);
    if p.cmd = 'ALL' and p.qual is not null then
      execute format('create policy %I on %I.%I for select using (%s)',
        p.policyname,p.schemaname,p.tablename,p.qual);
    end if;
  end loop;
end $$;

-- No full-row client settings access, including privileged clients. The public
-- projection and MFA-gated admin controls use the existing service-side APIs.
drop policy if exists settings_select on public.app_settings;
drop policy if exists settings_admin_select on public.app_settings;
revoke all on public.app_settings from anon, authenticated;

-- Only a user's own display name may be updated directly. Credits, roles,
-- creator flags, usernames and workspace preferences remain server-managed.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update(full_name) on public.profiles to authenticated;
drop policy if exists profiles_self_name_update on public.profiles;
create policy profiles_self_name_update on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.guard_client_profile_fields()
returns trigger language plpgsql set search_path = public
as $$
begin
  -- SECURITY INVOKER is intentional: permitted service/security-definer RPC
  -- updates run as their owner, while a direct PostgREST write runs as the client.
  if current_user in ('anon','authenticated') and
    (to_jsonb(new)-'full_name'-'updated_at') is distinct from
    (to_jsonb(old)-'full_name'-'updated_at') then
    raise exception 'profile_fields_server_only' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists profiles_01_guard_client_fields on public.profiles;
create trigger profiles_01_guard_client_fields before update on public.profiles
  for each row execute function public.guard_client_profile_fields();
revoke all on function public.guard_client_profile_fields() from public,anon,authenticated;

-- Keep the existing workspace calculation intact behind an ownership gate.
alter function public.resolve_workspace_limit(uuid) rename to resolve_workspace_limit_internal;
revoke all on function public.resolve_workspace_limit_internal(uuid) from public,anon,authenticated;
grant execute on function public.resolve_workspace_limit_internal(uuid) to service_role;
create function public.resolve_workspace_limit(p_user_id uuid)
returns integer language plpgsql stable security definer set search_path = public
as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'workspace_limit_not_authorized' using errcode = '42501';
  end if;
  return public.resolve_workspace_limit_internal(p_user_id);
end $$;
revoke all on function public.resolve_workspace_limit(uuid) from public,anon;
grant execute on function public.resolve_workspace_limit(uuid) to authenticated,service_role;

-- Match existing V1 upload limits (private references may be up to 25 MiB).
-- Existing objects remain available; these settings govern subsequent uploads.
update storage.buckets set file_size_limit = 26214400,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml','audio/mpeg']
  where id = 'generations';
update storage.buckets set file_size_limit = 15728640,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml']
  where id = 'maro-public';

notify pgrst, 'reload schema';
commit;
