-- maroPresets 2.0: one canonical preset engine, multiple tool experiences.
-- Additive evolution of maro_prompts. Existing ids, likes, use counts and
-- hidden full_prompt values remain intact.

alter table public.maro_prompts
  add column if not exists tool text,
  add column if not exists title text,
  add column if not exists slug text,
  add column if not exists description text not null default '',
  add column if not exists config jsonb not null default '{"version":1}'::jsonb,
  add column if not exists status text not null default 'published',
  add column if not exists featured boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists access_level text not null default 'free',
  add column if not exists search_text text not null default '',
  add column if not exists updated_at timestamptz not null default now();

update public.maro_prompts
set
  tool = case target_tool
    when 'logo' then 'logo'
    when 'website' then 'web'
    when 'web' then 'web'
    else 'imazh'
  end,
  title = coalesce(nullif(title, ''), code),
  slug = coalesce(nullif(slug, ''), lower(regexp_replace(code, '[^a-zA-Z0-9]+', '-', 'g'))),
  status = case when active then 'published' else 'disabled' end,
  config = case
    when jsonb_typeof(config) = 'object' then jsonb_build_object(
      'version', case when coalesce(config->>'version', '') ~ '^[0-9]+$' then (config->>'version')::integer else 1 end
    ) || config
    else '{"version":1}'::jsonb
  end,
  search_text = trim(concat_ws(' ',
    coalesce(nullif(title, ''), code),
    category,
    array_to_string(keywords, ' '),
    description
  ));

alter table public.maro_prompts
  alter column tool set default 'imazh',
  alter column tool set not null,
  alter column title set not null,
  alter column slug set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'maro_prompts_tool_check'
  ) then
    alter table public.maro_prompts
      add constraint maro_prompts_tool_check check (tool in ('imazh', 'logo', 'web'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'maro_prompts_status_check'
  ) then
    alter table public.maro_prompts
      add constraint maro_prompts_status_check check (status in ('draft', 'published', 'disabled', 'archived'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'maro_prompts_access_level_check'
  ) then
    alter table public.maro_prompts
      add constraint maro_prompts_access_level_check check (access_level in ('free', 'premium'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'maro_prompts_config_object_check'
  ) then
    alter table public.maro_prompts
      add constraint maro_prompts_config_object_check check (jsonb_typeof(config) = 'object');
  end if;
end $$;

create unique index if not exists maro_prompts_slug_idx on public.maro_prompts (slug);
create index if not exists maro_prompts_browse_idx
  on public.maro_prompts (tool, status, active, featured desc, sort_order asc, created_at desc);
create index if not exists maro_prompts_tool_category_idx
  on public.maro_prompts (tool, category, status) where active;

create extension if not exists pg_trgm;
create index if not exists maro_prompts_search_trgm_idx
  on public.maro_prompts using gin (search_text gin_trgm_ops);

create or replace function public.sync_maro_preset_search_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_text := trim(concat_ws(' ',
    coalesce(new.title, new.code),
    new.category,
    array_to_string(new.keywords, ' '),
    new.description
  ));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists maro_prompts_search_text_sync on public.maro_prompts;
create trigger maro_prompts_search_text_sync
before insert or update of title, category, keywords, description
on public.maro_prompts
for each row execute function public.sync_maro_preset_search_text();

alter table public.preset_categories
  add column if not exists tool text;

update public.preset_categories set tool = 'imazh' where tool is null;

alter table public.preset_categories
  alter column tool set default 'imazh',
  alter column tool set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'preset_categories_tool_check'
  ) then
    alter table public.preset_categories
      add constraint preset_categories_tool_check check (tool in ('imazh', 'logo', 'web'));
  end if;
end $$;

alter table public.preset_categories drop constraint if exists preset_categories_slug_key;
create unique index if not exists preset_categories_tool_slug_idx
  on public.preset_categories (tool, slug);
create index if not exists preset_categories_tool_order_idx
  on public.preset_categories (tool, active, sort_order, label);

-- Logo is now a first-class preset consumer in the canonical Engine registry.
update public.tool_engine_config
set preset_support = true, updated_at = now()
where tool_id = 'maro_logo';

-- Two deliberately small, replaceable development records prove Logo/Web
-- browsing, filtering, config loading and handoff without creating a fake library.
insert into public.preset_categories (tool, slug, label, description, sort_order, active)
values
  ('logo', 'minimal', 'Minimal', 'Minimal identity directions.', 10, true),
  ('web', 'landing-page', 'Landing Page', 'Conversion-focused landing pages.', 10, true)
on conflict (tool, slug) do nothing;

insert into public.maro_prompts (
  code, tool, target_tool, title, slug, description, category, full_prompt, keywords,
  config, status, active, featured, sort_order, access_level, search_text
)
values
  (
    'TEMP-LOGO-MINIMAL', 'logo', 'logo', '[TEMP] Minimal Identity', 'temp-minimal-identity',
    'Temporary development preset for validating the maroLogo flow.', 'Minimal',
    'Favor a restrained, ownable identity with intelligent negative space and excellent small-size recognition.',
    array['temporary','minimal','identity'],
    '{"version":1,"logoType":"symbol_wordmark","conceptIntent":"meaning","visualStyle":"minimal_intelligent","presentationMode":"bento","traits":["clear","confident","timeless"]}'::jsonb,
    'published', true, false, 9000, 'free',
    '[TEMP] Minimal Identity Minimal Temporary development preset temporary minimal identity'
  ),
  (
    'TEMP-WEB-LANDING', 'web', 'website', '[TEMP] Editorial Landing', 'temp-editorial-landing',
    'Temporary development preset for validating the maroWeb flow and 16:9 cards.', 'Landing Page',
    'Use an editorial landing-page rhythm with a decisive hero, clear conversion hierarchy and generous whitespace.',
    array['temporary','editorial','landing'],
    '{"version":1,"websiteType":"landing","siteStyle":"editorial minimal","layout":"conversion landing page","useCase":"product launch"}'::jsonb,
    'published', true, false, 9000, 'free',
    '[TEMP] Editorial Landing Landing Page Temporary development preset temporary editorial landing'
  )
on conflict (code) do nothing;

notify pgrst, 'reload schema';
