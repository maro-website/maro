-- Additive signup policy. No customer-table rewrite or new auth.users trigger.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '10s';

create schema maro_auth_hooks;
revoke all on schema maro_auth_hooks from public, anon, authenticated, service_role;
grant usage on schema maro_auth_hooks to supabase_auth_admin;

create function maro_auth_hooks.before_user_created(event jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $hook$
declare
  email_domain text := lower(rtrim(btrim(split_part(coalesce(event->'user'->>'email', ''), '@', 2)), '.'));
  denied_domains constant text[] := array[
    'mailinator.com',
    'guerrillamail.com',
    'guerrillamail.de',
    'guerrillamail.net',
    'guerrillamail.org',
    'guerrillamail.biz',
    'guerrillamailblock.com',
    'sharklasers.com',
    'grr.la',
    'pokemail.net',
    'spam4.me',
    'tempmail.com',
    'temp-mail.org',
    'throwaway.email',
    'yopmail.com',
    'yopmail.fr',
    'yopmail.net',
    'trashmail.com',
    'getnada.com',
    'maildrop.cc',
    'dispostable.com',
    '10minutemail.com',
    'fakeinbox.com',
    'mintemail.com',
    'emailondeck.com',
    'tempail.com',
    'burnermail.io',
    'playfine.com'
  ];
begin
  if event->'user'->'is_anonymous' = 'true'::jsonb then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Anonymous signup is not available.'));
  end if;
  -- Supabase validates address syntax. Preserve existing non-email provider flows.
  if email_domain = '' then return '{}'::jsonb; end if;
  if email_domain in ('localhost','test','invalid','example','example.com','example.net','example.org')
    or email_domain ~ '\.(test|invalid|localhost|example)$'
    or exists (select 1 from unnest(denied_domains) as blocked(domain)
      where email_domain = blocked.domain or right(email_domain, length(blocked.domain) + 1) = '.' || blocked.domain)
  then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Temporary and test email addresses are not allowed.'));
  end if;
  return '{}'::jsonb;
end;
$hook$;
revoke all on function maro_auth_hooks.before_user_created(jsonb) from public, anon, authenticated, service_role;
grant execute on function maro_auth_hooks.before_user_created(jsonb) to supabase_auth_admin;

-- Existing service-only directory: expose Auth's authoritative status to admins.
CREATE OR REPLACE FUNCTION public.admin_user_directory(p_search text DEFAULT ''::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result jsonb; total bigint;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset<0 or length(p_search)>100 then raise exception 'invalid_request'; end if;
  select count(*) into total from profiles p where p_search='' or position(lower(p_search) in lower(coalesce(p.email,'')||' '||coalesce(p.full_name,'')))>0;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'email',coalesce(p.email,''),'full_name',p.full_name,
    'credits',p.credits,'is_creator',p.is_creator,'is_admin',p.is_admin,'access_role',p.access_role,'created_at',p.created_at,
    'emailConfirmedAt',u.email_confirmed_at,'lastSignInAt',u.last_sign_in_at,'bannedUntil',u.banned_until,
    'plan',coalesce(m.plan_id,'free'),'membershipId',m.id,'planExpiresAt',m.expires_at,
    'storageUsedBytes',public.maro_storage_used_internal(p.id),'storageLimitBytes',public.maro_storage_limit_internal(p.id),
    'storageOverrideBytes',(select limit_bytes from user_storage_overrides where user_id=p.id),
    'workspaceCount',(select count(*) from workspaces where owner_id=p.id),'workspaceLimit',public.resolve_workspace_limit_internal(p.id),
    'workspaceOverride',(select workspace_limit from user_workspace_overrides where user_id=p.id)) order by p.created_at desc,p.id),'[]'::jsonb)
    into result from (select * from profiles where p_search='' or position(lower(p_search) in lower(coalesce(email,'')||' '||coalesce(full_name,'')))>0
      order by created_at desc,id limit p_limit offset p_offset) p
    left join auth.users u on u.id=p.id
    left join lateral(select id,plan_id,expires_at from memberships where user_id=p.id and started_at<=now() and expires_at>now() and not suspended
      order by expires_at desc limit 1) m on true;
  return jsonb_build_object('users',result,'total',total);
end;
$function$;
revoke all on function public.admin_user_directory(text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_user_directory(text,integer,integer) to service_role;

notify pgrst, 'reload schema';
commit;
