-- Restrict full app_settings reads to admins; clients use /api/settings/public

drop policy if exists "settings_select" on public.app_settings;

drop policy if exists "settings_admin_select" on public.app_settings;
create policy "settings_admin_select" on public.app_settings
  for select using (public.is_admin());

notify pgrst, 'reload schema';
