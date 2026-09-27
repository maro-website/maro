-- MARO — Workspace brand profile + logo tool prompt fragments

alter table public.workspaces
  add column if not exists brand_name text,
  add column if not exists brand_logo_url text,
  add column if not exists brand_primary_color text default '#253FDA',
  add column if not exists brand_secondary_color text default '#0B0B0B',
  add column if not exists brand_background_color text default '#FFFFFF',
  add column if not exists brand_text_color text default '#0B0B0B';

-- Seed logo option fragments for composeToolPrompt (logo.type.*, logo.present.*)
update public.app_settings
set tool_prompts = coalesce(tool_prompts, '{}'::jsonb) || '{
  "logo.type.typography": "Create a wordmark-only logo using refined typography. No icon or symbol — focus on letterforms, kerning and balance.",
  "logo.type.symbol": "Create a symbol-only mark with no text. Strong silhouette, memorable shape, works at small sizes.",
  "logo.type.both": "Combine a distinct symbol with a complementary wordmark. Symbol and typography should feel unified.",
  "logo.present.bw": "Present as a clean black-and-white logo on a plain white background with generous padding.",
  "logo.present.color": "Present in full brand colors on a plain background with generous padding.",
  "logo.present.bento": "Present as a bento-style grid showing logo variants and color swatches.",
  "logo.present.mockup": "Present the logo applied on a realistic product or signage mockup."
}'::jsonb
where id = 1;

notify pgrst, 'reload schema';
