# Maro MCP integrations

Two independent Streamable HTTP servers use the existing Maro account and active workspace:

| Product | Endpoint | Application permissions |
|---|---|---|
| maroImazh | `https://maro.al/api/mcp/imazh` | account:read, image:generate, image:read |
| maroBrain | `https://maro.al/api/mcp/brain` | account:read, brain:read, brain:write |

The original `https://maro.al/api/mcp` resource remains available for existing image connections. Its token audience and retry fingerprints remain compatible. Do not replace its resource identity in place.

## Connect in ChatGPT

In Plugins, choose Add custom MCP server. Use the product name and endpoint above, with OAuth authentication. Link the existing Maro account, review the product-specific consent, and select the plugin with @ in a new chat. Availability depends on the client's account and workspace controls. This release provides custom MCP connections; it does not imply a reviewed public-directory listing.

Protected-resource metadata is served at `/.well-known/oauth-protected-resource/api/mcp/imazh` and `/brain`. The existing Supabase issuer handles authorization-code + PKCE, registration and refresh. Supabase's OIDC scopes are identity scopes, not Maro application permissions. The access-token hook binds newly approved clients to a single known resource and issues product-specific application claims; browser sessions are unchanged. New product tokens use a dedicated database role without the browser role's table grants. Registered legacy image clients keep their original resource and role.

## maroImazh tools

- `get_maro_account`: current account/workspace, plan and credits when available.
- `generate_maro_image`: one image; `request`, optional `aspect_ratio` (square, portrait, story, landscape), `text_preference` (no_text, include_text), `use_brain` (false by default).
- `get_maro_image_status`: user-owned image `job_id`, status and completed result. Does not start or bill new work.

Generation uses the existing V1 image application, pricing, jobs, settlement, storage and private compiler. With `use_brain: true`, the user's existing plan must allow Brain. System prompts are not returned. Pending outcomes include the job ID required for a status lookup; completed outcomes contain a signed URL with an expiry. For retries, keep the same explicit HTTP Idempotency-Key when the client supports it. The existing bounded argument fingerprint is preserved for ordinary legacy calls; opting into Brain uses a separate fingerprint.

## maroBrain tools

- `get_maro_account`: account confirmation.
- `get_maro_brand`: user-authored brand profile, source names/keywords, current revision and applicable retention deadline.
- `search_maro_brand_memory`: keyword search of the latest facts; empty query lists recent facts. Also returns the current brand brief. Maximum 20 results.
- `save_maro_brand_memory`: `key`, `content`, `source`, `expected_revision`. Use revision 0 for a new key; use the returned current revision for an update. An identical retry returns the existing revision. A saved fact does not overwrite the brand profile.
- `update_maro_brand`: one allowed text field (`section`, `field`, `value`, `expected_revision`). Updates the same profile used by the Maro web app. Read the profile before changing it. Logo/file identities cannot be edited through this tool.
- `get_maro_brand_history`: paginated profile versions; optional `key` selects fact versions; optional `before_revision` continues older results. History begins with this release, not retroactively.
- `delete_maro_brand_memory`: `key`, `expected_revision`. Permanently removes every version of that fact. Does not delete the workspace or profile.

Brain plan access is checked on each operation. Verified actors cannot supply another workspace or owner. All new tables use RLS and deny direct browser/anonymous access; RPC mutations are service-role-only and also check ownership and plan. Text facts are limited to 4,000 characters, sources to 240, and a workspace to 2,000 stored fact versions. A stale revision returns MEMORY_CONFLICT or BRAND_CONFLICT and requires rereading the current value. The existing Brain retention reset clears both new history tables; account/workspace deletion cascades. This server does not import ChatGPT's full chat log or internal memory.

## Rollout and rollback

Baseline: production commit `59a079d181dee052bf0fcffc4befe5ca8187cdbe`, including accepted maroMood behavior.

Migration `0068_maro_mcp_products.sql` adds three private tables, profile-history/retention integration and narrow service RPCs. The OAuth hook's signature/configured URI is retained. A live-schema rollback preflight must pass before applying it. The production WEB service is the existing Railway service; no runner, price, provider, prompt or payment configuration is changed.

For an application rollback, redeploy the recorded baseline. Legacy image resources remain compatible with the new hook. For a complete database rollback, first disable the new endpoints, restore the saved previous token-hook definition, drop the new profile-history trigger, then remove only the functions/tables created by migration 0068. Export any user-created new memory before removal. Do not rerun the historical database baseline against production.

CLI development and public-directory submission are outside this release.
