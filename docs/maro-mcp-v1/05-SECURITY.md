# Security model

## Authentication and authorization

- Tool listing is public so ChatGPT can discover OAuth metadata; tool execution is protected.
- GET/DELETE without a valid bearer token returns 401 and RFC `WWW-Authenticate`.
- MCP tool auth failures also return `_meta["mcp/www_authenticate"]`.
- JWT signature is verified before claims are used. Exact issuer, audience/resource, expiry/not-before, subject, OAuth `client_id`, Maro gate, and per-tool permission are checked.
- The verified subject is mapped to the existing Supabase/Maro user.

## Data and workspace isolation

- Tool schemas reject all additional fields, including workspace/user/provider/model/config/reference URL selectors.
- Active workspace is resolved and owner-validated server-side. Stale/foreign profile state is repaired to an owned workspace.
- Image references are not exposed in V1. Existing canonical reference resolution remains owner-bound.

## Prompt privacy

- MCP never accepts system/master/final prompt fields.
- The adapter receives only canonical final success/error envelopes and allowlists its own output.
- `data:` images, raw storage references, internal ids, provider errors, SQL, stack/file/env details, and prompt fields are omitted.
- Migration 0045 removes compiled prompts from user-readable generation rows.
- Injection attempts are rejected by existing abuse detection; even if phrased as a normal request, no response path reads internal prompt storage.

## Abuse and financial safety

- Existing per-user/IP/module rate limits, concurrency, circuit breaker, budget gates, email verification, credits, and refunds apply.
- MCP request body is capped at 64 KiB; generation request text at 4,000 characters before the stricter canonical platform limit.
- MCP idempotency is `client digest + JSON-RPC call id`. A transport retry reuses the same key; a new user-requested call has a new id.
- DCR is private-test only and requires explicit consent, client inspection, and existing platform/network rate limiting. Public rollout requires dedicated DCR registration monitoring/rate controls or CIMD.

## Stable errors

Only these user categories are emitted: `AUTH_REQUIRED`, `AUTH_INVALID`, `INSUFFICIENT_PERMISSION`, `NO_ACTIVE_WORKSPACE`, `INSUFFICIENT_CREDITS`, `RATE_LIMITED`, `INVALID_REQUEST`, `GENERATION_FAILED`, `SERVICE_UNAVAILABLE`.
