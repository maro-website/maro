# maroMCP v1 implementation report

## A. OAuth result

The OAuth code path, consent UI, ES256/JWKS verification, protected-resource
metadata, bearer challenges, and resource-bound custom access-token hook are
implemented. Migrations 0045 and 0046 are applied and the hook is enabled.
The final live OAuth authorization-code flow awaits owner enablement of the
Supabase OAuth Server and DCR.

## B. Supabase compatibility

- PKCE: S256 advertised.
- DCR: supported after dashboard enablement.
- Issuer: verified.
- JWKS/signing: verified ES256.
- Resource: exact canonical `https://maro.al/api/mcp`.
- Audience: custom hook installed and enabled; live minted-token proof pending.
- Scopes: standard identity scopes; Maro application permissions are signed
  custom claims.
- Consent: production page is live at `https://maro.al/oauth/consent`.

## C. Production deployment

Commit `5987ad8ac1075d4a9248d5173a9ffcfdf872e36d` was fast-forwarded to
`origin/main` with explicit owner approval. Railway production deployment
`6055163713` completed successfully in `spectacular-magic / production` on
2026-08-24. No force push or history rewrite was used.

## D. MCP implementation

Production exposes `/api/mcp` using the official TypeScript SDK, stateless
Streamable HTTP, a 15-second keepalive, a 64-KiB body limit, and dual OAuth
challenge signaling.

## E. Production endpoint validation

- Maro home, `/imazh`, and `/oauth/consent`: HTTP 200.
- Root and path-specific Protected Resource Metadata: HTTP 200 with exact
  resource and issuer.
- Missing bearer token: HTTP 401 `AUTH_REQUIRED` with correct
  `WWW-Authenticate` metadata URL.
- Invalid bearer token: HTTP 401 `AUTH_INVALID` with reconnect challenge.
- MCP initialize: HTTP 200, protocol `2025-06-18`, server `maro-mcp` v1.0.0.
- tools/list: exactly `get_maro_account` and `generate_maro_image` with strict
  schemas, annotations, and auth metadata.
- CORS preflight: HTTP 204 with expected headers.
- Existing image API remains protected: unauthenticated request returns 401.

## F. MCP Inspector

Official MCP Inspector connected to `https://maro.al/api/mcp`. Initialize and
tools/list passed. Missing-token and invalid-token calls returned the expected
OAuth MCP errors and runtime `mcp/www_authenticate` metadata. Authenticated
calls await OAuth Server/DCR enablement.

## G. Tools and image generation

Exactly two tools are exposed. The generation tool resolves the authenticated
Maro actor and active owned workspace, then reuses the canonical maroImazh
compiler, credit, provider, storage, persistence, settlement, and signed-URL
pipeline.

## H. Credits and idempotency

The existing exact-once lifecycle is reused. MCP retries derive a deterministic
idempotency key from OAuth client identity and JSON-RPC call id; a new call id
is a new intentional generation.

## I. Prompt privacy

Migration 0045, strict tool inputs, and allowlisted tool outputs prevent normal
users and MCP clients from reading compiled prompts. Adversarial regression
tests pass.

## J. Automated verification

- Targeted MCP: 24/24 passed.
- Full suite: 556 passed, 11 skipped, 567 total; 54 files passed.
- TypeScript: passed.
- Production build: passed with one pre-existing hook-dependency warning in
  `src/components/app/cards.tsx:491`.

## K. ChatGPT readiness

`READY FOR ONE-TIME OAUTH/CHATGPT SETUP`. Production transport and discovery
are healthy. The only remaining gate is the owner-operated Supabase OAuth
enablement and private ChatGPT connection in `11-MANUAL-ACTIONS.md`.

## L. Git status

Implementation and deployment-report commits are on `feat/maro-mcp-v1` and
were integrated into `main` only by fast-forward. The active GitHub account is
`maro-website`.
