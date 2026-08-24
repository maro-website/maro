# Private ChatGPT setup

Do these steps as the final part of the single owner sequence in
`11-MANUAL-ACTIONS.md`, after OAuth Server and DCR are enabled.

## Endpoint checks

Confirm all return the expected values over HTTPS:

1. `GET https://maro.al/.well-known/oauth-protected-resource/api/mcp` → resource `https://maro.al/api/mcp`, Supabase issuer.
2. `GET https://maro.al/api/mcp` without token → 401 with `WWW-Authenticate` pointing to that PRM.
3. `GET https://pbhzobqpavkuttdipjaq.supabase.co/auth/v1/.well-known/oauth-authorization-server` → discovery with authorization/token/registration endpoints and `S256`.
4. MCP Inspector initialize/list tools → exactly `get_maro_account` and `generate_maro_image`.
5. OAuth test token → `iss` exact Supabase issuer, `aud=https://maro.al/api/mcp`, `client_id`, `maro_mcp=true`, both Maro permissions. Do not paste the token into documentation/chat.

## ChatGPT Developer Mode

Per current OpenAI instructions:

1. ChatGPT → **Settings**.
2. **Security and login**.
3. Enable **Developer mode**.
4. Open **ChatGPT Plugins**.
5. Select the **plus** button.
6. Name: `Maro (private)`.
7. Description: `Private maroImazh generation for my connected Maro account.`
8. Connection: public HTTPS.
9. URL: `https://maro.al/api/mcp`.
10. Create the connection and verify the two tools/annotations.

DCR should register ChatGPT's callback-specific redirect URI automatically. Do
not pre-register or guess a callback while DCR works. If ChatGPT shows a
callback/registration error, copy the exact visible error, not any token.

When the first protected tool is used, ChatGPT should open Supabase OAuth, Maro login if needed, then `/oauth/consent?authorization_id=...`. Approve with **Connect**. ChatGPT exchanges the PKCE code and retries the tool with the access token.

## Deployment status

The protected canonical endpoint is live on Railway production. This is a
private Developer Mode connection, not marketplace or public-directory
publication. The real private connection, OAuth consent, account tool,
generation transport and HTTPS image rendering have passed.

Official source: https://developers.openai.com/plugins/deploy/connect-chatgpt
