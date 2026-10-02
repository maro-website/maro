-- Additive product changes. No credits, subscriptions, storage quotas or provider changes.
begin;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
update public.profiles set username = 'maro_' || left(replace(id::text, '-', ''), 24) where username is null;
alter table public.profiles alter column username set default ('maro_' || left(replace(gen_random_uuid()::text, '-', ''), 24));
create unique index if not exists profiles_username_unique on public.profiles (lower(username));
do $$ begin
  if not exists(select 1 from pg_constraint where conname='profiles_username_format') then
    alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9][a-z0-9_-]{2,29}$');
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='profiles_username_reserved') then
    alter table public.profiles add constraint profiles_username_reserved check
      (username not in ('admin','administrator','support','maro','maroal','api','account','explore','settings','nice','niceal'));
  end if;
end $$;
update public.profiles p set avatar_url = u.raw_user_meta_data->>'avatar_url'
from auth.users u where u.id=p.id and p.avatar_url is null and u.raw_user_meta_data->>'avatar_url' is not null;

alter table public.generations add column if not exists conversation_id uuid;
alter table public.generations add column if not exists input_refs text[];
alter table public.generations add column if not exists logo_wizard jsonb;
alter table public.generations add column if not exists favourite boolean not null default false;
alter table public.generations add column if not exists title text;
alter table public.generations add column if not exists brain boolean not null default false;
create index if not exists generations_conversation_idx on public.generations (user_id, workspace_id, conversation_id, created_at);

-- Recover existing paid logo answers/references without guessing old chat groups.
update public.generations g set conversation_id=coalesce(g.conversation_id,g.id),
  input_refs=coalesce(g.input_refs,(select coalesce(array_agg(value->>'id'),array[]::text[])
    from jsonb_array_elements(coalesce(j.metadata->'v1_request'->'references','[]'::jsonb)))),
  logo_wizard=coalesce(g.logo_wizard,j.metadata->'v1_request'->'logoWizard'),
  brain=coalesce((j.metadata->'v1_request'->>'useBrain')::boolean,false)
from public.generation_jobs j where g.job_id=j.id and g.user_id=j.user_id and g.kind='image'
  and j.metadata->'v1_request'->>'userId'=g.user_id::text
  and nullif(j.metadata->'v1_request'->>'workspaceId','') is not distinct from g.workspace_id;

-- Attach only user-visible inputs from the immutable, owner-verified job snapshot.
-- The durable history/settlement functions and compiled private prompts remain untouched.
create or replace function public.maro_generation_conversation_metadata()
returns trigger language plpgsql security definer set search_path=public as $$
declare snapshot jsonb;
begin
  if new.kind <> 'image' then return new; end if;
  select metadata->'v1_request' into snapshot from public.generation_jobs
    where id=new.job_id and user_id=new.user_id;
  if snapshot is not null then
    if snapshot->>'userId' is distinct from new.user_id::text or
       nullif(snapshot->>'workspaceId','') is distinct from new.workspace_id then
      raise exception 'invalid_conversation_owner';
    end if;
    new.conversation_id := coalesce(nullif(snapshot->>'conversationId','')::uuid, new.id);
    select coalesce(array_agg(value->>'id'),array[]::text[]) into new.input_refs
      from jsonb_array_elements(coalesce(snapshot->'references','[]'::jsonb));
    new.logo_wizard := snapshot->'logoWizard';
    new.brain := coalesce((snapshot->>'useBrain')::boolean,false);
  else
    new.conversation_id := coalesce(new.conversation_id,new.id);
  end if;
  return new;
end $$;
drop trigger if exists maro_generation_conversation_metadata on public.generations;
create trigger maro_generation_conversation_metadata before insert on public.generations
for each row execute function public.maro_generation_conversation_metadata();
revoke all on function public.maro_generation_conversation_metadata() from public,anon,authenticated;

alter table public.public_creations
  add column if not exists show_prompt boolean not null default true,
  add column if not exists show_settings boolean not null default true,
  add column if not exists save_count integer not null default 0,
  add column if not exists view_count integer not null default 0,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
-- Existing intentionally public posts retain their visibility; new posts opt in.
alter table public.public_creations alter column show_prompt set default false;
alter table public.public_creations alter column show_settings set default false;
-- Public clients use the privacy-filtered API; raw stored prompts stay server-only.
alter table public.public_creations enable row level security;
revoke select on public.public_creations from anon,authenticated;
create index if not exists public_creations_author_idx on public.public_creations(user_id,created_at desc) where deleted_at is null;
create index if not exists public_creations_save_count_idx on public.public_creations(save_count desc) where deleted_at is null;
create index if not exists public_creations_view_count_idx on public.public_creations(view_count desc) where deleted_at is null;

create table if not exists public.creation_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  creation_id uuid not null references public.public_creations(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,creation_id)
);
alter table public.creation_saves enable row level security;

create or replace function public.toggle_creation_save(p_user uuid,p_creation uuid,p_add boolean)
returns integer language plpgsql security definer set search_path=public as $$
declare changes integer; result integer;
begin
  perform 1 from public.public_creations where id=p_creation and deleted_at is null for update;
  if not found then raise exception 'creation_not_found'; end if;
  if p_add then
    insert into public.creation_saves(user_id,creation_id) values(p_user,p_creation) on conflict do nothing;
    get diagnostics changes=row_count;
    update public.public_creations set save_count=save_count+changes where id=p_creation returning save_count into result;
  else
    delete from public.creation_saves where user_id=p_user and creation_id=p_creation;
    get diagnostics changes=row_count;
    update public.public_creations set save_count=greatest(0,save_count-changes) where id=p_creation returning save_count into result;
  end if;
  return result;
end $$;

create table if not exists public.creation_views (
  creation_id uuid not null references public.public_creations(id) on delete cascade,
  visitor_hash text not null check (length(visitor_hash)=64),
  viewed_on date not null default current_date, primary key(creation_id,visitor_hash,viewed_on)
);
alter table public.creation_views enable row level security;
create or replace function public.record_creation_view(p_creation uuid,p_visitor text)
returns integer language plpgsql security definer set search_path=public as $$
declare changes integer; result integer;
begin
  perform 1 from public.public_creations where id=p_creation and deleted_at is null for update;
  if not found then raise exception 'creation_not_found'; end if;
  insert into public.creation_views(creation_id,visitor_hash) values(p_creation,p_visitor) on conflict do nothing;
  get diagnostics changes=row_count;
  update public.public_creations set view_count=view_count+changes where id=p_creation returning view_count into result;
  return result;
end $$;
revoke all on function public.toggle_creation_save(uuid,uuid,boolean), public.record_creation_view(uuid,text) from public,anon,authenticated;
grant execute on function public.toggle_creation_save(uuid,uuid,boolean), public.record_creation_view(uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
