# Phase 2A Checkpoint — Maro Engine Foundation

**Status:** Phase 2A complete. **STOP** — do not begin Phase 2B without explicit approval.

## Pre-flight: Migration 0021 + app_settings

- **`0021_control_center_foundation.sql`** must be applied before Engine admin APIs work in Supabase (RBAC, `audit_events`, `feature_flags`, `has_admin_access()`).
- **`app_settings` remains backwards-compatible.** Phase 2A adds new tables only; legacy fields (`master_prompt`, `tool_prompts`, `fort_config`, `pricing`) are still the production source during legacy pipeline.
- Apply **`0022_maro_engine.sql`** for Engine CMS tables.

---

## A. Engine Architecture Built

| Component | Path |
|-----------|------|
| Canonical tool registry + legacy adapters | `src/lib/engine/toolRegistry.ts` |
| Structured types | `src/lib/engine/types.ts` |
| Safe condition evaluator (JSON rules, no eval) | `src/lib/engine/conditions.ts` |
| Conflict detection + precedence doc | `src/lib/engine/conflicts.ts` |
| Model validation prep (Phase 2B hook) | `src/lib/engine/models.ts` |
| Credit preview (registry pricing) | `src/lib/engine/pricing.ts` |
| maroBrain per-tool mapping | `src/lib/engine/brainMapping.ts` |
| Fort input merge (code schema + DB) | `src/lib/engine/inputFields.ts` |
| Central compiler | `src/lib/engine/compiler.ts` |
| Provider text renderer | `src/lib/engine/renderBrief.ts` |
| Legacy compose (parity only) | `src/lib/engine/legacyCompose.ts` |
| DB storage + compile context loader | `src/lib/engine/storage.ts` |
| Legacy seed from app_settings | `src/lib/engine/seed.ts` |
| System prompt versioning | `src/lib/engine/promptVersions.ts` |
| Config warnings | `src/lib/engine/warnings.ts` |
| Parity fixtures | `src/lib/engine/parityFixtures.ts` |

**Admin UI**

- Tool list: `/admin/engine` → `EngineToolsList`
- Tool workspace: `/admin/engine/tools/[toolId]` → tabs (Overview, Models, Prompt System, Layers, Inputs, maroFort, maroBrain, Pricing, Dry Run)

**Admin APIs**

- `GET /api/admin/engine/tools`
- `GET|PATCH /api/admin/engine/tools/[toolId]`
- `POST /api/admin/engine/seed`
- `POST /api/admin/engine/compile` (dry run)
- System prompts, layers, input fields, models CRUD under `/api/admin/engine/tools/[toolId]/…`
- Publish/rollback: `/api/admin/engine/system-prompts/[id]/publish|rollback`

---

## B. Database Migrations

**`0022_maro_engine.sql`** (additive):

| Table | Purpose |
|-------|---------|
| `tool_engine_config` | Per-tool Engine metadata, brain mapping JSON, pipeline status |
| `system_prompt_versions` | Versioned private system prompts |
| `prompt_layers` | Conditional internal layers |
| `tool_input_fields` | Schema-driven CMS fields |
| `tool_model_configs` | Per-tool model enablement (no secrets) |

**Indexes/constraints**

- One live system prompt per tool (`system_prompt_versions_one_live_idx`)
- One default model per tool (`tool_model_configs_one_default_idx`)
- Unique layer/field keys per tool

**RLS:** admin SELECT via `has_admin_access()`; mutations via service-role APIs.

---

## C. Tool Registry

| Engine ID | Display | Registry ID | Route |
|-----------|---------|-------------|-------|
| `maro_imazh` | maro Imazh | `reklama` | `/imazh` |
| `maro_logo` | maroLogo | `logo` | `/marologo` |
| `maro_web` | maro Web | `website` | `/web` |
| `maro_filma` | maro Filma | `filma` | `/filma` |
| `maro_zo` | maro Audio | `zo` | `/audio` |
| `maro_marketing` | maroMarketing | `marketing` | `/marketing` |

Legacy aliases (`reklama`, `website`, `web`, `maroImazh`, etc.) resolve via `resolveEngineToolId()`.

**No “Create Tool” in Admin** — tools are code-registered only.

---

## D. System Prompt Migration

- `POST /api/admin/engine/seed` or auto-seed on first Engine list load seeds:
  - **maro Web:** `app_settings.master_prompt` + `tool_prompts.website.base`
  - **maro Imazh / Logo:** `tool_prompts.{reklama|logo}.base` or registry `defaultPrompt`
- Initial live version: **`v1 — Migrated from legacy configuration`**
- Text preserved verbatim; no reinterpretation during migration.

---

## E. Prompt Versioning

Statuses: `draft` | `review` | `live` | `archived`

- Only **one live** version per tool (DB unique index + publish archives previous live).
- **Publish** requires `engine.publish` permission; audited.
- **Rollback** reactivates an archived version as live.
- Draft edits never mutate live content.
- Publishing updates Engine CMS live config only — **does not switch production** while `prompt_compiler_v2 = false`.

---

## F. Prompt Layers

- Stored in `prompt_layers` with structured JSON `conditions`.
- Evaluator supports: `tool`, `model`, `preset`, `fort.*`, `selection.*`, `attachments.exists`, `plan`, `generationType`.
- **No JavaScript/eval from DB.**
- Existing `fort_config.promptLayers` migrated on seed (universal layers copied to imazh/web/logo/marketing).

---

## G. Tool Input CMS

- `tool_input_fields` table for CMS overrides.
- Runtime merge: **`getFortFields()` (code) + DB overrides** via `resolveToolInputFields()`.
- Production ToolComposer **unchanged** in Phase 2A.

---

## H. maroBrain Mapping

| Tool | usesBrain | Sections |
|------|-----------|----------|
| maro_imazh | yes | brand, target, content, goal |
| maro_web | yes | brand, target, goal, market, content |
| maro_logo | **no** | — |
| maro_filma / maro_zo | no | — |
| maro_marketing | yes (future) | brand, target, goal, content |

Compiler isolates sections; does not dump full profile unless section builders empty.

---

## I. Models

- **Source of truth:** `tool_model_configs` (seeded from registry model settings).
- **Secrets:** remain in server env only.
- `validateModelForTool()` / `enforceModelForGeneration()` prepared for Phase 2B — **not wired to live routes**.

---

## J. Compiler Pipeline

`compileGenerationBrief(input, ctx)` stages:

1. Normalize tool/model
2. Load live system prompt version
3. Resolve selections + option prompt fragments (still from `app_settings.tool_prompts` dual-read)
4. maroBrain context (if allowed)
5. maroFort brief (reuses `buildFortBrief`)
6. Preset interface (`presetId` + optional preset prompt)
7. Evaluate live prompt layers (priority desc, stable tie-break)
8. Technical direction (attachments, text toggle, sizes)
9. Conflict notes
10. Structured `CompiledGenerationBrief` + `renderedProviderPrompt`

---

## K. Conflict Precedence

```
Safety/technical restrictions >
explicit user request >
explicit current-generation maroFort selections >
maroPreset defaults >
maroBrain preferences >
general Prompt Layers >
System Prompt defaults
```

Lightweight detection in `conflicts.ts` (color/text conflicts). No AI resolver.

---

## L. Dry Run Manual Test

1. Apply migrations 0021 + 0022 on Supabase.
2. Sign in as Developer+ admin.
3. Open `/admin/engine` → **Seed nga legacy** (first time).
4. Open `/admin/engine/tools/maro_imazh` → **Dry Run** tab.
5. Enter user prompt → **Compile**.
6. Verify JSON shows structured brief, credits estimate, warnings, `promptCompilerV2: false`.
7. Confirm no generation job, no credit change, no provider call.

API: `POST /api/admin/engine/compile` with Bearer token; requires `engine.manage`.

---

## M. Legacy Parity

Fixtures in `parityFixtures.ts`:

- imazh: simple, attachment, text-on
- logo: simple
- web: landing

Tests compare semantic markers (system content, reference handling, text rules) — not character-for-character equality.

**Known difference:** Engine uses structured sections; legacy uses flat concatenation. Web legacy uses `buildHtmlGenerateSystem/User`; Engine dry run exposes structured brief + rendered preview.

---

## N. Security

| Control | Implementation |
|---------|----------------|
| Engine view | `engine.view` |
| Dry run / CMS edits | `engine.manage` |
| Publish / rollback | `engine.publish` |
| Editor role | **no** engine access |
| Compile endpoint | read-only; audited `engine.compile_dry_run` |
| System prompts | admin-only; never in public APIs |

---

## O. Tests

```bash
npx vitest run src/lib/__tests__/maro-engine.test.ts src/lib/__tests__/control-center-foundation.test.ts
```

**Result:** 25/25 passed.

```bash
npx next build
```

**Result:** success.

---

## P. Production Verification

| Route | Pipeline |
|-------|----------|
| `/api/ai/generate` (maro Web) | **LEGACY** |
| `/api/ai/image` (maro Imazh / Logo) | **LEGACY** |
| `prompt_compiler_v2` | **FALSE** (default; feature_flags) |

Grep confirmed: **no** `compileGenerationBrief` or `FEATURE_PROMPT_COMPILER_V2` in `/api/ai/*`.

---

## Q. Known Issues

- Tool workspace **Inputs** tab shows DB count only; full field editor deferred (legacy maroFort tab still primary).
- Dry run brain context uses workspace ID stub unless full brain profile loader wired in compile API.
- `maro_marketing` has no registry `ToolDef`; Engine config only until product ships.
- Web Engine vs legacy parity is semantic, not identical HTML system/user split.

---

## R. Technical Debt (dual config)

| Property | Production (Phase 2A) | Engine CMS |
|----------|----------------------|------------|
| Tool existence | code registry | `tool_engine_config` metadata |
| System prompt text | app_settings + registry defaults | `system_prompt_versions` |
| Option prompt fragments | app_settings.tool_prompts | compiler dual-read |
| Fort fields | fort/schema.ts + fort_config | tool_input_fields overrides |
| Fort layers | fort_config.promptLayers | prompt_layers (seeded) |
| Models | registry settings | tool_model_configs |
| Pricing | registry + pricing.options | same via `estimateGenerationCredits` |

Remove dual-read when Phase 2B migrates each tool behind `prompt_compiler_v2`.

---

## S. Phase 2B Migration Recommendation

**Recommended order (by complexity discovered):**

1. **maroWeb** — single generate route, structured system/user already; fort bridges exist.
2. **maroImazh** — image route; brain + attachments + text rules; moderate complexity.
3. **maroLogo** — image route; no brain; wizard may need adapter for selections.

**Rollout**

1. Keep `prompt_compiler_v2 = false` globally.
2. Internal: enable per-tool `production_pipeline = engine_v2` in CMS + shadow compare dry run vs logged `final_prompt`.
3. Admin-only canary: compile in parallel without switching debit path.
4. Flip feature flag per tool after parity sign-off.
5. Rollback: set tool back to `legacy`, disable flag, live system prompt unchanged in app_settings until cutover.

**Compare outputs:** log legacy `final_prompt` vs Engine `renderedProviderPrompt` for sampled jobs; use parity fixtures in CI.

---

**Phase 2A STOP.** Awaiting explicit Phase 2B authorization.
