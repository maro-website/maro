-- MARO — Scope generations to workspaces

alter table public.generations
  add column if not exists workspace_id text references public.workspaces (id) on delete set null;

create index if not exists generations_workspace_idx
  on public.generations (user_id, workspace_id, created_at desc);

-- Backfill from active workspace, then first owned workspace.
update public.generations g
set workspace_id = p.active_workspace_id
from public.profiles p
where g.user_id = p.id
  and g.workspace_id is null
  and p.active_workspace_id is not null;

update public.generations g
set workspace_id = sub.id
from (
  select distinct on (w.owner_id) w.owner_id, w.id
  from public.workspaces w
  order by w.owner_id, w.sort_order asc, w.created_at asc
) sub
where g.user_id = sub.owner_id
  and g.workspace_id is null;

notify pgrst, 'reload schema';
