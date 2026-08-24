# Current OpenAI requirements

Official documentation checked 2026-08-24:

- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization

## Required contract

- MCP Streamable HTTP, not the legacy standalone SSE transport.
- Protected Resource Metadata (RFC 9728) and a discoverable OAuth/OIDC authorization server.
- OAuth authorization-code flow with PKCE `S256`.
- The exact protected-resource `resource` value on authorization and token requests, then an access token bound to that value (normally `aud`).
- Verification of signature, issuer, audience/resource, expiry/not-before, client identity where relevant, scopes/application permissions, and the existing user.
- Per-tool `securitySchemes` plus runtime `_meta["mcp/www_authenticate"]`; HTTP 401 alone is not enough for ChatGPT's linking UI.
- `WWW-Authenticate` pointing to Protected Resource Metadata.
- CIMD, DCR, or a predefined client. CIMD is preferred when the authorization server advertises it; DCR remains supported.
- Tool schemas and annotations must reflect actual read/write/external effects.
- Raw HTTPS endpoint or Secure MCP Tunnel must work in Developer Mode before plugin packaging.

## Maro values

- MCP endpoint/resource: `https://maro.al/api/mcp`
- Path-specific PRM: `https://maro.al/.well-known/oauth-protected-resource/api/mcp`
- Root PRM compatibility alias: `https://maro.al/.well-known/oauth-protected-resource`
- Authorization server issuer: `https://pbhzobqpavkuttdipjaq.supabase.co/auth/v1`

The server mirrors the current OpenAI `securitySchemes` extension in tool `_meta` because MCP SDK 1.30.0 does not yet type/serialize that top-level extension through its high-level registration API. The low-level official SDK server is used so both forms are emitted.
