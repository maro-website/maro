-- An accounted, completed rejection is not still running. Explicit fresh requests may retry.
-- Running/uncertain work, same-request replay, private cache, locks and all spend caps stay protected.
CREATE OR REPLACE FUNCTION public.maro_optimizer_reserve(p_user uuid, p_workspace text, p_request_key text, p_fingerprint text, p_module text, p_source_chars integer, p_reserved_usd numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.maro_optimizer_attempts; user_day numeric; user_month numeric; global_day numeric; global_month numeric;
begin
  if p_reserved_usd is null or p_reserved_usd <= 0 or p_reserved_usd > 1 or p_source_chars < 0
    or p_request_key is null or length(p_request_key) not between 1 and 128
    or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or p_module not in ('reklama','logo') then raise exception 'invalid_optimizer_admission'; end if;
  if p_workspace is not null and not exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user)
    then raise exception 'workspace_forbidden'; end if;
  perform pg_advisory_xact_lock(hashtext('maro_optimizer_budget'));
  if not exists(select 1 from public.app_settings where id=1 and not coalesce(ai_paused,false)
    and not coalesce((platform_limits->>'aiPaused')::boolean,false)
    and not coalesce((platform_limits->'pausedModules') ? p_module,false)) then return jsonb_build_object('action','paused'); end if;

  select * into r from public.maro_optimizer_attempts where user_id=p_user and request_key=p_request_key;
  if found then
    if r.fingerprint<>p_fingerprint then return jsonb_build_object('action','conflict'); end if;
    if r.status='completed' then return jsonb_build_object('action','cache','id',r.id,'final_prompt',r.final_prompt); end if;
    return jsonb_build_object('action',case when r.status='running' and r.created_at>now()-interval '2 minutes' then 'busy' else 'failed' end);
  end if;
  select * into r from public.maro_optimizer_attempts where user_id=p_user and fingerprint=p_fingerprint
    and workspace_id is not distinct from p_workspace and created_at>now()-interval '7 days' and status='completed'
    order by created_at desc limit 1;
  if found then
    update public.maro_optimizer_attempts set cache_hits=cache_hits+1 where id=r.id;
    return jsonb_build_object('action','cache','id',r.id,'final_prompt',r.final_prompt);
  end if;
  if exists(select 1 from public.maro_optimizer_attempts where user_id=p_user and fingerprint=p_fingerprint
    and created_at>now()-interval '2 minutes' and (status <> 'rejected' or estimated_usd is null or finished_at is null)) then return jsonb_build_object('action','busy'); end if;

  select coalesce(sum(coalesce(estimated_usd,reserved_usd)) filter(where user_id=p_user and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0),
    coalesce(sum(coalesce(estimated_usd,reserved_usd)) filter(where user_id=p_user),0),
    coalesce(sum(coalesce(estimated_usd,reserved_usd)) filter(where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0),
    coalesce(sum(coalesce(estimated_usd,reserved_usd)),0)
    into user_day,user_month,global_day,global_month from public.maro_optimizer_attempts
    where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  -- Pilot caps, USD: $2/user/day, $20/user/month, $20/platform/day, $200/platform/month.
  if user_day+p_reserved_usd>2 or user_month+p_reserved_usd>20 or global_day+p_reserved_usd>20 or global_month+p_reserved_usd>200
    then return jsonb_build_object('action','budget'); end if;
  insert into public.maro_optimizer_attempts(user_id,workspace_id,request_key,fingerprint,module,source_chars,reserved_usd)
    values(p_user,p_workspace,p_request_key,p_fingerprint,p_module,p_source_chars,p_reserved_usd) returning * into r;
  return jsonb_build_object('action','run','id',r.id);
end;
$function$
