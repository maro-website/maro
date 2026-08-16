-- Maro Control Center — build-out schema (additive, post 0024)
-- Commerce extensions, support, notifications, presets categories, operations

-- ---------------------------------------------------------------------------
-- preset_categories — dynamic maroPreset categories (CMS-managed)
-- maro_prompts table retained for compatibility; category FK optional
-- ---------------------------------------------------------------------------
create table if not exists public.preset_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.preset_categories enable row level security;

drop policy if exists "preset_categories_public_read" on public.preset_categories;
create policy "preset_categories_public_read" on public.preset_categories
  for select using (active = true);

drop policy if exists "preset_categories_admin_all" on public.preset_categories;
create policy "preset_categories_admin_all" on public.preset_categories
  for all using (public.has_admin_access()) with check (public.has_admin_access());

alter table public.maro_prompts
  add column if not exists category_id uuid references public.preset_categories (id) on delete set null;

create index if not exists maro_prompts_category_id_idx on public.maro_prompts (category_id);

-- ---------------------------------------------------------------------------
-- support_tickets — Support Center
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  subject text not null,
  status text not null default 'open'
    check (status in ('open', 'pending', 'resolved', 'closed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  category text not null default 'general',
  generation_id uuid,
  order_id uuid,
  assigned_to uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_user_read" on public.support_tickets;
create policy "support_tickets_user_read" on public.support_tickets
  for select using (auth.uid() = user_id or public.has_admin_access());

drop policy if exists "support_tickets_user_insert" on public.support_tickets;
create policy "support_tickets_user_insert" on public.support_tickets
  for insert with check (auth.uid() = user_id);

drop policy if exists "support_tickets_admin_update" on public.support_tickets;
create policy "support_tickets_admin_update" on public.support_tickets
  for update using (public.has_admin_access()) with check (public.has_admin_access());

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_role text not null default 'user'
    check (author_role in ('user', 'admin', 'system')),
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

alter table public.support_ticket_messages enable row level security;

drop policy if exists "support_messages_read" on public.support_ticket_messages;
create policy "support_messages_read" on public.support_ticket_messages
  for select using (
    public.has_admin_access()
    or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid() and internal = false
    )
  );

-- ---------------------------------------------------------------------------
-- refund_records — credit/payment refund workflow (admin)
-- ---------------------------------------------------------------------------
create table if not exists public.refund_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('credit', 'payment')),
  amount_credits integer,
  amount_currency numeric(12, 2),
  currency text default 'ALL',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'processed', 'rejected')),
  reason text not null,
  generation_id uuid,
  order_id uuid,
  report_id uuid references public.reports (id) on delete set null,
  ticket_id uuid references public.support_tickets (id) on delete set null,
  processed_by uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists refund_records_status_idx on public.refund_records (status, created_at desc);

alter table public.refund_records enable row level security;

drop policy if exists "refund_records_admin" on public.refund_records;
create policy "refund_records_admin" on public.refund_records
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- creator_commissions — earnings ledger (Phase 4 prep; attribution only until live)
-- ---------------------------------------------------------------------------
create table if not exists public.creator_commissions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid,
  promo_code text,
  gross_amount numeric(12, 2),
  commission_amount numeric(12, 2),
  currency text not null default 'ALL',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'void')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists creator_commissions_creator_idx
  on public.creator_commissions (creator_id, created_at desc);

alter table public.creator_commissions enable row level security;

drop policy if exists "creator_commissions_admin" on public.creator_commissions;
create policy "creator_commissions_admin" on public.creator_commissions
  for select using (public.has_admin_access() or auth.uid() = creator_id);

-- ---------------------------------------------------------------------------
-- provider_cost_estimates — separate from customer price
-- ---------------------------------------------------------------------------
create table if not exists public.provider_cost_estimates (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid,
  job_id uuid,
  tool_id text,
  model_id text not null,
  provider text not null,
  estimated_cost_usd numeric(12, 6),
  input_tokens integer,
  output_tokens integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provider_cost_estimates_created_idx
  on public.provider_cost_estimates (created_at desc);
create index if not exists provider_cost_estimates_tool_idx
  on public.provider_cost_estimates (tool_id, created_at desc);

alter table public.provider_cost_estimates enable row level security;

drop policy if exists "provider_cost_admin" on public.provider_cost_estimates;
create policy "provider_cost_admin" on public.provider_cost_estimates
  for select using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- pricing_snapshots — immutable checkout/pricing config at purchase time
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  order_id uuid,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.pricing_snapshots enable row level security;

drop policy if exists "pricing_snapshots_admin" on public.pricing_snapshots;
create policy "pricing_snapshots_admin" on public.pricing_snapshots
  for select using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- notification_campaigns — Global/Tool banners + in-app notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('global_banner', 'tool_banner', 'in_app')),
  title text not null,
  body text not null default '',
  cta_label text,
  cta_url text,
  tool_id text,
  audience text not null default 'all'
    check (audience in ('all', 'authenticated', 'plan_active', 'plan_free')),
  priority integer not null default 0,
  dismissible boolean not null default true,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_campaigns_active_idx
  on public.notification_campaigns (active, kind, starts_at desc);

alter table public.notification_campaigns enable row level security;

drop policy if exists "notification_campaigns_public_read" on public.notification_campaigns;
create policy "notification_campaigns_public_read" on public.notification_campaigns
  for select using (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "notification_campaigns_admin" on public.notification_campaigns;
create policy "notification_campaigns_admin" on public.notification_campaigns
  for all using (public.has_admin_access()) with check (public.has_admin_access());

create table if not exists public.notification_dismissals (
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.notification_campaigns (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, campaign_id)
);

alter table public.notification_dismissals enable row level security;

drop policy if exists "notification_dismissals_own" on public.notification_dismissals;
create policy "notification_dismissals_own" on public.notification_dismissals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- help_articles — Help Center (admin CMS)
-- ---------------------------------------------------------------------------
create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null default '',
  category text not null default 'general',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.help_articles enable row level security;

drop policy if exists "help_articles_public_read" on public.help_articles;
create policy "help_articles_public_read" on public.help_articles
  for select using (published = true);

drop policy if exists "help_articles_admin" on public.help_articles;
create policy "help_articles_admin" on public.help_articles
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- budget_guards — AI spend limits (operations)
-- ---------------------------------------------------------------------------
create table if not exists public.budget_guards (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'tool', 'provider')),
  scope_key text,
  daily_limit_usd numeric(12, 2),
  monthly_limit_usd numeric(12, 2),
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.budget_guards enable row level security;

drop policy if exists "budget_guards_admin" on public.budget_guards;
create policy "budget_guards_admin" on public.budget_guards
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- security_events — security log (distinct from audit_events)
-- ---------------------------------------------------------------------------
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  user_id uuid references auth.users (id) on delete set null,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_idx
  on public.security_events (created_at desc);
create index if not exists security_events_type_idx
  on public.security_events (event_type, created_at desc);

alter table public.security_events enable row level security;

drop policy if exists "security_events_admin" on public.security_events;
create policy "security_events_admin" on public.security_events
  for select using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- data_retention_policies
-- ---------------------------------------------------------------------------
create table if not exists public.data_retention_policies (
  domain text primary key,
  retention_days integer not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.data_retention_policies (domain, retention_days, description) values
  ('generation_debug', 90, 'Detailed generation/debug records'),
  ('audit_financial', 2555, 'Financial and accounting audit (~7 years)'),
  ('audit_security', 365, 'Security event retention')
on conflict (domain) do nothing;

alter table public.data_retention_policies enable row level security;

drop policy if exists "data_retention_admin" on public.data_retention_policies;
create policy "data_retention_admin" on public.data_retention_policies
  for select using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- Additional feature flags (all disabled by default)
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, metadata) values
  ('preset_reveal_enabled', false, '{"description":"Legacy preset reveal/unlock — disabled in maroPresets migration"}'::jsonb),
  ('raiffeisen_live', false, '{"description":"BLOCKED — RAIFFEISEN DOCUMENTATION REQUIRED"}'::jsonb),
  ('engine_shadow_imazh', false, '{"description":"maroImazh shadow mode — prep only"}'::jsonb),
  ('engine_shadow_logo', false, '{"description":"maroLogo shadow mode — prep only"}'::jsonb)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
