-- Fix: infinite recursion (42P17) in profiles RLS policies.
-- The old policies queried public.profiles from within a profiles policy, which
-- recurses. Route admin checks through a SECURITY DEFINER helper instead.
-- Run this on databases created with the original 0001 migration.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

drop policy if exists "settings_admin_update" on public.app_settings;
create policy "settings_admin_update" on public.app_settings
  for update using (public.is_admin());

drop policy if exists "generations_select" on public.generations;
create policy "generations_select" on public.generations
  for select using (auth.uid() = user_id or public.is_admin());

notify pgrst, 'reload schema';
