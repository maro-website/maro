# Supabase OAuth 2.1 validation

Official sources checked 2026-08-24:

- https://developers.openai.com/plugins/build/auth
- https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- https://supabase.com/docs/guides/auth/oauth-server/getting-started
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- https://supabase.com/docs/guides/auth/oauth-server/token-security
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook

## Live project evidence

Project ref: `pbhzobqpavkuttdipjaq`.

- JWKS returned one public `ES256` P-256 verification key. Asymmetric signing is already correct; no key rotation is needed.
- OIDC discovery returned issuer `https://pbhzobqpavkuttdipjaq.supabase.co/auth/v1`, authorization/token/UserInfo/JWKS endpoints, code flow, refresh tokens, public client method `none`, and PKCE `S256` (plus `plain`). Maro/ChatGPT requires `S256`.
- Supported identity scopes are `openid profile email phone offline_access`.
- OAuth authorization-server discovery currently returns 404. OAuth Server is not enabled yet.

## Resource/audience compatibility

OpenAI sends `resource=https://maro.al/api/mcp` on authorization and token requests and expects a resource-bound token. Current Supabase documentation establishes `client_id`, default `aud=authenticated`, and Custom Access Token Hooks for changing `aud`; it does not document that the incoming RFC 8707 `resource` is automatically echoed.

The smallest compatibility layer is migration `0046_maro_mcp_oauth_claims.sql`. On Supabase OAuth-server tokens (detected by verified `client_id`) it sets:

```json
{
  "aud": "https://maro.al/api/mcp",
  "maro_mcp": true,
  "maro_mcp_permissions": ["account:read", "image:generate"]
}
```

Direct Maro sessions have no OAuth-server `client_id` and remain `aud=authenticated`. Refresh issuance preserves the OAuth client claim and passes the hook again. The MCP resource server rejects missing/wrong issuer, audience, subject, expiry, client, gate, or permission.

This is code-complete but not yet proven with a newly minted live OAuth token because OAuth Server and the hook are disabled. That live token is the hard gate after the manual dashboard actions.

## Scopes versus permissions

Supabase explicitly says its OIDC scopes control identity data, not database/business access. Therefore Maro does not invent `maro:*` OAuth scopes. Tool `securitySchemes` uses `oauth2` with an empty application-scope list; ChatGPT can still request the standard identity scopes advertised by Supabase. Actual tool authorization is the signed `maro_mcp_permissions` claim plus existing account/workspace/entitlement/credit/rate-limit checks. Consent renders Supabase's exact requested scope string.

## Client registration

Supabase does not advertise CIMD support in current discovery. Private V1 therefore uses DCR, enabled only after consent exists. DCR lets any compatible client register, so explicit user consent is mandatory; registered clients must be reviewed under Authentication > OAuth Apps and authorization/DCR attempts monitored. Supabase validates exact redirect URIs. If future metadata advertises CIMD safely, prefer ChatGPT's CIMD and disable DCR after a measured migration.

## Token validation

`getClaims(token)` verifies ES256 against cached JWKS; `getUser(token)` confirms the live existing Maro user. Only after signature validation are issuer, `exp`/`nbf`, `aud`, `sub`, `client_id`, `maro_mcp`, and permissions trusted.
