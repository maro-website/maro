-- maroMCP OAuth access-token boundary.
--
-- Supabase's OAuth/OIDC scopes describe identity data; they are not Maro
-- business permissions. For OAuth-server tokens (identified by client_id),
-- bind the access token to the one protected MCP resource and add an explicit
-- application permission claim. Direct Maro browser sessions are unchanged.
--
-- Deployment gate: after applying this migration, enable this function as the
-- Custom Access Token Hook in Supabase Auth before enabling the MCP endpoint.

create or replace function public.maro_mcp_custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
begin
  claims := coalesce(event -> 'claims', '{}'::jsonb);

  -- client_id is present on Supabase OAuth 2.1 Server access tokens, including
  -- refreshes. Social-login/direct application sessions do not cross this gate.
  if nullif(claims ->> 'client_id', '') is not null then
    claims := jsonb_set(
      claims,
      '{aud}',
      to_jsonb('https://maro.al/api/mcp'::text),
      true
    );
    claims := jsonb_set(claims, '{maro_mcp}', 'true'::jsonb, true);
    claims := jsonb_set(
      claims,
      '{maro_mcp_permissions}',
      '["account:read", "image:generate"]'::jsonb,
      true
    );
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;

grant execute on function public.maro_mcp_custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke execute on function public.maro_mcp_custom_access_token_hook(jsonb)
  from public, anon, authenticated;

comment on function public.maro_mcp_custom_access_token_hook(jsonb) is
  'Binds Supabase OAuth Server tokens to https://maro.al/api/mcp and grants the private maroMCP V1 application permissions; direct Maro sessions are unchanged.';
