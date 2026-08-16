# Phase 2B.1 Checkpoint — maroWeb Shadow Rollout ONLY

**Status:** Phase 2B.1 complete. **STOP** — maroWeb remains **SHADOW** (not Engine live). No other tool shadow enabled.

Apply migration **`0024_maroweb_shadow.sql`** after 0021–0023.

---

## A. Feature flag semantics

### Final policy (documented in `engineIntegrationPolicy.ts`)

| Control | Purpose |
|---------|---------|
| `feature_flags.prompt_compiler_v2` | **Engine LIVE permission only** — required for `production_pipeline = engine` to send Engine brief to provider |
| `tool_engine_config.production_pipeline` | Per-tool mode: `legacy` \| `shadow` \| `engine` |

### When `prompt_compiler_v2 = false` AND `maro_web.production_pipeline = shadow`:

| Action | Allowed? |
|--------|----------|
| Legacy maroWeb provider request (Claude) | **YES** — unchanged |
| Shadow Engine compile (no provider) | **YES** |
| Engine LIVE provider request | **NO** |
| Dry-run admin compile | **YES** |

**Key functions:**

- `shouldRunShadowCompilation()` — per-tool pipeline + Phase 2B.1 tool allowlist (`maro_web` only)
- `wouldUseEngineProvider()` — requires `prompt_compiler_v2=true` AND `pipeline=engine`
- `canSetPipeline(..., phase: "2b1")` — blocks engine for all tools; blocks shadow for non-maroWeb tools

No global flag change was required for shadow — semantics were clarified, not inverted.

---

## B. maroWeb shadow implementation

### Execution path (real maroWeb generation)

```
POST /api/ai/generate
  ├─ Legacy: buildHtmlGenerateSystem + buildHtmlGenerateUser
  ├─ callClaudeText({ system, user })  ← ONLY provider call
  ├─ logGeneration (1 generation, 1 credit)
  ├─ completeGeneration
  ├─ Return legacy pages to user (SSE)
  └─ after legacy success:
        maybeScheduleWebShadow()
          ├─ getToolProductionPipeline("website")
          ├─ shouldRunShadowCompilation(maro_web, phase=2b1)
          ├─ buildWebLegacySnapshot(pre-built system/user)
          └─ scheduleShadowCompilationReliable(runShadowCompilation)
                via Next.js after() when available
                → compileGenerationBrief (Engine V2)
                → buildWebStructuralDiff
                → insert engine_shadow_comparisons
```

**Files:** `productionShadow.ts`, `shadowSchedule.ts`, `shadowCompile.ts`, `shadowWebDiff.ts`, `legacySnapshot.ts`

Legacy maroWeb prompt builder was **not refactored**.

---

## C. Production guarantees

For each maroWeb generation in shadow mode:

| Metric | Expected |
|--------|----------|
| User generations | **1** |
| Provider requests | **1** (legacy Claude only) |
| Credit charges | **1** |
| Legacy result | **1** |
| Engine compile | **1** (internal) |
| Engine provider request | **0** |

Instrumentation: `context_metadata.providerRequestCount = 1`, `engineProviderRequestCount = 0`.

Shadow failure never fails legacy generation (`runShadowCompilation` never throws to caller).

---

## D. Shadow data captured

Stored in `engine_shadow_comparisons` (+ migration 0024 columns):

| Field | Content |
|-------|---------|
| `legacy_snapshot` | System/user messages, website type, selections, fort, model, credits |
| `engine_snapshot` | ProviderMessagePackage, layers, brain sections, output requirements |
| `structural_diff` | Classified sections + warnings |
| `critical_flags` | Deterministic mismatch codes |
| `critical_mismatch` | Boolean |
| `compile_status` | `success` \| `failed` |
| `compile_error` | Internal error text |
| `context_metadata` | Full generation context (IDs, prompts, brain, fort, instrumentation) |
| `review_status` | `unreviewed` \| `looks_good` \| `needs_fix` \| `expected_difference` |
| `review_note` | Admin internal note |

Admin-only. Not exposed to users. Respects existing generation retention.

---

## E. Comparison UI

**Admin → Engine → maroWeb → Shadow** (`EngineShadowPanel`)

- Operational summary: comparisons, compile success %, critical mismatch %
- Filters: model, fort, brain, compile status, critical, generation ID
- Structured diff with classifications
- Separate LEGACY system/user vs ENGINE system/user panels
- Critical flags highlighted
- Manual review state + internal notes
- Raw technical preview (collapsed)

---

## F. Critical mismatch detection

Deterministic rules in `shadowWebDiff.ts`:

- `engine_compile_failed`
- `legacy_brain_missing_in_engine`
- `fort_enabled_engine_empty`
- `website_type_missing_in_engine`
- `user_prompt_truncated_or_missing`
- `engine_system_instructions_missing`
- `output_requirements_missing_in_engine`
- `model_mismatch`
- `pricing_mismatch`
- `attachments_missing_in_engine`
- Per-section `*_missing_in_engine`

Classifications: `match`, `expected_structural_difference`, `missing_in_engine`, `engine_only`, `conflict`, `warning`.

No LLM judging.

---

## G. Performance strategy

- Shadow scheduled **after** legacy provider success + generation log
- Uses Next.js `after()` via `shadowSchedule.ts` for serverless reliability (extends execution after response)
- Falls back to fire-and-forget in test/non-Next environments
- Does not gate Claude call or user SSE response
- `runtime = nodejs`, `maxDuration = 900` on generate route preserved

**Note:** If `after()` is unavailable, shadow may be less reliable on short-lived serverless — monitor `compile_status=failed` in admin dashboard.

---

## H. Tests

```bash
npx vitest run src/lib/__tests__/
```

| Suite | Tests |
|-------|-------|
| control-center-foundation | 9 |
| maro-engine | 16 |
| engine-hardening | 20 |
| **maro-web-shadow** | **12** |
| **Total** | **57 passed** |

```bash
npx next build
```

✓ Compiled successfully

---

## I. Current pipeline state

After applying **`0024_maroweb_shadow.sql`**:

| Tool | Pipeline |
|------|----------|
| **maroWeb** | **SHADOW** |
| **maroImazh** | **LEGACY** |
| **maroLogo** | **LEGACY** |
| maroMarketing | LEGACY (non-functional) |

Emergency rollback: Admin → maroWeb → set pipeline to **legacy** (audited). No deploy required.

Engine activation button remains disabled in UI.

---

## J. Existing evidence

**Shadow infrastructure is ready; awaiting real traffic/evidence.**

No fabricated production comparisons. Target before Engine-canary consideration: ~20 diverse real maroWeb shadow records (manual review).

---

## K. Known differences

Documented in `docs/control-center/web-engine-parity.md`:

- Fort brief placement (legacy user append vs Engine structured blocks)
- HTML/theme specs source (legacy code injection vs Engine system prompt/adapter)
- Brain support in Engine shadow when workspace provided (legacy web route may not inject brain today)
- Option fragments merged differently into system stack

These are **expected structural differences** — review via shadow comparisons before Engine live.

---

## L. Engine readiness

**maroWeb is NOT Engine-ready.**

Shadow mode is active for observation only. Engine LIVE requires:

- ~20+ real shadow comparisons with human review
- Critical mismatch rate acceptable
- Explicit authorization for Engine canary
- `prompt_compiler_v2 = true` + separate approval

Tests passing ≠ production Engine readiness.

---

## M. Next recommendation

**Continue collecting shadow data** from real maroWeb generations.

1. Apply migration 0024
2. Confirm Engine seed + live system prompt exist (run seed if needed)
3. Generate real maroWeb sites across diverse contexts (landing, fort, brain, models)
4. Review comparisons in Admin → Shadow
5. Mark review states (`looks_good` / `needs_fix` / `expected_difference`)
6. Fix Engine mismatches flagged as critical before requesting Engine canary

**Do NOT:**

- Enable shadow on maroImazh or maroLogo
- Set `production_pipeline = engine`
- Enable `prompt_compiler_v2` without separate authorization

---

**Phase 2B.1 STOP.** Awaiting shadow evidence review.
