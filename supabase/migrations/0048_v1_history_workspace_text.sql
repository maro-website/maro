-- Correct 0047's workspace cast. Canonical Maro workspace IDs are text (0016/0017).
-- Preserve the applied migration and all existing jobs, balances and ledger history.
begin;
create or replace function public.persist_v1_image_generation(p_job_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs; s jsonb; g public.generations; path text; ref text; workspace text;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' or j.status not in ('reserved','processing','completed') then raise exception 'invalid_persistence_state'; end if;
  select * into g from public.generations where job_id=p_job_id;
  if g.id is not null then return g.id; end if;
  if j.status='completed' or j.metadata#>>'{v1_lifecycle,phase}' is distinct from 'provider_succeeded' then raise exception 'provider_result_missing'; end if;
  s := j.metadata->'v1_request';
  path := j.user_id::text||'/'||j.id::text||'/output.png'; ref := 'storage:generations/'||path;
  if not exists(select 1 from storage.objects where bucket_id='generations' and name=path and coalesce((metadata->>'size')::bigint,0)>0) then raise exception 'durable_output_missing'; end if;
  if s->>'userId' is distinct from j.user_id::text or s->>'registryToolId' is distinct from j.module or s#>>'{model,providerModelId}' is distinct from j.model or (s->>'imageCount')::integer is distinct from 1 then raise exception 'invalid_generation_snapshot'; end if;
  workspace := nullif(s->>'workspaceId','');
  if workspace is not null and not exists(select 1 from public.workspaces where id=workspace and owner_id=j.user_id) then raise exception 'invalid_generation_workspace'; end if;
  insert into public.generations(job_id,user_id,user_email,tool_id,model,kind,prompt,final_prompt,credits_spent,output_urls,selections,workspace_id)
    values(j.id,j.user_id,(select email from public.profiles where id=j.user_id),j.module,j.model,'image',s->>'prompt','',0,array[ref],coalesce(s->'selections','{}'::jsonb),workspace) returning * into g;
  update public.generation_jobs set metadata=jsonb_set(metadata,'{v1_lifecycle}',coalesce(metadata->'v1_lifecycle','{}'::jsonb)||jsonb_build_object('phase','persisted','generation_id',g.id)) where id=j.id;
  return g.id;
end $$;
create or replace function public.v1_image_lifecycle_version() returns integer language sql security definer set search_path=public as $$ select 2 $$;
revoke all on function public.persist_v1_image_generation(uuid), public.v1_image_lifecycle_version() from public,anon,authenticated;
grant execute on function public.persist_v1_image_generation(uuid), public.v1_image_lifecycle_version() to service_role;
notify pgrst,'reload schema';
commit;
