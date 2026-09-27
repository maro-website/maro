-- MARO — cross-device sync for image creations + Explore author avatars
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- ---------------------------------------------------------------------------
-- generations: store the user's per-creation favourite flag + custom title so
-- they sync across devices (the app source of truth for image creations).
-- ---------------------------------------------------------------------------
alter table public.generations
  add column if not exists favourite boolean not null default false;

alter table public.generations
  add column if not exists title text;

-- ---------------------------------------------------------------------------
-- public_creations: author's avatar url (shown on the Explore feed).
-- ---------------------------------------------------------------------------
alter table public.public_creations
  add column if not exists author_avatar text;

notify pgrst, 'reload schema';
