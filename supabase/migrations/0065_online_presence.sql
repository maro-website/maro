begin;

-- Short-lived operational presence only: no IPs, URLs, emails or visit history.
create table public.online_presence (
  visitor_key text primary key check (visitor_key ~ '^[0-9a-f]{64}$'),
  signed_in boolean not null,
  last_seen timestamptz not null default now()
);
create index online_presence_last_seen on public.online_presence(last_seen);
alter table public.online_presence enable row level security;
revoke all on public.online_presence from public, anon, authenticated;
grant select, insert, update, delete on public.online_presence to service_role;

create function public.touch_online_presence(p_key text, p_signed_in boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' or p_signed_in is null then
    raise exception 'invalid_presence';
  end if;
  delete from public.online_presence where last_seen < now() - interval '2 minutes';
  insert into public.online_presence(visitor_key, signed_in, last_seen)
  values(p_key, p_signed_in, now())
  on conflict(visitor_key) do update set signed_in = excluded.signed_in, last_seen = excluded.last_seen
  where online_presence.last_seen < now() - interval '20 seconds'
     or online_presence.signed_in <> excluded.signed_in;
end;
$$;

create function public.admin_online_presence()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  delete from public.online_presence where last_seen < now() - interval '2 minutes';
  select jsonb_build_object(
    'total', count(*),
    'signedIn', count(*) filter(where signed_in),
    'guests', count(*) filter(where not signed_in),
    'windowSeconds', 120,
    'updatedAt', now()
  ) into result from public.online_presence where last_seen >= now() - interval '2 minutes';
  return result;
end;
$$;

revoke all on function public.touch_online_presence(text,boolean) from public, anon, authenticated;
revoke all on function public.admin_online_presence() from public, anon, authenticated;
grant execute on function public.touch_online_presence(text,boolean) to service_role;
grant execute on function public.admin_online_presence() to service_role;

commit;
