# MARO V1 — Phase 4 report

Verified 17 September 2026. Scope: the existing working tree, maroImazh and maroLogo only.

## PHASE 4 STATUS

**PASS**, with one explicit verification limitation: the live admin preview endpoint correctly required MFA, so preview/execution parity was verified through authorized-handler unit tests, not a live MFA-authenticated browser session.

Both active modules now resolve one canonical server prompt from published configuration. That exact string feeds provider execution and a restricted execution record. The existing admin preview calls the same service. Three internal live generations succeeded, were recovered from storage, and charged 5 credits each. No deployment, payment work, or Phase 5 implementation was performed.

## CANONICAL IMAZH PROMPT FLOW

`Phase 2 validation and owned-context resolution → compileTrustedImageRequest → buildCanonicalImagePrompt → resolved OpenAI request`

The exact prompt section order is:

1. The single published Imazh system prompt.
2. Matching production direction/option layers, including validated format and speed selections.
3. The validated published preset, wrapped once, when selected.
4. Permitted workspace Brain text and matched-source brief, only with explicit Brain ON.
5. Matching reference instruction layers, based on the actual retained references.
6. The normalized user request.
7. Matching output/text/font requirement layers.

Empty sections are omitted. Each section is trimmed; line endings are normalized to LF; sections are joined with two newlines. Reference bytes travel separately. Owned user references are considered first, followed by permitted Brain assets; content digests deduplicate them and the existing four-reference limit applies.

Selections control validated layer conditions and the frozen execution settings. There is no second registry-driven prompt compilation or downstream `imageCompile` reconstruction.

## CANONICAL LOGO PROMPT FLOW

`Validated Phase 2 Wizard answers → published Logo configuration → common canonical service → Flare`

The exact section order is:

1. The single published Logo system prompt.
2. Matching production direction/option layers, including Logo type, presentation, and supported speed.
3. A validated module-compatible published preset, when selected.
4. Matching reference instruction layers, if references remain.
5. The authoritative server brief from `buildMaroLogoBrief(validatedWizardAnswers, hasReferences)`, including the structured brand, design, presentation, and output requirements.
6. Matching production output layers, if configured.

There is no Brain section. The existing Wizard UI and brief-rendering semantics remain intact. Browser-built instructions cannot replace the server brief: the trusted request derives its public request text from the validated brand name and description. An optional browser prompt is still type/length checked, but is not used to compile the Logo instructions.

The brief builder continues accepting structured Wizard data, leaving a later admin content editor possible without replacing this generation architecture.

## PRODUCTION PROMPT SOURCE

The authoritative instruction storage is the existing `system_prompt_versions` and `prompt_layers` tables, managed through the existing Engine administration facilities.

| Module | Published system ID | Version |
| --- | --- | --- |
| Imazh | `a8cde7e4-b3c4-4f08-9ea4-6ce9f5970ac1` | `v1` |
| Logo | `d5869284-7e7a-4b07-ae37-8bed138d97c8` | `v1-canonical-phase4` |

Compilation requires exactly one nonempty published system prompt for the module. Database read failures, missing/ambiguous systems, invalid matching production layers, and duplicate matching layer keys fail safely. Prompt configuration is resolved before reserving credits. There is **no legacy or hardcoded system-prompt fallback** in the V1 path.

The canonical version is `maro-v1-canonical/1`. SHA-256 records system content, applied layer content, preset content, canonical prompt, and execution configuration provenance. The configuration hash uses sorted object keys and excludes the transport idempotency key; it includes the trusted model/pricing snapshot and resolved-context provenance.

## LEGACY PROMPT MIGRATION

Current values were captured before changes in the private local evidence directory, `scripts/phase4-data/before.json`.

The active legacy base keys were `reklama.base` and `logo.base`. Bare historical `reklama`/`logo` keys and older Logo variants were not the active base read by the production composer.

- **Imazh:** the active base already matched the published Engine system. Its row and content were retained. Content hash: `87887b8ee940d81a9d8ff251cdcff6e3d29232707808958361591ba1d800bcff`.
- **Logo:** the active `logo.base` differed from the old published Engine text. The old Engine row, `b61eaf95-ec91-45ff-81ad-2471473df209`, was archived with its content preserved. The exact active base was published as `v1-canonical-phase4`. Content hash: `8438f6ac4cab83cdfcbe949e068cfeab85c4e9011d55488e236606b68224827a`.
- Active selectable option fragments were resolved using their existing custom override/default behavior and copied into production layers. Existing reference and text requirements were also copied. The migration verified exact base and layer component equality after reading the new configuration back.
- No generic seed replaced custom live content. Legacy settings and registry fragments remain available to retained paths, but V1 execution no longer reads them as instruction sources.

There were no existing active Imazh/Logo prompt layers to preserve. The resulting inventory is 24 production layers, version `phase4-migrated-1`: 15 Imazh layers and 9 Logo layers. Imazh has four format, three speed, one reference, two text-OFF, and five text-ON/font layers. Logo has three type, four presentation, one normal-speed, and one reference layer.

Separately, 12 historical image generation `final_prompt` values were copied into existing restricted snapshot storage, reread and checked for exact equality, and only then cleared from ordinary generation rows. The original user request, outputs, and financial records were preserved. The post-migration query found no remaining nonempty Imazh/Logo `final_prompt` values at that check.

## PROMPT LAYERS

Only matching-module, published, enabled layers explicitly named under `v1.production.` can participate. The namespaces `v1.production.reference.*` and `v1.production.output.*` select their respective sections; other approved names under the production namespace are direction layers.

Within each section, priority is descending, followed by layer key ascending, then ID ascending. Section order takes precedence over priority. Applied layer IDs, versions, hashes, priorities, and conditions are retained in the restricted canonical record in actual execution order.

Conditions support only `{ field, equals: string[] }`. Conditions are ANDed; values within `equals` are ORed. Supported fields are validated selections other than model, `hasReferences`, and the effective `useBrain` state. Unknown fields/operators, malformed conditions, and nonmatching conditions exclude the layer. There is no model-specific condition or hidden Sunburst instruction.

Legacy/migration, Fort, Brain, Web/future, and obsolete namespace segments are excluded even when nested under the production prefix. Unclassified historical keys outside that prefix are excluded. Exclusion diagnostics are deterministic and retained for admin inspection. Missing content or malformed priority on an otherwise matching production layer fails compilation rather than silently losing an intended instruction.

## BRAIN

Both the context service and pure builder enforce Imazh + explicit ON + a validated workspace. The service uses the existing owner-scoped Brain profile, brand, source, and asset resolvers. Sources are ordered by creation time descending, then ID ascending before existing prompt matching. Inaccessible optional Brain assets retain the existing exclusion behavior.

Focused tests demonstrate:

- Imazh ON loads only scoped services and includes the permitted text/assets.
- Imazh OFF performs no Brain loads and excludes stale supplied Brain text/assets.
- Logo never loads or includes Brain, including when a stale internal snapshot or context contains it.
- Historical Brain/Fort layer names cannot bypass the builder.

All three live samples used Brain OFF. ON/assets were tested locally; this phase did not add extra paid Brain generations or repeat Phase 3 edit verification.

## PRESETS

Phase 2 remains responsible for publication, module compatibility, and ownership validation. Its resolved preset enters the shared builder once. The canonical record stores the preset ID and content hash. Missing resolved content or a hash mismatch fails before provider execution. No separate preset execution route exists. Valid inclusion exactly once, missing context, and tampered content are covered by focused tests.

## EXECUTION PARITY

`published configuration → canonical compilation → admin preview / provider request / restricted execution record`

The V1 admin handler resolves the same trusted inputs and calls `compileTrustedImageRequest`, returning the exact canonical prompt in its preview payload. Authorized-handler tests cover Imazh Flare, Imazh Sunburst, and Logo Flare. Existing permission and MFA requirements were retained.

For all three live checks, the captured provider request prompt was byte-for-byte equal to the restricted recorded canonical prompt. Its SHA-256 matched the canonical provenance, safe job metadata, and provider observation. Model identity also matched across the wire request, job, generation, observation, and restricted trace.

The live admin endpoint returned `403 mfa_challenge_required`; its authentication was not bypassed. A real MFA-authenticated admin/browser preview remains unverified. Local handler parity and actual live execution/recording parity passed independently.

Full prompts and the trusted execution configuration are stored in the existing admin-only `pricing_snapshots.snapshot` JSON, tagged `record_type: v1_image_execution` and linked by job ID. This required record is written before a provider call; a failed trace write prevents provider spending and invokes existing failure settlement. Safe job metadata contains identifiers and hashes rather than internal prompt or Brain text. New generation history stores the user-facing request and an empty `final_prompt`; generation responses do not return internal instructions.

The existing snapshot-table RLS uses admin access. An anonymous read returned zero rows. An authenticated ordinary-user live RLS test was not performed; that boundary was assessed from the existing policy. No new prompt storage table or auth architecture was introduced.

## LIVE CHECK

Exactly three internal provider requests were made. All used `high`, `n=1`, and square 1024 × 1024 output, with no model/format wiring changes. Each stored PNG was downloaded and decoded successfully.

| Case | Actual provider model | Provider latency | Job ID | Generation ID | Charged |
| --- | --- | ---: | --- | --- | ---: |
| Imazh Flare | `gpt-image-2.5-flare` | 16.844 s | `ddf3c864-77a5-4d8b-a84c-0126325a8d83` | `bfcb0eeb-6f42-4cf4-8b93-5e22cd892094` | 5 |
| Imazh Sunburst | `gpt-image-2.5-sunburst` | 35.109 s | `f267a2d2-52ee-4430-b838-49e66ce08764` | `ec763b09-9baa-4c04-ae69-5d1abf8debb2` | 5 |
| Logo Flare | `gpt-image-2.5-flare` | 22.129 s | `de83ed6a-0b21-429d-99b5-db65b276eb95` | `acaae2d5-07f3-4675-9a8a-7a5b4aa9c276` | 5 |

Provider request IDs, in table order:

- `req_f2854c11975342edbd9e0c02dfc783a9`
- `req_34fbad7c4bda445bbf347629f4a04b7e`
- `req_e4b9a6cb95774c0db23339e521878ff8`

Canonical prompt hashes:

- Both matched Imazh requests: `4256e761684f4411a7aebd74ef1c7cd40ccadaa2c5dacdd7c208bc442c8e78bf`
- Logo: `f9f79a98446c162fd396643e7e405ac28e1d3f78fc6a4df021b921ad1c8c8b2e`

Execution configuration hashes:

- Imazh Flare: `5193f058f8217a28e75a7c201ce8df9af1f56265a75b15ef8257c423bef226a9`
- Imazh Sunburst: `87b8b7a7e8c28a99f06b1ce1af7c1225750e1aa68bd13185d1663d80722fef79`
- Logo Flare: `faa3da3a0e0ccbdfd61111872dfc5e6364d37013b1fc50a110e2ee22f5e570fe`

The Imazh prompt hashes intentionally match; their execution configuration hashes differ because the resolved model configuration differs.

Internal balances progressed **3067 → 3062 → 3057 → 3052**, with **15 credits charged total and 0 reserved at completion**. Each persisted ledger had one 5-credit reservation and one 5-credit charge, matching the job, generation, response, and trusted configuration.

The combined harness was interrupted after Sunburst had succeeded and saved its response/request checkpoint. Its existing job, generation, trace, ledger, and stored image were recovered read-only; no replacement generation was made. Sunburst's before/reserved balances were reconstructed from the persisted reservation ledger, and its after balance was reread. The remaining Logo case was then run separately. The final read-only audit passed for all three persisted results.

Local evidence lives in the ignored `scripts/phase4-data/` directory: `configuration.json`, `privacy.json`, `final-config.json`, `audit.json`, per-case request/result/preview checkpoints, and the three PNGs. These files include restricted prompt diagnostics and are not public artifacts. The report contains hashes and identifiers, not full internal instructions.

## PRICING CHECK

The existing authoritative `tool_model_configs` rows now contain approved launch pricing:

| Module/model | Credits | Descriptor | Default | Configuration ID |
| --- | ---: | --- | --- | --- |
| Imazh Flare | 5 | Fast · Recommended | Yes | `60cd6a82-0ae5-47b6-8170-78bff047b77c` |
| Imazh Sunburst | 5 | Alternative · More deliberate | No | `d1840001-1606-4ad9-b090-d5ba7d9b5a8e` |
| Logo Flare | 5 | Fast · Recommended | Yes | `a8f40b7c-cc37-4505-8c36-f30e1497f44f` |

`pricingStage` is `launch`. Runtime prices remain resolved from these rows, not hardcoded in generation logic. No Sunburst Logo option or customer-facing Logo selector was created. All three live charges independently verified this configuration.

## FILES CHANGED

This list describes Phase 4 changes only. Earlier-phase and unrelated working-tree changes were preserved.

| File | Phase 4 reason |
| --- | --- |
| `src/lib/generation/v1ImagePrompt.ts` | New common configuration resolver, deterministic builder, permitted context resolution, hashes/provenance, and required restricted trace. |
| `src/app/api/ai/image/route.ts` | Execute the common canonical result, preserve existing model/financial lifecycle, remove competing V1 prompt selection, and separate private prompt from public history. |
| `src/lib/generation/v1ImageRequest.ts` | Make validated Logo Wizard answers authoritative and normalize public Logo request text. |
| `src/app/api/admin/engine/compile/route.ts` | Route active V1 previews through the same trusted request resolver and canonical service. |
| `src/components/admin/engine/EngineDryRunPanel.tsx` | Supply explicit Brain, preset/reference, model, and structured Logo inputs to the existing admin preview. |
| `src/lib/engine/executionTelemetry.ts` | Add canonical execution labels and preserve previous provider observations when subsequent telemetry is stamped. |
| `src/lib/__tests__/v1-canonical-prompt.test.ts` | Determinism, layer exclusion/order, scoped Brain, preset integrity, Logo authority, strict configuration, and three-model preview parity. |
| `src/lib/__tests__/v1-image-route.test.ts` | Canonical execution/record/history parity, trace/config failure behavior, and independence from shadow/canary choice. |
| `src/lib/__tests__/v1-module-availability.test.ts` | Reflect structured Logo validation without changing module availability. |
| `src/lib/__tests__/workspace-image-reference-security.test.ts` | Verify the ownership-protected resolver at its new canonical-service location. |
| `tools/phase4/vitest.config.ts` | Isolate the explicitly opted-in configuration/privacy/live harness from ordinary tests. |
| `tools/phase4/verify.ts` | Preserve/migrate active configuration and historical prompts, then verify three internal live requests with checkpoints. |
| `tools/phase4/audit.mjs` | Read-only parity, model, storage, and credit audit of captured live evidence. |
| `docs/MARO-V1-PHASE4.md` | This completion report. |

The ignored local evidence directory also contains the before-state/configuration snapshots, privacy migration result, per-case verification checkpoints, PNGs, and source backups used for this phase. No credential values were written into these artifacts.

## MIGRATIONS

**No numbered schema migration was needed or created.** Existing restricted snapshot JSON supports private prompt/configuration storage and existing tables support system versions and layers. Historical migration files were not modified.

Data changes were limited to the approved three model configurations, publishing the preserved Logo system version, adding 24 production layers, moving 12 historical internal prompts into restricted storage, and the records/outputs/charges for the three authorized internal checks.

## TEST RESULTS

Commands ran from the repository root. Local unit tests explicitly cleared live credentials:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL=''
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=''
$env:SUPABASE_SERVICE_ROLE_KEY=''
$env:OPENAI_API_KEY=''
pnpm test -- --reporter=dot
```

Result: **837 passed, 11 skipped; 848 tests across 64 files, with 63 files passed and 1 skipped.** This includes existing model wiring, availability, pricing/request validation, ownership, and credit lifecycle regressions. No failed tests.

```powershell
pnpm test -- src/lib/__tests__/v1-canonical-prompt.test.ts src/lib/__tests__/v1-image-route.test.ts src/lib/__tests__/v1-image-request.test.ts --reporter=dot
```

Result: **139 passed in 3 files**, with the same credential-clearing guard. The canonical prompt file contains 30 focused tests.

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Result: **exit 0, no TypeScript errors.**

```powershell
git diff --check -- src/app/api/admin/engine/compile/route.ts src/components/admin/engine/EngineDryRunPanel.tsx src/lib/engine/executionTelemetry.ts src/app/api/ai/image/route.ts
node tools/phase4/audit.mjs
```

Results: **exit 0** for both; the audit confirmed all three live records and the 15-credit total. Git emitted only its existing line-ending conversion notices.

The isolated live harness requires `MARO_PHASE4_APPROVED=1` and an explicit `MARO_PHASE4_STAGE` of `configure`, `privacy`, or `live`; it uses `tools/phase4/vitest.config.ts` and the local environment file. Configuration component-parity and historical private-copy checks passed. The initial live admin preview attempt stopped at MFA before provider work. After retaining that gate as a reported limitation, the live run completed both Imazh calls; Sunburst evidence was reconciled following the harness interruption, and `MARO_PHASE4_CASE=logo-flare` selected only the remaining Logo call. The separate Logo run exited successfully. Do not rerun paid verification to reproduce this report: use the read-only audit and existing checkpoints.

## REMAINING DUPLICATION

Legacy settings/registry fragments, `imageCompile`, the older Engine compiler, the client Logo intermediate brief, and shadow/canary implementations remain for retained or future paths. They no longer decide the normal V1 execution prompt. No shadow/background scheduling was added to the canonical V1 route, and retained scheduling reliability was not reverified or made a launch dependency.

The generic telemetry field `configured_pipeline` retains its existing default semantics; `effective_execution: canonical_v1` and `compiler: maro_v1_canonical` identify this route's actual execution. No pipeline flag migration was needed.

These retained components are later cleanup candidates only after their non-V1 dependencies are assessed. No broad deletion, general admin redesign, Wizard redesign, Brain architecture change, or parked-module implementation was included.

## NEXT RECOMMENDED PHASE

Proceed next with **durable persistence and settlement correctness**, as expected. All Phase 4 samples were durably stored, but the existing route still permits an inline image fallback when upload returns no stored URL, and existing history insertion can return no generation ID. These failure paths can still be treated as successful by the retained settlement flow. Phase 4's required private trace prevents an unrecorded provider attempt; it does not solve those later persistence/settlement failures.

Phase 5 should establish and test the success invariant linking a durable output, generation record, terminal job, and exactly-once charge, including interrupted and failed persistence. It has **not** been started. A live MFA-authenticated admin preview check can also close the verification limitation documented above.
