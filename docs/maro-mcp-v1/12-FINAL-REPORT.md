# maroMCP v1 implementation report

## A. OAuth result

Code path, consent UI, ES256/JWKS validation, PRM/challenges and audience hook are implemented. Migrations 0045 and 0046 were confirmed applied successfully on 2026-08-24. The Custom Access Token (JWT) Claims hook was also confirmed enabled with `public.maro_mcp_custom_access_token_hook` on 2026-08-24. Live OAuth remains external because OAuth Server/DCR are not enabled and the MCP branch is not deployed.

## B. Supabase compatibility

- PKCE: `S256` advertised (pass).
- DCR/CIMD: DCR supported after enablement; CIMD not advertised.
- Issuer: proven.
- JWKS/signing: proven ES256.
- Resource: canonical value implemented; OpenAI sends it.
- Audience: hook implemented; live minted-token proof pending.
- Scopes/permissions: standard identity scopes only; signed Maro application permissions.
- Refresh: advertised; hook is based on persistent OAuth `client_id` claim.
- Consent: UI implemented; live flow pending.

## C. MCP implementation

`/api/mcp`, official TypeScript SDK, stateless Streamable HTTP, 15-second keepalive, 64-KiB body limit, initialization/list/call behavior, PRM and dual auth signaling.

## D. Tools

Exactly `get_maro_account` and `generate_maro_image`; schemas in `04-TOOLS.md`.

## E. Authentication

ChatGPT DCR + PKCE → Supabase → Maro consent → ES256 access token → exact resource-server validation → existing Maro user.

## F. Image generation

MCP actor → active owned workspace → canonical maroImazh service → Brain/compiler → credits → provider → storage/persistence/settlement → signed URL.

## G. Credits/idempotency

Existing exact-once lifecycle reused. MCP retry key is deterministic from OAuth client + JSON-RPC call id. New intentional call id creates a new generation.

## H. Prompt privacy

Migration 0045, strict inputs and allowlisted outputs prevent normal users/MCP from reading compiled prompts. Adversarial regression tests pass locally.

## I. Railway/tunnel test

No linked staging/CLI was found. Local Next protocol passed. A read-only
production check on 2026-08-24 confirmed that `/api/mcp`, the path-specific PRM,
and `/oauth/consent` all still return 404. Railway HTTPS/buffering/long
generation was not tested because push/deploy was prohibited and OAuth is
disabled.

## J. MCP Inspector

Official `@modelcontextprotocol/inspector@latest` connected to the production build on localhost. Initialize/tools-list passed and found exactly two tools. `get_maro_account` without a token produced `AUTH_REQUIRED` plus `mcp/www_authenticate`; an invalid bearer produced `AUTH_INVALID`. Inspector reports `isError` calls with exit 1 as expected. Authenticated account/generation could not run because live OAuth discovery is 404 and no resource-bound token can be minted yet.

## K. Automated tests

Targeted MCP 24/24. Full suite 556 passed, 11 skipped (567 total), 54 files passed and 1 integration file skipped. TypeScript passed. Production build passed with one pre-existing hook-dependency warning in `src/components/app/cards.tsx:491`.

## L. ChatGPT readiness

`NOT READY` until OAuth Server/DCR are enabled, the branch is deployed, and
minted-audience plus Inspector/ChatGPT live calls pass. Database migrations and
the Custom Access Token Hook are complete.

## M. ACTION NEEDED FROM ERZEN

See `11-MANUAL-ACTIONS.md`.

## N. Files changed

See final Git status/report; all changes remain only in the isolated worktree.

## O. Migrations

0045 and 0046 were confirmed applied successfully, in order, on 2026-08-24.

## P. Git status

Branch `feat/maro-mcp-v1`; no push and no merge.

## Q. Single recommended next step

The next live-E2E gate is deployment of this isolated branch to the canonical
Maro endpoint. It remains deferred while the instruction **do not push, merge,
or publish** is active. The database migrations and Custom Access Token Hook are
already complete. After deployment is separately authorized and completed,
enable OAuth Server/DCR with authorization path `/oauth/consent`.
