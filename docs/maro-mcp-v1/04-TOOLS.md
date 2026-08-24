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

Safe output: `asset_url` (HTTPS signed URL), `media_type=image/png`, aspect ratio, URL expiry seconds, and optional credits spent. It omits base64, storage refs, internal generation/job ids, prompt layers, provider/model configuration, and hidden compiler output.

Annotations: `readOnlyHint=false`, `destructiveHint=false`, `idempotentHint=false`, `openWorldHint=true`. The call spends credits, writes job/generation/storage state, and calls an external image provider; a new intentional call is not idempotent. Network retry of the same MCP request id is financially idempotent.

Permission: signed application claim `image:generate`, followed by all canonical Maro business controls.
