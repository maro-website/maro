# MARO V1 — Phase 2: trusted image request and configuration

Status: **PASS — implementation and isolated verification**. This is not a production-launch certification. No deployment, live provider request, production database read/write, price decision, or migration was performed in this phase.

The user's follow-up authorizes the minimal provider-ID forwarding needed to prevent a validated Flare/Sunburst request from executing GPT Image 2. There is no temporary “model execution pending” path. Live verification and cost comparison remain Phase 3.

## Trusted request contract

`parseV1ImageRequest` accepts untrusted JSON and returns known, normalized inputs. `resolveV1ImageRequest` authenticates its owner argument, loads authoritative model configuration once, validates the workspace and preset, resolves private references, then recursively freezes a cloned snapshot.

Conceptual shape:

```text
TrustedV1ImageRequest
  contractVersion: v1-image-request/1
  modulePolicy: maro-v1
  inputPolicy: existing-image-ui/1
  module: maro_imazh | maro_logo
  registryToolId: reklama | logo              (historical storage compatibility)
  userId, workspaceId
  logicalModel: flare | sunburst
  model:
    id, module, logicalModel, provider: openai, providerModelId
    enabled, isDefault, order, label, descriptor
    customerCredits, pricingStage, updatedAt, fingerprint
  prompt, normalized selections
  imageCount: 1, quality: high, size
  references: [{ id, digest, mime }]
  presetId?, presetContentHash?
  useBrain
  validated logoWizard?
  idempotencyKey?
```

The snapshot is persisted as `generation_jobs.metadata.v1_request` before reservation. Reference bytes and the hidden preset prompt remain transient sidecar values; neither is embedded in that snapshot. The existing generation record continues using compatible `reklama`/`logo` IDs and now records the actual resolved provider model. Historical rows are not rewritten.

Both provider branches and financial reservation/settlement consume the same snapshot's model, price, count, quality, size, and normalized selections. Internal Engine compilation receives the selected configuration instead of rereading model rows or computing the legacy registry price. Shadow compilation receives that same configuration without changing its compile-only role. Existing prompt builders, pipeline gates, settlement and storage mechanisms remain.

This snapshot does not yet version all legacy prompt content or Brain source contents. Prompt-version cutover is a later phase.

## Authoritative model configuration and activation prerequisite

The existing `tool_model_configs` table owns V1 runtime model configuration:

| Product setting | Existing column / JSON key |
| --- | --- |
| Module | `tool_id`: `maro_imazh` or `maro_logo` |
| Logical model | `model_id`: `flare` or `sunburst` |
| Provider | `provider`: `openai` |
| Provider ID | `metadata.providerModelId` |
| Label | `display_name` |
| Short descriptor | `metadata.description` (maximum 240 characters) |
| Enabled | `enabled`, additionally requires `coming_soon=false` to run |
| Default | `is_default` |
| Order | `sort_order` (nonnegative integer) |
| Customer price | `cost_metadata.customerCredits` (positive safe integer) |
| Price maturity | `cost_metadata.pricingStage`: `internal` or `launch` |
| Configuration identity | `id`, `updated_at`, SHA-256 fingerprint of resolved fields |

Required product rows:

| tool_id | model_id | metadata.providerModelId | is_default |
| --- | --- | --- | --- |
| maro_imazh | flare | gpt-image-2.5-flare | true |
| maro_imazh | sunburst | gpt-image-2.5-sunburst | false |
| maro_logo | flare | gpt-image-2.5-flare | true |

Flare is the confirmed V1 default. Omission requests Flare and its database row must confirm the default flag; conflicting flags fail configuration validation. `tool_engine_config.default_model_id`, environment model variables, registry fallback models and `settings.pricing.options` cannot choose or price an active V1 generation.

No prices or production rows were seeded. An operator must explicitly configure these rows before internal use, using the existing protected `POST /api/admin/engine/tools/{toolId}/models` interface (`engine.manage`) or the existing database administration process. The API accepts `modelId`, `displayName`, `provider`, `enabled`, `isDefault`, `comingSoon`, `sortOrder`, `metadata`, and `costMetadata`. For temporary internal prices, use `pricingStage: "internal"`; supply an explicitly approved positive integer, not a guessed model-price ratio. The existing admin API clears the previous default flag when saving a new default; it retains historical model rows. No API or database configuration was submitted during this task.

Absent/malformed configuration produces 503 before billing. A configured disabled model produces 400. Missing configuration is not substituted with old GPT Image 2, a registry price, zero credits, or a free generation. Test prices are fixture data only.

`GET /api/ai/image/models?toolId=reklama|logo` returns only logical key, label, descriptor, customer credits, enabled/default/order, with `Cache-Control: no-store`. It excludes provider IDs, arbitrary metadata, prompts and credentials. The existing Imazh selector and both existing price displays consume this projection. Missing configuration displays an unavailable price and disables submission; no promptbox layout was redesigned. Generation always resolves a fresh authoritative snapshot rather than trusting a displayed/client price.

## Validation rules

**Both modules:** Phase 1 alias and availability policy remains intact. Unknown fields and values are rejected rather than silently defaulted. Only omitted optional values receive defaults. Requests require authentication, one image, high quality, valid existing selections, canonical private reference IDs, and an owned workspace if selected. Client-supplied price/cost fields are rejected. Stale Fort payloads remain discarded under Phase 1.

**Imazh:** accepts explicit Flare/Sunburst, defaults omitted model to Flare. Rejects old provider IDs or unknown logical models. Existing format mapping is retained: Instagram Post/Story → 1024×1536; Facebook Post → 1024×1024; YouTube thumbnail → 1536×1024. Explicit size must agree with format. Text on/off, known fonts and available current speed choices are validated against existing input definitions, including hidden explicitly submitted values. Brain requires a boolean opt-in and an owned workspace.

**Logo:** accepts Flare only, square 1024×1024, normal speed and known presentation modes. The actual client payload now includes structured Wizard answers. Validated groups are brand (name/slogan/description/industry/other/audience), direction traits, logo type/concept intent/symbol meaning/must-include/avoid, visual style/typography/colors, and presentation. Known enums, string limits, trait/color limits and hex colors are enforced; unknown nested structure and conflicting derived selections fail. The existing client brief builder is retained; server-side brief compilation/admin Wizard editing is deferred.

**References:** at most three unique canonical private references. This matches the existing non-admin generation guard and Logo UI; Imazh's previous four-slot UI has been aligned with that existing guard. Inline data URLs and arbitrary remote URLs are not accepted as user-submitted reference identities. The existing private ownership, storage, MIME/content validation and normalization resolver runs before reservation; its normalized bytes are reused for execution.

**Workspace:** explicit inaccessible IDs return 403 and never silently fall back to another workspace. An omitted workspace may resolve to the profile's active workspace, whose ownership is also checked. Read errors fail closed. Local-only client scope markers are omitted from requests instead of being represented as owned server workspaces.

## Brain and presets

Logo normalizes a tampered boolean `useWorkspaceBrand: true` to `useBrain: false`. The image route only reads Brain for opted-in Imazh. The Engine receives no Brain workspace when disabled, and `loadCompileContext` refuses to load Brain for Logo even if an internal caller supplies workspace context. These invariants are exercised in route and storage tests. Imazh shadow compilation also omits workspace loading when Brain was not requested.

Presets use the existing `getPromptTemplate(id, expectedTargetTool)` lookup: missing, inactive, unpublished, incompatible or empty presets reject the request. Valid presets keep their existing hidden recommendation wrapping. The snapshot retains their ID and content hash; successful use increments remain unchanged.

## Side-effect order and entry-point audit

```text
bounded JSON read
→ Phase 1 availability gate
→ pure shape/selection normalization and validation
→ authenticated owner
→ authoritative model/provider/positive price resolution
→ owned workspace, published/module-compatible preset, private reference resolution
→ frozen snapshot
→ existing prompt/optional Imazh Brain preparation and execution-mode choice
→ existing job creation and credit reservation, carrying the snapshot
→ exactly the selected legacy or internal Engine provider path
→ existing persistence and settlement/release
```

Validation-error route tests assert `prepareGeneration` is never entered (therefore neither its job creation nor reservation runs) and neither provider function is invoked. Success tests change the mocked configuration after preparation and prove execution and settlement retain the previously resolved model and credits.

Reachable active clients are `ToolComposer` and `MaroLogoWizard`, through `lib/services/imageService.ts` to `/api/ai/image`. The only real OpenAI image SDK calls are in `lib/ai/openai.ts`, reached by that route directly or its internal Engine branch. Administrative Engine compilation and shadow comparisons do not invoke image providers. No alternate reachable active image endpoint bypasses the boundary. Parked generate/edit/edit-html/audio/chat routes retain Phase 1 rejection.

## Files changed in Phase 2

Paths below are relative to this repository. Other pre-existing working-tree changes belong to earlier work and were preserved.

| File | Reason |
| --- | --- |
| `src/lib/generation/requestValidation.ts` | Strict shared primitives and typed errors |
| `src/lib/generation/v1ImageRequest.ts` | Canonical parse, ownership/preset/reference resolution and immutable snapshot |
| `src/lib/engine/v1ImageModels.ts` | Authoritative row validation, positive price, IDs/hash and safe projection |
| `src/lib/marologo/request.ts` | Known Wizard answer validation |
| `src/app/api/ai/image/route.ts` | Mandatory boundary before financial work; same snapshot throughout execution |
| `src/app/api/ai/image/models/route.ts` | Public allowlisted configuration projection |
| `src/lib/ai/imageTypes.ts` | Logical model and structured Logo request fields |
| `src/lib/ai/openai.ts` | Required explicit provider model in generate/edit wrappers |
| `src/lib/engine/imageEngineRun.ts` | Snapshot consumption, explicit model forwarding and Brain opt-in |
| `src/lib/engine/storage.ts` | Reuse resolved configuration; never load Logo Brain |
| `src/lib/engine/types.ts` | Trusted configuration in compile context |
| `src/lib/engine/compiler.ts` | Use snapshot price in V1 compile estimates |
| `src/lib/engine/models.ts` | Preserve historical compatibility defaults independently of new UI choices |
| `src/lib/engine/imageShadowRuntime.ts` | Carry trusted configuration into retained shadow diagnostics |
| `src/lib/engine/productionShadow.ts` | Forward that configuration without re-resolving it |
| `src/lib/engine/shadowCompile.ts` | Reuse configuration and honor Imazh Brain opt-in for context loading |
| `src/lib/tools/registry.ts` | Current logical input choices; retain old compatibility model definitions |
| `src/lib/hooks/useV1ImageModels.ts` | Fetch safe display configuration |
| `src/lib/marologo/generation.ts` | Submit Flare and known Wizard answers |
| `src/components/app/ToolComposer.tsx` | Current model/price projection, three references, omit local scope marker |
| `src/components/marologo/MaroLogoWizard.tsx` | Configured price/label and explicit real workspace |
| `src/components/marologo/steps/StepPresentation.tsx` | Unavailable-price display and disabled submission when configuration missing |
| `src/lib/__tests__/helpers/v1ImageFixtures.ts` | Explicit test-only model prices and actual Wizard payload fixture |
| `src/lib/__tests__/v1-image-request.test.ts` | 81 input/model/price/snapshot tests |
| `src/lib/__tests__/v1-image-route.test.ts` | Route side-effect ordering, both provider branches, Brain and public projection |
| `src/lib/__tests__/v1-image-storage.test.ts` | Ownership, real preset rules and Engine configuration reuse with mocked SDK |
| `src/lib/__tests__/openai-image-safety.test.ts` | Explicit provider model forwarding with mocked OpenAI SDK |
| `src/lib/__tests__/maro-imazh-shadow-runtime.test.ts` | Prove shadow reuses V1 configuration and omits Brain without opt-in |
| `docs/MARO-V1-PHASE2.md` | Contract, configuration prerequisites and verification report |
| `docs/MARO-V1-CONVERGENCE.md` | Link the implemented Phase 2 checkpoint |

## Migrations

None. Existing `tool_model_configs.metadata`, `cost_metadata`, defaults/order columns and job JSON metadata are sufficient. No live rows, historical records or production settings were modified.

## Verification

All commands were run locally with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` explicitly empty in the test process. Tests needing SDK behavior install mocks and use dummy credentials. Live database integration tests remain skipped.

- Focused initial run: **172 passed**, 5 files.
- Full regression checkpoint: **789 passed, 11 skipped**, 61 files passed and 1 integration file skipped.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passed.
- An intermediate full run caught 16 old-fixture failures caused by registry default drift. Historical compatibility defaults were restored separately; no assertions were weakened.
- Final post-review run: **791 passed, 11 skipped (802 total)**; **61 test files passed, 1 skipped**. TypeScript passed again. This includes 120 new request/route/storage boundary tests and the additional shadow propagation test. Existing assertions were retained.
- Targeted `git diff --check` passed for the Phase 2 implementation files.
- No live Flare/Sunburst generation, provider testing, production build or deployment was performed.

## Preserved and deferred

Preserved: Phase 1 release policy, compatible historical module IDs, existing current formats, high quality/one-image UI behavior, text/reference semantics, Logo presentation and brief builder, private storage protection, opt-in Imazh Brain, existing preset system, pipeline/canary gates, legacy/shadow code, generation persistence, settlement and reconciliation. Payments/Raiffeisen were not edited.

Phase 3 remains: configure explicitly approved internal rows/prices, verify actual Flare/Sunburst generate and edit calls (both Imazh models and Logo Flare), verify real model capabilities/quality/latency/reference behavior, capture actual usage/cost, compare outcomes, and decide customer launch pricing. Minimal model forwarding is already implemented and mocked; none of that live verification has been done. Broader provider changes, prompt-version cutover, Logo admin editing, legacy/shadow removal, persistence/settlement redesign and deployment remain later work. Phase 3 has not been started.
