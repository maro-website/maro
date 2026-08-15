-- MARO — Multi-studio OS: social, contests, presets extensions
-- Run in Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- public_creations extensions (Explore feed)
-- ---------------------------------------------------------------------------
alter table public.public_creations
  add column if not exists slug text unique,
  add column if not exists remix_of uuid references public.public_creations (id) on delete set null,
  add column if not exists like_count integer not null default 0,
  add column if not exists remix_count integer not null default 0,
  add column if not exists featured boolean not null default false,
  add column if not exists selections jsonb,
  add column if not exists preset_id uuid;

create index if not exists public_creations_slug_idx on public.public_creations (slug);
create index if not exists public_creations_like_count_idx on public.public_creations (like_count desc);
create index if not exists public_creations_featured_idx on public.public_creations (featured) where featured;

-- ---------------------------------------------------------------------------
-- creation_likes
-- ---------------------------------------------------------------------------
create table if not exists public.creation_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  creation_id uuid not null references public.public_creations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creation_id)
);

alter table public.creation_likes enable row level security;

-- ---------------------------------------------------------------------------
-- creator_follows
-- ---------------------------------------------------------------------------
create table if not exists public.creator_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

alter table public.creator_follows enable row level security;

-- ---------------------------------------------------------------------------
-- maro_prompts preset extensions
-- ---------------------------------------------------------------------------
alter table public.maro_prompts
  add column if not exists preset_category text,
  add column if not exists default_selections jsonb,
  add column if not exists marketing boolean not null default false;

create index if not exists maro_prompts_marketing_idx on public.maro_prompts (marketing) where marketing;
create index if not exists maro_prompts_preset_category_idx on public.maro_prompts (preset_category);

-- ---------------------------------------------------------------------------
-- contests
-- ---------------------------------------------------------------------------
create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  prize_label text not null default '',
  prize_credits integer not null default 0,
  cover_url text,
  status text not null default 'open',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists contests_status_idx on public.contests (status, ends_at desc);
alter table public.contests enable row level security;

-- ---------------------------------------------------------------------------
-- contest_submissions
-- ---------------------------------------------------------------------------
create table if not exists public.contest_submissions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  creation_id uuid references public.public_creations (id) on delete set null,
  url text not null,
  prompt text not null default '',
  author text,
  winner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (contest_id, user_id)
);

create index if not exists contest_submissions_contest_idx on public.contest_submissions (contest_id, created_at desc);
alter table public.contest_submissions enable row level security;

-- ---------------------------------------------------------------------------
-- weekly_challenges
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  prompt_hint text not null default '',
  tool_id text not null default 'reklama',
  reward_credits integer not null default 25,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.weekly_challenges enable row level security;

-- ---------------------------------------------------------------------------
-- challenge_entries (leaderboard)
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.weekly_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  creation_id uuid references public.public_creations (id) on delete set null,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists challenge_entries_score_idx on public.challenge_entries (challenge_id, score desc);
alter table public.challenge_entries enable row level security;

-- ---------------------------------------------------------------------------
-- bump_creation_like: atomic like toggle helper
-- ---------------------------------------------------------------------------
create or replace function public.bump_creation_like(p_user uuid, p_creation uuid, p_add boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_add then
    insert into public.creation_likes (user_id, creation_id)
    values (p_user, p_creation)
    on conflict do nothing;
    if found then
      update public.public_creations set like_count = like_count + 1 where id = p_creation
      returning like_count into new_count;
    else
      select like_count into new_count from public.public_creations where id = p_creation;
    end if;
  else
    delete from public.creation_likes where user_id = p_user and creation_id = p_creation;
    if found then
      update public.public_creations set like_count = greatest(0, like_count - 1) where id = p_creation
      returning like_count into new_count;
    else
      select like_count into new_count from public.public_creations where id = p_creation;
    end if;
  end if;
  return coalesce(new_count, 0);
end;
$$;

notify pgrst, 'reload schema';
