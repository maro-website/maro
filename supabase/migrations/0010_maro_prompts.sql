-- MARO — maro Prompts (curated prompt catalog)
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).
--
-- Concept:
--  * Admin curates prompts (featured image, category, keywords, one target tool,
--    and a hidden full prompt). Each prompt has a unique searchable code.
--  * Users browse metadata only. "+maro" attaches the prompt to a tool (free,
--    hidden). "Reveal & copy" costs credits once and unlocks the raw text for
--    that user forever.
--  * The raw `full_prompt` must never reach the browser except via the paid
--    reveal endpoint (service role), so RLS is enabled with no public policies.

-- ---------------------------------------------------------------------------
-- maro_prompts: the curated catalog. Service-role only (no public policies).
-- ---------------------------------------------------------------------------
create table if not exists public.maro_prompts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category text not null default '',
  featured_url text,
  full_prompt text not null default '',
  keywords text[] not null default '{}',
  target_tool text not null default 'logo',
  active boolean not null default true,
  reveal_count integer not null default 0,
  use_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists maro_prompts_created_at_idx
  on public.maro_prompts (created_at desc);
create index if not exists maro_prompts_category_idx
  on public.maro_prompts (category);
create index if not exists maro_prompts_active_idx
  on public.maro_prompts (active);

alter table public.maro_prompts enable row level security;

-- ---------------------------------------------------------------------------
-- prompt_likes: per-user likes (cross-device). Service-role writes via API.
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid not null references public.maro_prompts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

alter table public.prompt_likes enable row level security;

-- ---------------------------------------------------------------------------
-- prompt_reveals: records paid unlocks (10 credits) so a user can re-copy the
-- raw prompt forever without paying again. Service-role writes via API.
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_reveals (
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid not null references public.maro_prompts (id) on delete cascade,
  credits_spent integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

create index if not exists prompt_reveals_created_at_idx
  on public.prompt_reveals (created_at desc);

alter table public.prompt_reveals enable row level security;

-- ---------------------------------------------------------------------------
-- reveal_prompt: atomically unlock a prompt for a user.
--   Returns: 'owned'  -> user already revealed it (no charge)
--            'ok'     -> charged p_cost and recorded the reveal
--            'insufficient' -> not enough credits
--            'missing'      -> prompt does not exist / inactive
-- ---------------------------------------------------------------------------
create or replace function public.reveal_prompt(
  p_user uuid,
  p_prompt uuid,
  p_cost integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  already boolean;
  exists_prompt boolean;
  new_balance integer;
begin
  select exists (
    select 1 from public.maro_prompts where id = p_prompt and active
  ) into exists_prompt;
  if not exists_prompt then
    return 'missing';
  end if;

  select exists (
    select 1 from public.prompt_reveals where user_id = p_user and prompt_id = p_prompt
  ) into already;
  if already then
    return 'owned';
  end if;

  -- Charge atomically (only if enough credits).
  update public.profiles
    set credits = credits - p_cost
    where id = p_user and credits >= p_cost
    returning credits into new_balance;

  if new_balance is null then
    return 'insufficient';
  end if;

  insert into public.prompt_reveals (user_id, prompt_id, credits_spent)
  values (p_user, p_prompt, p_cost)
  on conflict (user_id, prompt_id) do nothing;

  update public.maro_prompts
    set reveal_count = reveal_count + 1
    where id = p_prompt;

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- bump_prompt_use: increment the use counter when a prompt is attached to a
-- generation (+maro). Best-effort, called with the service role.
-- ---------------------------------------------------------------------------
create or replace function public.bump_prompt_use(p_prompt uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.maro_prompts set use_count = use_count + 1 where id = p_prompt;
$$;

notify pgrst, 'reload schema';
