-- Engine internal canary allowlist — server/service-role only.
-- No client-facing RLS policies; normal users cannot read or mutate this table.

create table if not exists public.engine_internal_canary_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists engine_internal_canary_users_enabled_idx
  on public.engine_internal_canary_users (enabled)
  where enabled = true;

alter table public.engine_internal_canary_users enable row level security;

revoke all on table public.engine_internal_canary_users from anon, authenticated;
grant select, insert, update, delete on table public.engine_internal_canary_users to service_role;

notify pgrst, 'reload schema';
