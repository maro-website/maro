# ACTION NEEDED FROM ERZEN

These are external dashboard/deployment actions. Complete in order. Do not enable OAuth before migrations 0045/0046 and the consent route are deployed together.

## Action 1 — deploy database migrations ✅ completed 2026-08-24

**Where**

The established Supabase migration pipeline for project `pbhzobqpavkuttdipjaq`; if no pipeline is available: Supabase Dashboard → SQL Editor.

**Do**

Apply `0045_generation_prompt_privacy.sql`, verify success, then apply `0046_maro_mcp_oauth_claims.sql`. Do not reverse the order.

**Value**

Exact files in `supabase/migrations/`.

**Why**

0045 closes the compiled-prompt leak before MCP; 0046 creates the resource-bound OAuth claim hook.

**Result**

Erzen confirmed that `0045_generation_prompt_privacy.sql` and
`0046_maro_mcp_oauth_claims.sql` were both applied successfully, in order.

## Action 2 — deploy this branch to the canonical private-test endpoint ⏸ deferred

**Where**

Existing Railway Maro service/deployment workflow.

**Do**

Deploy the reviewed `feat/maro-mcp-v1` changes so `https://maro.al/oauth/consent`, both PRM routes, and `https://maro.al/api/mcp` are live. This requires a separate authorization because this pass was explicitly prohibited from pushing/merging.

**Current constraint**

The active instruction is **do not push, merge, or publish**. No Railway deploy
or public tunnel may be created under that constraint. This is now the hard gate
for live OAuth and private ChatGPT E2E.

Read-only production verification on 2026-08-24 returned 404 for all three
required routes: `/api/mcp`,
`/.well-known/oauth-protected-resource/api/mcp`, and `/oauth/consent`.

**Value**

Railway variable: `MARO_MCP_RESOURCE_URL=https://maro.al/api/mcp`.

**Why**

Supabase's authorization UI is Site URL + `/oauth/consent`; ChatGPT needs public HTTPS Streamable HTTP.

**Send back**

Deployment URL/commit and HTTP status for the consent route, PRM, and unauthenticated MCP challenge. Do not send environment values or tokens.

## Action 3 — enable the Custom Access Token Hook ✅ completed 2026-08-24

**Where**

Supabase Dashboard → Authentication → Hooks → Custom Access Token → Postgres function.

**Do**

Select and enable `public.maro_mcp_custom_access_token_hook`.

**Value**

Function: `public.maro_mcp_custom_access_token_hook`.

**Why**

It changes only OAuth-server tokens from default `aud=authenticated` to the exact Maro MCP audience and signed application permissions.

**Result**

Dashboard evidence confirms that the Customize Access Token (JWT) Claims hook
is **ENABLED** with type `Postgres function`, schema `public`, and function
`maro_mcp_custom_access_token_hook`.

## Action 4 — enable Supabase OAuth 2.1 and DCR

**Where**

Supabase Dashboard → Authentication → OAuth Server.

**Do**

Enable OAuth 2.1 Server; set Authorization Path; enable Dynamic Client Registration. Keep explicit consent required. Do not rotate JWT keys.

**Value**

- Authorization Path: `/oauth/consent`
- Dynamic Client Registration: enabled
- Existing signing algorithm: keep `ES256`

**Why**

Live discovery is currently 404. ChatGPT needs DCR, PKCE and Maro consent; ES256 is already correct.

**Send back**

Screenshot/status of OAuth Server, Authorization Path and DCR toggles, plus the JSON field names (not secrets) from `https://pbhzobqpavkuttdipjaq.supabase.co/.well-known/oauth-authorization-server/auth/v1`.

## Action 5 — authorize the final private ChatGPT test

**Where**

ChatGPT → Settings → Security and login → Developer mode → ChatGPT Plugins → plus.

**Do**

Follow `07-CHATGPT-PRIVATE-SETUP.md` with URL `https://maro.al/api/mcp`, connect through Maro consent, then run `08-OPENAI-TEST-CASES.md`.

**Value**

Name `Maro (private)`; endpoint `https://maro.al/api/mcp`.

**Why**

ChatGPT account interaction and final consent require the owner.

**Send back**

Connection status, discovered tool names, exact OAuth error if any, and test outcomes. Never send access/refresh tokens.
