# Private ChatGPT setup

Do these steps only after every action in `11-MANUAL-ACTIONS.md` is complete and live discovery/token checks pass.

## Endpoint checks

Confirm all return the expected values over HTTPS:

1. `GET https://maro.al/.well-known/oauth-protected-resource/api/mcp` → resource `https://maro.al/api/mcp`, Supabase issuer.
2. `GET https://maro.al/api/mcp` without token → 401 with `WWW-Authenticate` pointing to that PRM.
3. `GET https://pbhzobqpavkuttdipjaq.supabase.co/.well-known/oauth-authorization-server/auth/v1` → discovery with authorization/token/registration endpoints and `S256`.
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

Supabase currently lacks the issuer-identification flag needed for ChatGPT's stable callback. DCR should register ChatGPT's callback-ID-specific redirect URI automatically. Do not pre-register or guess a callback while DCR works. If ChatGPT shows a callback/registration error, copy the exact callback URI and OAuth error, not any token.

When the first protected tool is used, ChatGPT should open Supabase OAuth, Maro login if needed, then `/oauth/consent?authorization_id=...`. Approve with **Connect**. ChatGPT exchanges the PKCE code and retries the tool with the access token.

## Tunnel decision

Secure MCP Tunnel is not the first path for this repository because Supabase composes consent from Maro's configured Site URL, and the fixed token audience is the canonical Maro resource. A tunnel would still need the consent route available at the configured Maro site and could create a resource-host mismatch. No Railway staging service/project or CLI link was present locally. The reliable next private test is therefore the protected canonical HTTPS endpoint after an authorized deployment; it is not a marketplace/public-directory publication.

Official source: https://developers.openai.com/plugins/deploy/connect-chatgpt
