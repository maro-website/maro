# Phase 2A.5 Checkpoint — Engine Hardening + Shadow Mode Preparation

**Status:** Phase 2A.5 complete. **STOP** — do not begin Phase 2B production cutover without explicit approval.

## Pre-flight migrations

Apply in order:

1. `0021_control_center_foundation.sql`
2. `0022_maro_engine.sql`
3. **`0023_engine_hardening.sql`** — pipeline states + `engine_shadow_comparisons`

---

## A. Hardening changes

| Area | What changed |
|------|----------------|
| Real brain loading | `src/lib/engine/brainLoader.ts` — reuses `getWorkspaceBrainProfile` + `getWorkspaceSources` with owner isolation |
| Config health | `src/lib/engine/configHealth.ts` — READY / WARNING / BLOCKED per tool |
| Source-of-truth matrix | `src/lib/engine/sourceOfTruth.ts` |
| Pipeline policy | `src/lib/engine/pipelinePolicy.ts` (testable) + `pipeline.ts` (server DB read) |
| Provider messages | `src/lib/engine/providerMessages.ts` — system/user separation preserved |
| Shadow compile | `src/lib/engine/shadowCompile.ts` — never throws; fire-and-forget |
| Production hooks | `src/lib/engine/productionShadow.ts` — image + web routes only when `production_pipeline = shadow` |
| Legacy snapshots | `src/lib/engine/legacySnapshot.ts` |
| Structural diff | `src/lib/engine/shadowDiff.ts` |
| Web parity notes | `docs/control-center/web-engine-parity.md` |
| Compiler | `resolveSystemPromptContent()` — maroWeb uses `master_prompt` fallback like legacy seed |
| Tests | `src/lib/__tests__/engine-hardening.test.ts` (19 tests) + vitest `server-only` mock |
| DB | `engine_shadow_comparisons` table for internal comparison records |

**Unchanged (by design):**

- Production generation paths remain **legacy**
- `prompt_compiler_v2` remains **disabled**
- No provider behavior changes
- No additional AI calls in dry run or shadow
- `src/lib/fort/schema.ts` preserved as structural fallback

---

## B. Real maroBrain Dry Run implementation

**Loader:** `loadBrainContext({ ownerUserId, workspaceId, adminInspection })`

- Uses production Supabase services (not a stub)
- Requires explicit owner + workspace pair
- Returns isolation status; no cross-workspace leakage without authorized admin context

**Dry Run API:** `POST /api/admin/engine/compile`

- Accepts `ownerUserId`, `workspaceId`, `useBrain`, fort, selections, attachments metadata
- Returns `brainLoad`, `brainSections`, `configHealth`, `providerMessages`, structured brief

**Mapping rules:** same as Engine compiler via `buildToolBrainContext` + `brainMapping`

| Tool | Brain |
|------|-------|
| maroImazh | Mapped sections (brand, target, content, goal) |
| maroWeb | Mapped sections (+ market) |
| maroLogo | **None** — brain ignored even when workspace provided |

**Admin UI:** Dry Run tab in tool workspace (`EngineDryRunPanel`)

---

## C. Inputs CMS editing

**API:** `POST /api/admin/engine/tools/[toolId]/input-fields`

- CRUD + reorder for `tool_input_fields`
- Validates field types, select defaults, safe conditions (no eval/code)
- Audited via `audit_events`

**Editable:** label, description, placeholder, default, enabled, sort order, Standard/Fort visibility, options, required, model compatibility, conditional visibility, cost modifier metadata

**UI:** `EngineInputsEditor` — field list, editor form, Standard/Fort preview strip

**Precedence (documented in `sourceOfTruth.ts`):**

```
DB explicit override (tool_input_fields) >
code schema fallback (src/lib/fort/schema.ts)

Structural/system fields from code remain unless explicitly disabled in DB.
```

---

## D. Source-of-truth matrix

See `src/lib/engine/sourceOfTruth.ts` (`ENGINE_SOURCE_OF_TRUTH`).

| Domain | Owner | Writable by | Precedence |
|--------|-------|-------------|------------|
| Tool existence | `src/lib/tools/registry.ts` | code deploy | code registry |
| Canonical mapping | `src/lib/engine/toolRegistry.ts` | code deploy | Engine registry |
| System prompt (Engine) | `system_prompt_versions` | Engine CMS publish | live DB > app_settings dual-read (production still legacy) |
| Option fragments | `app_settings.tool_prompts` | legacy Master Prompts | production reads app_settings |
| Prompt layers | `prompt_layers` | Engine CMS | Engine DB + fort_config dual-read in legacy |
| Input fields | `tool_input_fields` + fort schema | Engine Inputs CMS | **DB > code fallback** |
| Fort fallback | `src/lib/fort/schema.ts` | code deploy | always merged structurally |
| maroBrain content | workspace brain profile | user UI | `getWorkspaceBrainProfile(owner, workspace)` |
| Brain mapping | `tool_engine_config.brain_mapping` | Engine CMS | DB > registry defaults |
| Models | `tool_model_configs` | Engine Models CMS | DB > registry ToolDef |
| Customer price | `app_settings.pricing` + registry | legacy Plans admin | pricing overrides > registry |
| Provider credentials | env/secrets | ops | env only |
| Feature flags | `feature_flags` | super admin | `prompt_compiler_v2` = master kill switch |
| Per-tool pipeline | `tool_engine_config.production_pipeline` | Engine CMS | DB per-tool; shadow only in 2A.5 |

Legacy data required for rollback is **not removed**.

---

## E. Configuration validator

**Module:** `validateToolConfiguration()` in `configHealth.ts`

**Statuses shown in Tool Overview** (`configHealth` on tool detail API + Overview tab)

### After legacy seed (expected production admin state)

| Tool | Status | Notes |
|------|--------|-------|
| **maroWeb** | **WARNING** | Legacy pipeline + `prompt_compiler_v2` disabled (expected). Ready for **shadow** once admin confirms live prompt seeded. |
| **maroImazh** | **WARNING** | Same — functional, seeded prompt, shadow-eligible. |
| **maroLogo** | **WARNING** | Same — functional, seeded prompt, shadow-eligible. |
| **maroMarketing** | **BLOCKED** | COMING SOON / NOT FUNCTIONAL — no production route |

Warnings do not block shadow mode. **BLOCKED** tools cannot set pipeline to shadow (UI + API enforced).

Phase 2B must refuse **engine** activation for BLOCKED tools (`canEnableEnginePipeline` requires READY).

---

## F. Pipeline state architecture

**Per-tool column:** `tool_engine_config.production_pipeline`

| State | Meaning |
|-------|---------|
| `legacy` | Production uses existing legacy path (**default for all live tools**) |
| `shadow` | Legacy provider request + fire-and-forget Engine compile for comparison |
| `engine` | Future live Engine cutover — **blocked in Phase 2A.5** |

**Policy:** `pipelinePolicy.ts` — `canSetPipeline("engine", "2a5")` returns false

**Global kill switch:** `feature_flags.prompt_compiler_v2` (remains false)

**Admin UI:** Overview tab shows pipeline buttons — `engine (Phase 2B)` visually disabled

---

## G. Shadow mode architecture

```
Production request
  ├─► Legacy prompt assembly (unchanged) ──► Provider (ONLY path to provider)
  └─► if production_pipeline === shadow:
        scheduleShadowCompilation() [async, fire-and-forget]
          ├─ loadCompileContext + compileGenerationBrief
          ├─ buildStructuralDiff(legacy, engine)
          └─ store engine_shadow_comparisons
```

**Safety guarantees:**

- Does not call provider twice
- Does not charge credits twice
- Does not create a second generation
- Does not alter legacy provider request
- Does not alter user output
- Compiler error in shadow **does not fail** legacy generation (`runShadowCompilation` never throws)
- Shadow failure logged internally; partial error rows stored when possible

**Hooks:**

- `src/app/api/ai/image/route.ts` — maroImazh + maroLogo
- `src/app/api/ai/generate/route.ts` — maroWeb

Shadow runs **only** when admin sets tool pipeline to `shadow`.

---

## H. Shadow comparison UI

**API:** `GET /api/admin/engine/shadow-comparisons?toolId=…`

**Admin tab:** Shadow (`EngineShadowPanel`)

Structured sections:

- System Instructions
- User Request
- maroBrain Context
- maroFort
- Attachments / References
- Prompt Layers
- Output Requirements
- Model
- Pricing
- Warnings

Plus raw legacy vs engine snapshot JSON for technical debugging.

**Not exposed to end users.**

---

## I. Web system/user message parity

Documented in `docs/control-center/web-engine-parity.md`.

**Key points:**

- Legacy: `buildHtmlGenerateSystem` / `buildHtmlGenerateUser` with distinct Claude roles
- Engine: `ProviderMessagePackage.systemInstructions` + `userContent`
- Fort brief placement differs (legacy user append vs Engine structured blocks) — intentional; Phase 2B adapter must preserve roles
- HTML/theme specs must remain in system prompt or adapter appendices

**Fix in 2A.5:** compiler resolves maroWeb system content from live prompt → tool_prompts → **master_prompt** (matches seed logic).

---

## J. Provider-independent brief architecture

**`CompiledGenerationBrief`** remains provider-independent.

**`ProviderMessagePackage`** (`providerMessages.ts`):

- `systemInstructions` — primary system string
- `userContent` — user-facing request + brain + references
- `systemBlocks[]` — layered system sections
- `attachments[]`
- `parameters` — model/tool/selections metadata
- `debugFlatPreview` — admin-only flat preview

Phase 2B provider adapters map this to Claude/OpenAI roles — **not** one concatenated production string.

---

## K. Tests

```bash
npx vitest run src/lib/__tests__/
```

**Results (Phase 2A.5 completion):**

| Suite | Tests |
|-------|-------|
| `control-center-foundation.test.ts` | 9 passed |
| `maro-engine.test.ts` | 16 passed |
| `engine-hardening.test.ts` | 19 passed |
| **Total** | **44 passed** |

**Coverage highlights:**

- Real brain loader + Imazh/Web/Logo mapping
- Inputs CMS validation + code fallback + RBAC
- Config health + pipeline policy
- Provider message separation
- Shadow never throws + fire-and-forget
- Structural diff determinism

```bash
npx next build
```

**Result:** ✓ Compiled successfully (production build passes)

---

## L. Production verification

| Tool | Production pipeline | Engine provider requests |
|------|--------------------|--------------------------|
| maroWeb | **legacy** | **None** (shadow only when explicitly enabled) |
| maroImazh | **legacy** | **None** |
| maroLogo | **legacy** | **None** |

- `prompt_compiler_v2` = **false**
- Credits unchanged — shadow/dry run do not deduct
- maroBrain production behavior unchanged
- maroFort production behavior unchanged
- Provider calls unchanged on legacy path
- maroMarketing: **NOT FUNCTIONAL** (blocked in Engine + no live ToolDef route)

---

## M. Phase 2B recommendation

| Tool | Shadow-ready | Engine-ready | Reasons |
|------|-------------|--------------|---------|
| maroWeb | **YES** (after seed + manual dry run) | **NOT READY** | Needs shadow evidence; HTML system specs parity must be validated structurally |
| maroImazh | **YES** | **NOT READY** | Needs shadow comparisons on real generations first |
| maroLogo | **YES** | **NOT READY** | Simplest brief; still requires shadow parity evidence |
| maroMarketing | **NO** | **NO** | COMING SOON — blocked |

### Recommended shadow-first order

1. **maroWeb** — enter shadow first (highest structural complexity; validates system/user separation)
2. **maroImazh** — second (high volume, brain + fort mapping)
3. **maroLogo** — third (simplest; no brain)

**Do not** recommend direct Engine live activation without shadow evidence from `engine_shadow_comparisons`.

### Phase 2B entry criteria (preview)

- Tool config health = **READY** (not merely WARNING)
- Sufficient shadow records with acceptable structural diffs (human review)
- `prompt_compiler_v2` enabled only as master kill switch backup
- Per-tool `production_pipeline` moved to `engine` only with permission + confirmation + audit

---

**Phase 2A.5 STOP.** Awaiting explicit Phase 2B authorization.
