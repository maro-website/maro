-- MARO — Billing notifications + email template seeds

-- ---------------------------------------------------------------------------
-- user_notifications — deduplicated in-app billing reminders
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  kind text not null default 'billing',
  title text not null,
  body text not null default '',
  action_href text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_own" on public.user_notifications;
create policy "user_notifications_own" on public.user_notifications
  for select using (auth.uid() = user_id or public.has_admin_access());

drop policy if exists "user_notifications_admin_insert" on public.user_notifications;
create policy "user_notifications_admin_insert" on public.user_notifications
  for insert with check (public.has_admin_access() or auth.uid() = user_id);

drop policy if exists "user_notifications_own_update" on public.user_notifications;
create policy "user_notifications_own_update" on public.user_notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed billing email templates (no plan_expired email per spec)
-- ---------------------------------------------------------------------------
insert into public.email_templates (template_key, name, category, locale, enabled, is_system, metadata)
values
  (
    'plan_expiring_2_days',
    'Plani skadon për 2 ditë',
    'commerce',
    'sq',
    true,
    true,
    '{"description": "Manual renewal reminder 2 days before expiry"}'::jsonb
  ),
  (
    'plan_expiring_1_day',
    'Plani skadon nesër',
    'commerce',
    'sq',
    true,
    true,
    '{"description": "Manual renewal reminder 1 day before expiry"}'::jsonb
  )
on conflict (template_key, locale) do nothing;

-- Default live versions for seeded templates
insert into public.email_template_versions (
  template_id, version_label, status, subject, preview_text, content, allowed_variables, change_note, published_at
)
select
  t.id,
  'v1',
  'live',
  case t.template_key
    when 'plan_expiring_2_days' then 'Plani yt maro skadon për 2 ditë'
    when 'plan_expiring_1_day' then 'Plani yt maro skadon nesër'
  end,
  'Rinovo planin për të vazhduar me përfitimet aktive.',
  jsonb_build_object(
    'heading', 'Rinovimi i planit',
    'body', 'Plani yt {{plan_name}} skadon më {{expires_date}}. Rinovimi automatik: Jo. Kreditet e tua mbeten — rinovo planin për Top-up dhe përfitimet e planit.',
    'cta_label', 'Rinovo planin',
    'cta_href', '{{billing_url}}'
  ),
  array['plan_name', 'expires_date', 'billing_url', 'user_name'],
  'Initial commerce renewal template',
  now()
from public.email_templates t
where t.template_key in ('plan_expiring_2_days', 'plan_expiring_1_day')
  and not exists (
    select 1 from public.email_template_versions v
    where v.template_id = t.id and v.version_label = 'v1'
  );

update public.email_templates t
set live_version_id = v.id
from public.email_template_versions v
where v.template_id = t.id
  and v.version_label = 'v1'
  and v.status = 'live'
  and t.template_key in ('plan_expiring_2_days', 'plan_expiring_1_day')
  and t.live_version_id is null;

notify pgrst, 'reload schema';
