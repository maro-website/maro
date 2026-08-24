# V1 tools

Only two tools are exposed.

## `get_maro_account`

Input: strict empty object.

Output: `connected`, `display_name`, `active_workspace_name`; optional existing plan label and available credits. No email, UUID, token, prompt state, or database metadata.

Annotations: `readOnlyHint=true`, `destructiveHint=false`, `idempotentHint=true`, `openWorldHint=false`.

Permission: signed application claim `account:read`.

## `generate_maro_image`

Strict input:

```json
{
  "request": "string, 3–4000 chars",
  "aspect_ratio": "square | portrait | story | landscape (optional)",
  "text_preference": "no_text | include_text (optional)"
}
```

Defaults: portrait, no text, one image, current image model, normal speed. The adapter maps these only to existing maroImazh settings. It always sets `useWorkspaceBrand=true` and never supplies a workspace id.

Safe output: a standard MCP `image` content block (`data` as base64 plus
`mimeType=image/png`) for host-native inline rendering, followed by concise
text. `structuredContent` retains `asset_url` (HTTPS signed fallback URL),
media type, aspect ratio, URL expiry seconds, and optional credits spent. The
tool omits storage refs, internal generation/job ids, prompt layers,
provider/model configuration, and hidden compiler output.

Annotations: `readOnlyHint=false`, `destructiveHint=false`, `idempotentHint=false`, `openWorldHint=true`. The call spends credits, writes job/generation/storage state, and calls an external image provider; a new intentional call is not idempotent. JSON-RPC ids are correlation-only and may be reused by stateless clients. A client that needs transport-retry deduplication supplies an HTTP `Idempotency-Key`, which is hashed and scoped to the connected OAuth client.

Permission: signed application claim `image:generate`, followed by all canonical Maro business controls.
