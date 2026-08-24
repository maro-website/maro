# ACTION NEEDED FROM ERZEN

Production code, database migrations, the JWT claims hook, Railway deployment,
public endpoint checks, and unauthenticated MCP Inspector checks are complete.
The remaining work is one owner-operated setup sequence because it changes
Supabase OAuth settings and connects the owner's private ChatGPT account.

Complete this checklist in order. Do not send access tokens, refresh tokens,
JWTs, client secrets, or Supabase secrets.

## 1 — Verify the Supabase Site URL

**Where**

Supabase project `pbhzobqpavkuttdipjaq` → Authentication → URL Configuration.

**Do**

Confirm the Site URL. If it differs, set it to the exact value below and save.
Do not remove existing redirect URLs.

**Exact value**

`https://maro.al`

**Why**

Supabase combines the Site URL with the OAuth Authorization Path to open the
Maro consent page.

## 2 — Enable the Supabase OAuth server for MCP

**Where**

Supabase project `pbhzobqpavkuttdipjaq` → Authentication → OAuth Server.

**Do**

1. Enable OAuth 2.1 Server.
2. Set Authorization Path to `/oauth/consent`.
3. Enable Dynamic Client Registration.
4. Keep explicit user consent required if that option is shown.
5. Save the settings.

Do not create a fixed/manual OAuth client for ChatGPT. Do not rotate JWT keys.
Keep the existing ES256 signing key. Keep Authentication → Auth Hooks →
Customize Access Token enabled on
`public.maro_mcp_custom_access_token_hook`.

**Expected identifiers**

- Issuer: `https://pbhzobqpavkuttdipjaq.supabase.co/auth/v1`
- Discovery: `https://pbhzobqpavkuttdipjaq.supabase.co/.well-known/oauth-authorization-server/auth/v1`
- Consent page: `https://maro.al/oauth/consent`
- MCP resource/audience: `https://maro.al/api/mcp`

After saving, open the discovery URL. It must return JSON instead of 404.

## 3 — Create and connect the private ChatGPT plugin

**Where**

ChatGPT → Settings → Security and login → Developer mode; then ChatGPT
Plugins → plus.

**Do**

1. Enable Developer mode.
2. Create a plugin with name `Maro (private)`.
3. Use description `Private maroImazh generation for my connected Maro account.`
4. Choose the public endpoint connection and enter `https://maro.al/api/mcp`.
5. Create it and confirm ChatGPT discovers exactly `get_maro_account` and
   `generate_maro_image`.
6. Connect it, complete Maro login if requested, and approve the Maro consent
   page. ChatGPT should register itself through DCR; do not pre-register or
   guess a callback URL.
7. In a new chat, add the Maro connection and run the prompts in
   `08-OPENAI-TEST-CASES.md`, beginning with the account prompt and then one
   generation prompt.

## Send back once

Send one reply containing:

- whether the Supabase discovery URL returns JSON;
- whether ChatGPT shows the plugin as connected;
- the two discovered tool names;
- the account-test outcome;
- the generation-test outcome and whether the returned HTTPS image renders;
- the exact visible error text if any step fails.

Screenshots are useful but optional. Never send tokens or secrets.
