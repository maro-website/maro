-- Managed advertising slots for the public sign-in and sign-up pages.
-- Visitors can only receive one selected active ad through the server API;
-- direct table access remains limited to the service role.

create table if not exists public.login_ads (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_path text not null,
  external_url text not null,
  weight smallint not null default 3,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint login_ads_image_url_length check (char_length(image_url) between 8 and 2048),
  constraint login_ads_image_path_shape check (image_path like 'admin-ads/%'),
  constraint login_ads_external_url_length check (char_length(external_url) between 8 and 2048),
  constraint login_ads_external_url_shape check (external_url ~ '^https?://'),
  constraint login_ads_weight_range check (weight between 1 and 5)
);

create index if not exists login_ads_active_weight_idx
  on public.login_ads (active, weight desc, updated_at desc);

alter table public.login_ads enable row level security;

revoke all on table public.login_ads from anon, authenticated;
grant select, insert, update, delete on table public.login_ads to service_role;

notify pgrst, 'reload schema';
