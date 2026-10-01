# Architecture

```text
ChatGPT
  -> GET Maro Protected Resource Metadata
  -> Supabase OAuth 2.1 discovery + DCR
  -> Maro login and /oauth/consent
  -> Supabase code + PKCE token exchange
  -> ES256 access token (aud=https://maro.al/api/mcp)
  -> POST https://maro.al/api/mcp
  -> JWKS signature verification + fresh Supabase user lookup
  -> MCP tool permission claim
  -> active workspace owner resolver
  -> canonical maroImazh application service
  -> private Maro compiler/Brain/Fort
  -> existing credits/idempotency/rate limits
  -> OpenAI image provider
  -> private Supabase Storage + signed URL
  -> sanitized MCP result
```

## Runtime

Next.js remains the only runtime. `@modelcontextprotocol/sdk` 1.30.0 provides the protocol server and Web Standard Streamable HTTP transport. Each HTTP request uses a stateless transport; initialization, discovery, and calls are standard MCP. Tool discovery is available before OAuth so ChatGPT can learn auth metadata. Tool execution remains protected.

The transport sends SSE keepalive frames every 15 seconds while a long call is open. Generation stays synchronous for V1. No polling tool or async job API is added until Inspector/Railway/ChatGPT measures a real connection failure.

## Boundaries

- Identity: existing Supabase user only; no second user table.
- Workspace: server-side active workspace only; no caller selector.
- Prompt: compiled only inside canonical service; never an MCP field/result.
- Financial: canonical orchestrator only.
- Storage: private object ref stays internal; MCP receives one HTTPS signed URL, currently valid for 3,600 seconds.
- Modules: only maroImazh. No logo/web/video/audio/context tool.
