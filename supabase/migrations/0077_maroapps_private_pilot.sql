-- Reuse the private campaign lifecycle and accounting; keep Apps configuration independent.
begin;
create table public.maro_apps_config (
  id integer primary key check(id=1), config jsonb not null, revision integer not null default 1,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
alter table public.maro_apps_config enable row level security;
revoke all on public.maro_apps_config from public,anon,authenticated;
grant all on public.maro_apps_config to service_role;

-- Retain durable recovery, free/paid regeneration and prorated cancellation.
-- Metadata is finalized in the same transaction, including recovery after a lost HTTP response.
create or replace function public.maro_feed_finish(p_attempt uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare gid uuid; f public.maro_feeds; a public.maro_feed_attempts;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  gid:=public.maro_feed_finish_v1(p_attempt);
  select * into a from public.maro_feed_attempts where id=p_attempt;
  select * into f from public.maro_feeds where id=a.feed_id;
  if f.brief ? 'mobile' then
    update public.generations set prompt='maroApps · '||(a.slot+1)::text,
      selections=selections||jsonb_build_object('source','maroApps','format',f.brief->'mobile'->>'format','devices',f.brief->'mobile'->'devices')
      where id=gid;
  end if;
  perform public.maro_feed_settle_cancel(f.id);
  return gid;
end $$;
revoke all on function public.maro_feed_finish(uuid) from public,anon,authenticated;
grant execute on function public.maro_feed_finish(uuid) to service_role;
commit;
