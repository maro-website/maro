-- Per-option SVG icons for tool composer selectors (admin-managed via Master Prompts).
alter table public.app_settings
  add column if not exists tool_option_icons jsonb not null default '{}'::jsonb;
