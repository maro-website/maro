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

## Action 2 — create an isolated Railway private-test endpoint ⏳ dashboard gate

**Where**

Railway project `spectacular-magic` (`cb4c8dcc-712d-459d-b01c-96ae9ad29814`).

**Do**

Open Railway Project Settings → Environments and confirm whether either an
isolated persistent staging environment or PR Environments is enabled. Do not
deploy over the existing `spectacular-magic / production` environment.

**Current result**

Commit `b0557d628dbf266f30fd72eaed4acc742850c726` was pushed only to
`origin/feat/maro-mcp-v1`. GitHub history proves that the existing Railway
service deploys `main` to `spectacular-magic / production`; the feature-branch
push did not trigger a Railway deployment. No Railway CLI link or token exists
locally, so the project's isolated-environment setting must be checked in the
dashboard before proceeding.

Read-only production verification on 2026-08-24 returned 404 for all three
required routes: `/api/mcp`,
`/.well-known/oauth-protected-resource/api/mcp`, and `/oauth/consent`.

**Values after an isolated hostname exists**

- Staging MCP URL: `https://<isolated-host>/api/mcp`
- Staging `MARO_MCP_RESOURCE_URL`: exactly the staging MCP URL
- Production MCP URL remains `https://maro.al/api/mcp`

The Supabase access-token hook must mint exactly the same single audience as
the environment under test. Do not accept both audiences and do not enable
OAuth until the isolated hostname is known and the hook transition is prepared.

**Why**

Supabase's authorization UI is Site URL + `/oauth/consent`; ChatGPT needs public HTTPS Streamable HTTP.

**Send back**

Screenshot of Project Settings → Environments showing either the existing
staging environment or the PR Environments setting. Do not send variables or
tokens and do not press a production deploy button.

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
