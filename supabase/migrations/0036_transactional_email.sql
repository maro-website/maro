-- MARO — Transactional email foundation (Phase 0)
-- Requires 0021_control_center_foundation.sql

-- ---------------------------------------------------------------------------
-- email_settings — non-secret operational configuration (singleton)
-- product_email_enabled kills product/domain emails only — NOT auth emails.
-- ---------------------------------------------------------------------------
create table if not exists public.email_settings (
  id text primary key default 'default',
  from_name text not null default 'maro',
  from_email text not null default 'info@maro.al',
  reply_to text not null default 'info@maro.al',
  provider text not null default 'resend',
  product_email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.email_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.email_settings enable row level security;

drop policy if exists "email_settings_admin" on public.email_settings;
create policy "email_settings_admin" on public.email_settings
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- email_templates — template identity / configuration
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  name text not null,
  category text not null check (category in ('auth', 'account', 'commerce', 'workspace')),
  locale text not null default 'sq',
  enabled boolean not null default true,
  is_system boolean not null default false,
  live_version_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, locale)
);

create index if not exists email_templates_category_idx
  on public.email_templates (category, locale, enabled);

alter table public.email_templates enable row level security;

drop policy if exists "email_templates_admin" on public.email_templates;
create policy "email_templates_admin" on public.email_templates
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- email_template_versions — immutable version history
-- ---------------------------------------------------------------------------
create table if not exists public.email_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.email_templates (id) on delete cascade,
  version_label text not null,
  status text not null default 'draft'
    check (status in ('draft', 'live', 'archived')),
  subject text not null,
  preview_text text not null default '',
  content jsonb not null default '{}'::jsonb,
  allowed_variables text[] not null default '{}',
  change_note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (template_id, version_label)
);

create unique index if not exists email_template_versions_one_live_idx
  on public.email_template_versions (template_id)
  where status = 'live';

create index if not exists email_template_versions_template_status_idx
  on public.email_template_versions (template_id, status, created_at desc);

alter table public.email_template_versions enable row level security;

drop policy if exists "email_template_versions_admin" on public.email_template_versions;
create policy "email_template_versions_admin" on public.email_template_versions
  for all using (public.has_admin_access()) with check (public.has_admin_access());

alter table public.email_templates
  drop constraint if exists email_templates_live_version_id_fkey;

alter table public.email_templates
  add constraint email_templates_live_version_id_fkey
  foreign key (live_version_id) references public.email_template_versions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- email_outbox — product/domain transactional queue (NOT auth hook)
-- ---------------------------------------------------------------------------
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  locale text not null default 'sq',
  recipient_email text not null,
  recipient_user_id uuid references auth.users (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  provider_message_id text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_outbox_status_scheduled_idx
  on public.email_outbox (status, scheduled_at asc);

alter table public.email_outbox enable row level security;
-- No client policies — service role only.

-- ---------------------------------------------------------------------------
-- email_logs — operational metadata (no secrets, no raw auth URLs)
-- Target retention: 90 days (cron wiring deferred)
-- ---------------------------------------------------------------------------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.email_outbox (id) on delete set null,
  template_key text not null,
  recipient_user_id uuid references auth.users (id) on delete set null,
  recipient_domain text,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'sent'
    check (status in ('sent', 'delivered', 'bounced', 'failed', 'complained')),
  error_category text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_created_idx
  on public.email_logs (created_at desc);

create index if not exists email_logs_template_idx
  on public.email_logs (template_key, created_at desc);

alter table public.email_logs enable row level security;

drop policy if exists "email_logs_admin_select" on public.email_logs;
create policy "email_logs_admin_select" on public.email_logs
  for select using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- Seed Albanian live auth templates (dormant until Phase 1 hook)
-- ---------------------------------------------------------------------------
do $$
declare
  v_tpl_id uuid;
  v_ver_id uuid;
begin
  -- auth.confirm_signup
  insert into public.email_templates (template_key, name, category, locale, enabled, is_system)
  values ('auth.confirm_signup', 'Konfirmimi i regjistrimit', 'auth', 'sq', true, true)
  on conflict (template_key, locale) do update set updated_at = now()
  returning id into v_tpl_id;

  if v_tpl_id is null then
    select id into v_tpl_id from public.email_templates where template_key = 'auth.confirm_signup' and locale = 'sq';
  end if;

  insert into public.email_template_versions (
    template_id, version_label, status, subject, preview_text, content, allowed_variables, change_note, published_at
  ) values (
    v_tpl_id, 'v1', 'live',
    'Konfirmo llogarinë tënde në maro.al',
    'Konfirmo email-in për të aktivizuar llogarinë.',
    jsonb_build_object(
      'heading', 'Konfirmo llogarinë tënde',
      'paragraphs', jsonb_build_array(
        'Faleminderit që u regjistrove në maro.al.',
        'Kliko butonin më poshtë për të konfirmuar adresën tënde të email-it.'
      ),
      'cta', jsonb_build_object('label', 'Konfirmo email-in', 'url', '{{confirmation_url}}'),
      'footerNote', 'Nëse nuk e ke krijuar ti këtë llogari, mund ta injorosh këtë email.'
    ),
    array['confirmation_url', 'user_email'],
    'Phase 0 seed',
    now()
  )
  on conflict (template_id, version_label) do nothing
  returning id into v_ver_id;

  if v_ver_id is null then
    select id into v_ver_id from public.email_template_versions where template_id = v_tpl_id and version_label = 'v1';
  end if;

  update public.email_templates set live_version_id = v_ver_id, updated_at = now() where id = v_tpl_id;

  -- auth.reset_password
  insert into public.email_templates (template_key, name, category, locale, enabled, is_system)
  values ('auth.reset_password', 'Rivendosja e fjalëkalimit', 'auth', 'sq', true, true)
  on conflict (template_key, locale) do update set updated_at = now()
  returning id into v_tpl_id;

  if v_tpl_id is null then
    select id into v_tpl_id from public.email_templates where template_key = 'auth.reset_password' and locale = 'sq';
  end if;

  insert into public.email_template_versions (
    template_id, version_label, status, subject, preview_text, content, allowed_variables, change_note, published_at
  ) values (
    v_tpl_id, 'v1', 'live',
    'Rivendos fjalëkalimin tënd — maro.al',
    'Kërkesë për rivendosjen e fjalëkalimit.',
    jsonb_build_object(
      'heading', 'Rivendos fjalëkalimin',
      'paragraphs', jsonb_build_array(
        'Kemi marrë një kërkesë për të rivendosur fjalëkalimin e llogarisë tënde.',
        'Kliko butonin më poshtë për të zgjedhur një fjalëkalim të ri.'
      ),
      'cta', jsonb_build_object('label', 'Rivendos fjalëkalimin', 'url', '{{recovery_url}}'),
      'secondaryText', 'Ky link skadon së shpejti por arsye sigurie.',
      'footerNote', 'Nëse nuk e ke kërkuar ti, injoroje këtë email.'
    ),
    array['recovery_url', 'user_email'],
    'Phase 0 seed',
    now()
  )
  on conflict (template_id, version_label) do nothing
  returning id into v_ver_id;

  if v_ver_id is null then
    select id into v_ver_id from public.email_template_versions where template_id = v_tpl_id and version_label = 'v1';
  end if;

  update public.email_templates set live_version_id = v_ver_id, updated_at = now() where id = v_tpl_id;

  -- auth.email_change
  insert into public.email_templates (template_key, name, category, locale, enabled, is_system)
  values ('auth.email_change', 'Ndryshimi i email-it', 'auth', 'sq', true, true)
  on conflict (template_key, locale) do update set updated_at = now()
  returning id into v_tpl_id;

  if v_tpl_id is null then
    select id into v_tpl_id from public.email_templates where template_key = 'auth.email_change' and locale = 'sq';
  end if;

  insert into public.email_template_versions (
    template_id, version_label, status, subject, preview_text, content, allowed_variables, change_note, published_at
  ) values (
    v_tpl_id, 'v1', 'live',
    'Konfirmo ndryshimin e email-it — maro.al',
    'Konfirmo ndryshimin e adresës së email-it.',
    jsonb_build_object(
      'heading', 'Konfirmo ndryshimin e email-it',
      'paragraphs', jsonb_build_array(
        'Kemi marrë një kërkesë për të ndryshuar email-in e llogarisë tënde.',
        'Kliko butonin më poshtë për të konfirmuar këtë ndryshim.'
      ),
      'cta', jsonb_build_object('label', 'Konfirmo ndryshimin', 'url', '{{confirmation_url}}'),
      'footerNote', 'Nëse nuk e ke kërkuar ti, na kontakto menjëherë.'
    ),
    array['confirmation_url', 'user_email', 'recipient_email', 'change_recipient_role'],
    'Phase 0 seed',
    now()
  )
  on conflict (template_id, version_label) do nothing
  returning id into v_ver_id;

  if v_ver_id is null then
    select id into v_ver_id from public.email_template_versions where template_id = v_tpl_id and version_label = 'v1';
  end if;

  update public.email_templates set live_version_id = v_ver_id, updated_at = now() where id = v_tpl_id;

  -- auth.magic_link
  insert into public.email_templates (template_key, name, category, locale, enabled, is_system)
  values ('auth.magic_link', 'Magic link', 'auth', 'sq', true, true)
  on conflict (template_key, locale) do update set updated_at = now()
  returning id into v_tpl_id;

  if v_tpl_id is null then
    select id into v_tpl_id from public.email_templates where template_key = 'auth.magic_link' and locale = 'sq';
  end if;

  insert into public.email_template_versions (
    template_id, version_label, status, subject, preview_text, content, allowed_variables, change_note, published_at
  ) values (
    v_tpl_id, 'v1', 'live',
    'Hyr në maro.al',
    'Link i sigurt për hyrje.',
    jsonb_build_object(
      'heading', 'Hyr në llogarinë tënde',
      'paragraphs', jsonb_build_array('Kliko butonin më poshtë për të hyrë në maro.al.'),
      'cta', jsonb_build_object('label', 'Hyr tani', 'url', '{{magic_link_url}}'),
      'footerNote', 'Nëse nuk e ke kërkuar ti, injoroje këtë email.'
    ),
    array['magic_link_url', 'user_email'],
    'Phase 0 seed',
    now()
  )
  on conflict (template_id, version_label) do nothing
  returning id into v_ver_id;

  if v_ver_id is null then
    select id into v_ver_id from public.email_template_versions where template_id = v_tpl_id and version_label = 'v1';
  end if;

  update public.email_templates set live_version_id = v_ver_id, updated_at = now() where id = v_tpl_id;
end $$;

insert into public.data_retention_policies (domain, retention_days, description) values
  ('email_logs', 90, 'Transactional email delivery metadata')
on conflict (domain) do update set
  retention_days = excluded.retention_days,
  description = excluded.description,
  updated_at = now();
