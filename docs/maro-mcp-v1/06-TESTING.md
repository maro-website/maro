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

## Remaining measured tests

Live OAuth, authenticated account/generation, Inspector authenticated calls, Railway buffering/keepalive, signed asset rendering, and ChatGPT Developer Mode require the manual Supabase enablement/migrations first. Do not claim these passed until recorded with a real minted token.

## Final local verification

- Targeted MCP: 24/24 passed.
- Full suite: 556 passed, 11 skipped, 567 total; 54 files passed, 1 integration file skipped.
- TypeScript: passed with `tsc --noEmit`.
- Production build: passed; it includes all MCP/PRM/consent routes. One pre-existing React hook dependency warning remains in `src/components/app/cards.tsx:491`.
- Official MCP Inspector: tools/list passed; missing-token and invalid-token calls returned the expected OAuth MCP errors. Authenticated calls remain blocked by disabled live OAuth.
