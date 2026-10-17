-- Private Brain library and explicit clear operations; no existing data is cleared.
begin;
create table public.maro_brain_folders (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique(workspace_id,id)
);
alter table public.maro_brain_folders enable row level security;
revoke all on public.maro_brain_folders from public,anon,authenticated;
grant all on public.maro_brain_folders to service_role;
alter table public.workspace_sources add column folder_id text;
alter table public.workspace_sources add constraint workspace_sources_folder_scope
  foreign key(workspace_id,folder_id) references public.maro_brain_folders(workspace_id,id);
create index on public.workspace_sources(workspace_id,folder_id);

-- Only the existing server gate may call these operations. Recheck the pilot,
-- plan and reset epoch while holding the same workspace lock as memory writers.
create function public.maro_studio_lock(p_user uuid,p_workspace text,p_reset timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare w public.workspaces;
begin
  if p_user is distinct from 'fec01baa-8451-4112-84fb-8552f8b31686'::uuid or
    not exists(select 1 from auth.users where id=p_user and lower(email)='erzen@nice.al') then raise exception 'PILOT_REQUIRED'; end if;
  if not coalesce((public.maro_account_policy(p_user,p_workspace)->>'brainAccess')::boolean,false) then raise exception 'BRAIN_PLAN_REQUIRED'; end if;
  select * into w from public.workspaces where id=p_workspace and owner_id=p_user for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if w.brain_reset_at is distinct from p_reset then raise exception 'BRAIN_REFRESH_REQUIRED'; end if;
end; $$;

create function public.maro_studio_library(p_user uuid,p_workspace text,p_reset timestamptz,p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare folder text; ids text[]; asset_path text; paths text[] := array[]::text[]; file_ref text; row_count integer;
begin
  perform public.maro_studio_lock(p_user,p_workspace,p_reset);
  folder := nullif(p_payload->>'folderId','');
  if folder is not null and not exists(select 1 from public.maro_brain_folders where id=folder and workspace_id=p_workspace and owner_id=p_user) then raise exception 'FOLDER_NOT_FOUND'; end if;
  if p_action='create_folder' then
    if length(btrim(p_payload->>'name')) not between 1 and 80 or (select count(*) from public.maro_brain_folders where workspace_id=p_workspace)>=100 then raise exception 'INVALID_REQUEST'; end if;
    insert into public.maro_brain_folders(id,workspace_id,owner_id,name) values(p_payload->>'id',p_workspace,p_user,btrim(p_payload->>'name'));
  elsif p_action='rename_folder' then
    if folder is null or length(btrim(p_payload->>'name')) not between 1 and 80 then raise exception 'INVALID_REQUEST'; end if;
    update public.maro_brain_folders set name=btrim(p_payload->>'name') where id=folder and workspace_id=p_workspace;
  elsif p_action='delete_folder' then
    if folder is null then raise exception 'INVALID_REQUEST'; end if;
    update public.workspace_sources set folder_id=null where workspace_id=p_workspace and owner_id=p_user and folder_id=folder;
    delete from public.maro_brain_folders where id=folder and workspace_id=p_workspace and owner_id=p_user;
  elsif p_action='discard_upload' then
    file_ref := p_payload->>'storageRef'; asset_path := substring(file_ref from length('storage:generations/')+1);
    if not starts_with(file_ref,'storage:generations/'||p_user::text||'/workspace-assets/'||p_workspace||'/') or asset_path like '%..%' then raise exception 'INVALID_REQUEST'; end if;
    if not exists(select 1 from public.workspace_sources where file_url=file_ref) and
      not exists(select 1 from public.workspaces where brand_logo_url=file_ref or brain_profile#>>'{brand,logoStorageRef}'=file_ref) and
      not exists(select 1 from public.maro_brain_profile_versions where profile#>>'{brand,logoStorageRef}'=file_ref or profile#>>'{brand,logoUrl}'=file_ref) then
      paths := array[asset_path]; insert into public.brain_retention_files(path) values(asset_path) on conflict do nothing;
    end if;
  elsif p_action='add_source' then
    file_ref := p_payload->>'storageRef';
    asset_path := substring(file_ref from length('storage:generations/')+1);
    if not starts_with(file_ref,'storage:generations/'||p_user::text||'/workspace-assets/'||p_workspace||'/') or
      asset_path like '%..%' or not exists(select 1 from storage.objects where bucket_id='generations' and name=asset_path) or
      exists(select 1 from public.brain_retention_files q where q.path=asset_path) or
      length(btrim(p_payload->>'name')) not between 1 and 160 or length(coalesce(p_payload->>'keywords',''))>500 then raise exception 'INVALID_REQUEST'; end if;
    if (select count(*) from public.workspace_sources where workspace_id=p_workspace)>=2000 then raise exception 'SOURCE_LIMIT'; end if;
    insert into public.workspace_sources(id,workspace_id,owner_id,name,keywords,file_url,mime_type,folder_id)
      values(p_payload->>'id',p_workspace,p_user,btrim(p_payload->>'name'),coalesce(p_payload->>'keywords',''),file_ref,p_payload->>'mimeType',folder);
  elsif p_action in ('move_sources','delete_sources','edit_source') then
    select array_agg(value) into ids from jsonb_array_elements_text(p_payload->'ids');
    if coalesce(cardinality(ids),0) not between 1 and 200 or cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception 'INVALID_REQUEST'; end if;
    select count(*) into row_count from public.workspace_sources where id=any(ids) and workspace_id=p_workspace and owner_id=p_user;
    if row_count<>cardinality(ids) then raise exception 'SOURCE_CONFLICT'; end if;
    if p_action='move_sources' then
      update public.workspace_sources set folder_id=folder where id=any(ids) and workspace_id=p_workspace and owner_id=p_user;
    elsif p_action='edit_source' then
      if cardinality(ids)<>1 or length(btrim(p_payload->>'name')) not between 1 and 160 or length(coalesce(p_payload->>'keywords',''))>500 then raise exception 'INVALID_REQUEST'; end if;
      update public.workspace_sources set name=btrim(p_payload->>'name'),keywords=coalesce(p_payload->>'keywords','') where id=ids[1] and workspace_id=p_workspace and owner_id=p_user;
    else
      select coalesce(array_agg(distinct substring(file_url from length('storage:generations/')+1)),array[]::text[]) into paths
        from public.workspace_sources where id=any(ids) and workspace_id=p_workspace and owner_id=p_user
        and starts_with(file_url,'storage:generations/'||p_user::text||'/workspace-assets/'||p_workspace||'/');
      delete from public.workspace_sources where id=any(ids) and workspace_id=p_workspace and owner_id=p_user;
      -- Do not remove an object still used by another reference or the brand logo.
      select coalesce(array_agg(x),array[]::text[]) into paths from unnest(paths) x where
        not exists(select 1 from public.workspace_sources where file_url='storage:generations/'||x)
        and not exists(select 1 from public.workspaces where brand_logo_url='storage:generations/'||x or brain_profile#>>'{brand,logoStorageRef}'='storage:generations/'||x);
      insert into public.brain_retention_files(path) select unnest(paths) on conflict do nothing;
    end if;
  else raise exception 'INVALID_REQUEST'; end if;
  return jsonb_build_object('ok',true,'paths',paths);
end; $$;

-- Reset epochs invalidate stale editor drafts. A category clear scrubs only that
-- category from history, retaining other categories and memories.
create or replace function public.maro_record_brain_profile_version() returns trigger
language plpgsql security definer set search_path='' as $$
declare section text := current_setting('maro.studio_clear_section',true);
begin
  if new.brain_reset_at is distinct from old.brain_reset_at then
    if section in ('brand','target','goal','market','content') then
      update public.maro_brain_profile_versions set profile=profile-section where workspace_id=new.id;
    elsif section='memories' then
      delete from public.maro_brain_memories where workspace_id=new.id;
    elsif section='sources' then null;
    else
      delete from public.maro_brain_memories where workspace_id=new.id;
      delete from public.maro_brain_profile_versions where workspace_id=new.id;
      delete from public.maro_brain_folders where workspace_id=new.id;
    end if;
    return new;
  end if;
  if new.brain_profile is distinct from old.brain_profile then
    if old.brain_profile<>'{}'::jsonb and not exists(select 1 from public.maro_brain_profile_versions where workspace_id=new.id) then
      insert into public.maro_brain_profile_versions(workspace_id,owner_id,profile) values(new.id,new.owner_id,old.brain_profile);
    end if;
    insert into public.maro_brain_profile_versions(workspace_id,owner_id,profile) values(new.id,new.owner_id,new.brain_profile);
  end if;
  return new;
end; $$;

create function public.maro_studio_clear(p_user uuid,p_workspace text,p_reset timestamptz,p_section text,p_expected jsonb,p_sources text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.workspaces; paths text[] := array[]::text[]; epoch timestamptz := clock_timestamp(); previous_flag text; previous_section text;
begin
  perform public.maro_studio_lock(p_user,p_workspace,p_reset);
  if p_section not in ('all','brand','target','goal','market','content','sources','memories') then raise exception 'INVALID_REQUEST'; end if;
  select * into w from public.workspaces where id=p_workspace and owner_id=p_user;
  if w.brain_profile is distinct from p_expected then raise exception 'BRAND_CONFLICT'; end if;
  if p_section in ('all','sources') and (select coalesce(array_agg(id order by id),array[]::text[]) from public.workspace_sources where workspace_id=p_workspace and owner_id=p_user)
    is distinct from (select coalesce(array_agg(x order by x),array[]::text[]) from unnest(p_sources) x) then raise exception 'SOURCE_CONFLICT'; end if;
  if p_section='all' then
    insert into public.brain_retention_files(path) select o.name from storage.objects o where bucket_id='generations' and starts_with(name,p_user::text||'/workspace-assets/'||p_workspace||'/')
      and not exists(select 1 from public.workspace_sources s where s.workspace_id<>p_workspace and s.file_url='storage:generations/'||o.name)
      and not exists(select 1 from public.workspaces x where x.id<>p_workspace and (x.brand_logo_url='storage:generations/'||o.name or x.brain_profile#>>'{brand,logoStorageRef}'='storage:generations/'||o.name)) on conflict do nothing;
    select coalesce(array_agg(path),array[]::text[]) into paths from (select path from public.brain_retention_files where starts_with(path,p_user::text||'/workspace-assets/'||p_workspace||'/') order by path limit 201) queued;
  elsif p_section='sources' then
    select coalesce(array_agg(distinct substring(file_url from length('storage:generations/')+1)),array[]::text[]) into paths from public.workspace_sources
      where workspace_id=p_workspace and owner_id=p_user and starts_with(file_url,'storage:generations/'||p_user::text||'/workspace-assets/'||p_workspace||'/')
      and file_url is distinct from w.brand_logo_url and file_url is distinct from w.brain_profile#>>'{brand,logoStorageRef}'
      and not exists(select 1 from public.workspace_sources s where s.workspace_id<>p_workspace and s.file_url=workspace_sources.file_url)
      and not exists(select 1 from public.workspaces x where x.id<>p_workspace and (x.brand_logo_url=workspace_sources.file_url or x.brain_profile#>>'{brand,logoStorageRef}'=workspace_sources.file_url));
  elsif p_section='brand' then
    select coalesce(array_agg(o.name),array[]::text[]) into paths from storage.objects o where o.bucket_id='generations'
      and starts_with(o.name,p_user::text||'/workspace-assets/'||p_workspace||'/')
      and ('storage:generations/'||o.name=coalesce(w.brain_profile#>>'{brand,logoStorageRef}',w.brand_logo_url))
      and not exists(select 1 from public.workspace_sources where file_url='storage:generations/'||o.name)
      and not exists(select 1 from public.workspaces x where x.id<>p_workspace and (x.brand_logo_url='storage:generations/'||o.name or x.brain_profile#>>'{brand,logoStorageRef}'='storage:generations/'||o.name));
  end if;
  insert into public.brain_retention_files(path) select unnest(paths) on conflict do nothing;
  if p_section in ('all','sources') then
    delete from public.workspace_sources where workspace_id=p_workspace and owner_id=p_user;
    delete from public.maro_brain_folders where workspace_id=p_workspace and owner_id=p_user;
  end if;
  previous_flag := current_setting('maro.brain_retention',true); previous_section := current_setting('maro.studio_clear_section',true);
  perform set_config('maro.brain_retention','on',true); perform set_config('maro.studio_clear_section',p_section,true);
  update public.workspaces set brain_profile=case when p_section='all' then '{}'::jsonb when p_section in ('brand','target','goal','market','content') then brain_profile-p_section else brain_profile end,
    brand_name=case when p_section in ('all','brand') then null else brand_name end,
    brand_logo_url=case when p_section in ('all','brand') then null else brand_logo_url end,
    brain_reset_at=epoch where id=p_workspace and owner_id=p_user;
  perform set_config('maro.brain_retention',coalesce(previous_flag,''),true); perform set_config('maro.studio_clear_section',coalesce(previous_section,''),true);
  return jsonb_build_object('ok',true,'resetAt',epoch,'paths',paths[1:200],'cleanupPending',cardinality(paths)>200);
end; $$;

create function public.maro_studio_remember(p_user uuid,p_workspace text,p_reset timestamptz,p_key text,p_content text,p_source text,p_expected bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.maro_studio_lock(p_user,p_workspace,p_reset);
  return public.maro_mcp_remember(p_user,p_workspace,p_key,p_content,p_source,p_expected);
end; $$;
revoke all on function public.maro_studio_lock(uuid,text,timestamptz),public.maro_studio_library(uuid,text,timestamptz,text,jsonb),public.maro_studio_clear(uuid,text,timestamptz,text,jsonb,text[]),public.maro_studio_remember(uuid,text,timestamptz,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.maro_studio_lock(uuid,text,timestamptz),public.maro_studio_library(uuid,text,timestamptz,text,jsonb),public.maro_studio_clear(uuid,text,timestamptz,text,jsonb,text[]),public.maro_studio_remember(uuid,text,timestamptz,text,text,text,bigint) to service_role;
notify pgrst,'reload schema';
commit;
