-- MARO — Default workspace on signup + backfill existing users

-- Helper: create first workspace for a user and set active_workspace_id
create or replace function public.ensure_default_workspace(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws_id text;
begin
  select w.id into v_ws_id
  from public.workspaces w
  where w.owner_id = p_user_id
  order by w.sort_order asc, w.created_at asc
  limit 1;

  if v_ws_id is not null then
    update public.profiles
    set active_workspace_id = coalesce(active_workspace_id, v_ws_id)
    where id = p_user_id;
    return v_ws_id;
  end if;

  v_ws_id := 'ws_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.workspaces (id, owner_id, name, icon_url, sort_order)
  values (v_ws_id, p_user_id, 'Maro Workspace #1', null, 0);

  update public.profiles
  set active_workspace_id = v_ws_id
  where id = p_user_id;

  return v_ws_id;
end;
$$;

-- Signup trigger: profile + default workspace
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws_id text;
begin
  insert into public.profiles (id, email, full_name, is_admin, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email = 'erzen@nice.al',
    case when new.email = 'erzen@nice.al' then 100000 else 0 end
  );

  v_ws_id := 'ws_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.workspaces (id, owner_id, name, icon_url, sort_order)
  values (v_ws_id, new.id, 'Maro Workspace #1', null, 0);

  update public.profiles
  set active_workspace_id = v_ws_id
  where id = new.id;

  return new;
end;
$$;

-- Backfill users who have profiles but no workspace
do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    where not exists (
      select 1 from public.workspaces w where w.owner_id = p.id
    )
  loop
    perform public.ensure_default_workspace(r.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
