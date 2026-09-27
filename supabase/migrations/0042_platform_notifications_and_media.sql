-- Launch stabilization: canonical platform notices + persistent web thumbnails.

alter table public.notification_campaigns
  add column if not exists target_modules text[] not null default array['all']::text[],
  add column if not exists archived_at timestamptz;

update public.notification_campaigns
set target_modules = array[
  case tool_id
    when 'reklama' then 'maroImazh'
    when 'maro_imazh' then 'maroImazh'
    when 'logo' then 'maroLogo'
    when 'website' then 'maroWeb'
    when 'web' then 'maroWeb'
    when 'filma' then 'maroFilma'
    when 'audio' then 'maroZo'
    when 'zo' then 'maroZo'
    else tool_id
  end
]
where tool_id is not null
  and target_modules = array['all']::text[];

create index if not exists notification_campaigns_placement_order_idx
  on public.notification_campaigns (kind, active, priority desc, created_at desc)
  where archived_at is null;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_campaigns'
  ) then
    alter publication supabase_realtime add table public.notification_campaigns;
  end if;
end $$;

alter table public.generations
  add column if not exists thumbnail_path text;

insert into storage.buckets (id, name, public)
values ('maro-public', 'maro-public', true)
on conflict (id) do update set public = true;

drop policy if exists "maro_public_read" on storage.objects;
create policy "maro_public_read" on storage.objects
  for select using (bucket_id = 'maro-public');

notify pgrst, 'reload schema';
