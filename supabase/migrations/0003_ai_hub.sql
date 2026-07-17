-- MARO AI Hub — image tools + storage
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- ---------------------------------------------------------------------------
-- app_settings: per-tool master prompts for image tools (logo, reklama, ...)
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column if not exists tool_prompts jsonb not null default '{}'::jsonb;

-- Seed sensible starter prompts (only if empty). Admin can overwrite in the UI.
update public.app_settings
  set tool_prompts = '{
    "logo": "You are Maro Logo, an expert brand & logo designer. From a short description, produce a single, clean, memorable logo concept. Prefer simple vector-style marks, balanced negative space, strong silhouette, limited palette, and no text unless explicitly requested. Avoid clutter and photorealism.",
    "reklama": "You are Maro Reklama, an expert advertising art director. Produce a scroll-stopping social ad creative with clear focal point, strong contrast, and space for a short headline. Modern, premium, on-brand. Avoid clutter and fake logos."
  }'::jsonb
  where id = 1 and (tool_prompts is null or tool_prompts = '{}'::jsonb);

-- Ensure image tool pricing exists inside the pricing json (merge, keep existing).
update public.app_settings
  set pricing = pricing || jsonb_build_object(
    'tools',
    coalesce(pricing->'tools', '{}'::jsonb) || '{"logo": 5, "reklama": 5}'::jsonb
  )
  where id = 1;

-- ---------------------------------------------------------------------------
-- generations: support image generations (tool id, kind, output image URLs)
-- ---------------------------------------------------------------------------
alter table public.generations add column if not exists tool_id text;
alter table public.generations add column if not exists kind text;
alter table public.generations add column if not exists output_urls text[];

-- ---------------------------------------------------------------------------
-- Storage: public bucket for generated images. Writes happen via the service
-- role (bypasses RLS); reads are public so <img> tags work directly.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('generations', 'generations', true)
on conflict (id) do nothing;

drop policy if exists "generations_public_read" on storage.objects;
create policy "generations_public_read" on storage.objects
  for select using (bucket_id = 'generations');

-- Refresh PostgREST schema cache so new columns are visible immediately.
notify pgrst, 'reload schema';
