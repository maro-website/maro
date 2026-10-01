-- Temporary public launch waitlist. Writes only pass through the server-side
-- service role; no visitor can enumerate or read collected email addresses.

create table if not exists public.launch_waitlist (
  id bigint generated always as identity primary key,
  email text not null,
  source text not null default 'coming_soon',
  created_at timestamptz not null default now(),
  constraint launch_waitlist_email_length check (char_length(email) between 3 and 254),
  constraint launch_waitlist_email_normalized check (email = lower(trim(email))),
  constraint launch_waitlist_email_shape check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint launch_waitlist_source_length check (char_length(source) between 1 and 64),
  constraint launch_waitlist_email_unique unique (email)
);

create index if not exists launch_waitlist_created_at_idx
  on public.launch_waitlist (created_at asc, id asc);

alter table public.launch_waitlist enable row level security;

revoke all on table public.launch_waitlist from anon, authenticated;
revoke all on sequence public.launch_waitlist_id_seq from anon, authenticated;
grant select, insert on table public.launch_waitlist to service_role;
grant usage, select on sequence public.launch_waitlist_id_seq to service_role;

notify pgrst, 'reload schema';

