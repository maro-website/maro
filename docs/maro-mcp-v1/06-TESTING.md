# Testing record

## Automated coverage

New MCP tests cover:

- initialize and server capabilities;
- exact two-tool discovery, strict schemas, auth metadata, annotations;
- Protected Resource Metadata and challenges;
- valid resource-bound actor;
- expired token claims, wrong issuer, wrong audience, wrong subject, invalid client/gate, missing permissions;
- missing/invalid auth runtime results;
- valid account call;
- generation schema, foreign workspace/provider field rejection;
- deterministic MCP retry idempotency key;
- direct canonical maroImazh adapter mapping;
- safe HTTPS image result and rejection of base64-only results;
- safe error mapping for credits, rate limit, service/provider failures;
- non-disclosure of storage refs, ids, SQL/provider data, and final prompts.

Phase 0–3 tests additionally cover UI adapter parity, active workspace owner validation, canonical credit/refund/idempotency behavior, and prompt-storage privacy.

## Local protocol check

On 2026-08-24, Next.js dev on port 3006 returned:

- path-specific PRM 200 with exact production resource and Supabase issuer;
- root PRM alias 200;
- unauthenticated `GET /api/mcp` 401 with `WWW-Authenticate`;
- MCP initialize 200 over Streamable HTTP/SSE;
- tools/list with exactly two tools and both security-scheme representations;
- unauthenticated tools/call with HTTP challenge header and runtime `mcp/www_authenticate`;
- `/oauth/consent?authorization_id=test` rendered 200.

## Production protocol check

On 2026-08-24, the Railway production deployment returned:

- both Protected Resource Metadata endpoints: 200 with exact resource/issuer;
- missing and invalid bearer requests: 401 with the expected OAuth challenges;
- MCP initialize: 200 over Streamable HTTP/SSE, protocol `2025-06-18`;
- tools/list: exactly the two intended tools and auth metadata;
- CORS preflight: 204;
- consent route: 200.

Official MCP Inspector connected to the production URL and passed initialize
and tools/list. Missing-token and invalid-token calls returned the expected
OAuth MCP errors. Railway deployment `6055163713` completed successfully.

## Remaining measured tests

Live minted-token claims, authenticated Inspector/account/generation calls,
signed asset rendering, and private ChatGPT Developer Mode require the owner to
enable the Supabase OAuth Server/DCR and authorize the connection. Do not claim
these passed until recorded with a real OAuth grant.

## Final local verification

- Targeted MCP: 24/24 passed.
- Full suite after the brand-context correction: 562 passed, 11 skipped, 573 total; 55 files passed, 1 integration file skipped.
- TypeScript: passed with `tsc --noEmit`.
- Production build: passed; it includes all MCP/PRM/consent routes. One pre-existing React hook dependency warning remains in `src/components/app/cards.tsx:491`.
- Official MCP Inspector: production tools/list passed; missing-token and invalid-token calls returned the expected OAuth MCP errors. Authenticated calls remain blocked by disabled live OAuth.
