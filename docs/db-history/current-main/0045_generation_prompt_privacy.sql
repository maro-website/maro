-- Keep original user prompts in public.generations while moving compiled Maro
-- provider prompts into a service-role-only observability table.
create table if not exists public.generation_internal_prompts (
  generation_id uuid primary key references public.generations (id) on delete cascade,
  compiled_prompt text not null,
  created_at timestamptz not null default now()
);

alter table public.generation_internal_prompts enable row level security;

revoke all on table public.generation_internal_prompts from anon, authenticated;
grant select, insert, update, delete on table public.generation_internal_prompts to service_role;

insert into public.generation_internal_prompts (generation_id, compiled_prompt, created_at)
select id, final_prompt, created_at
from public.generations
where final_prompt is not null and btrim(final_prompt) <> ''
on conflict (generation_id) do update
set compiled_prompt = excluded.compiled_prompt;

update public.generations
set final_prompt = null
where final_prompt is not null;

comment on column public.generations.prompt is
  'Original user prompt. May be returned to its owner.';
comment on column public.generations.final_prompt is
  'Deprecated privacy boundary. Compiled prompts live in generation_internal_prompts.';
comment on table public.generation_internal_prompts is
  'Internal compiled Maro prompts. Service role only; never expose to user or MCP APIs.';
