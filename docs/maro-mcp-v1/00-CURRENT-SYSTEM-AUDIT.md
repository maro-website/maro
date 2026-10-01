# maroMCP v1 — current system audit

Checked 2026-08-24. Scope is private ChatGPT + maroImazh only. The isolated worktree is `maro-mcp-v1-worktree`, branch `feat/maro-mcp-v1`, starting commit `2db574a7`. The original worktree and branch were not changed; nothing was pushed.

## Canonical path

`ToolComposer -> imageService -> POST /api/ai/image -> executeMaroImageApplication -> Supabase actor -> active workspace owner check -> maroBrain/brand/preset/Fort -> Maro compiler -> credits -> OpenAI image provider -> private storage -> persistence -> settlement/refund -> UI SSE`

`src/lib/maro-imazh/applicationService.ts` now owns the business transaction. The UI route is only validation/SSE transport. MCP calls this application service directly through its own result adapter; it does not call the UI endpoint and does not duplicate prompt, credit, provider, storage, or refund logic.

## Workspace authority

`profiles.active_workspace_id` is the source of truth. `getActiveWorkspaceId(userId)` verifies `workspaces.owner_id = userId`; a stale or foreign preference is replaced with the first owned workspace. MCP has no workspace input.

## Prompt privacy gate

Migration `0045_generation_prompt_privacy.sql` moves compiled prompts from the user-readable `generations.final_prompt` column into service-role-only `generation_internal_prompts`, clears the old column, and revokes user roles. User/MCP results contain only the original request and safe image output. This migration must be deployed before MCP code.

## Existing financial and abuse controls

The canonical generation orchestrator already performs email/account checks, business entitlements, per-user/IP/module rate limits, concurrency, circuit/budget gates, idempotent job creation, credit reservation, exact-once settlement, and technical-failure release/refund. MCP reuses all of them unchanged.
