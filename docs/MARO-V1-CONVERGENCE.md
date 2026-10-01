# MARO V1 CONVERGENCE MAP

Source audit: 17 September 2026. Working checkout: `maro-al`, branch
`feat/maroweb-visual-editor-phase2`. The sibling `maro-mcp-v1-worktree` is not
the target. The main checkout already contained extensive uncommitted changes;
those changes are preserved. No deployment is implied by this report.

V1: maroImazh, maroLogo, maroBrain, maroPresets. Web resumes in V1.5.
Filma, Audio, Marketing, Fort and standalone chat remain future scope.
Payments/Raiffeisen, auth architecture, existing data and historical migrations
remain outside implementation scope. Public signup/launch gates are unchanged.

## Subsystem map (before this implementation)

| System | Current State / Evidence | V1 Decision | Action | Risk |
| ------ | ------------------------ | ----------- | ------ | ---- |
| Imazh UI | `components/modules/ImazhWorkspace.tsx`, `components/app/ToolComposer.tsx`: existing composer, refs, Brain toggle, presets; registry model options | MODIFY FOR V1 | Keep layout; consume public model/price configuration | Medium |
| Imazh endpoint | `app/api/ai/image/route.ts`: legacy versus internal execution; fixed provider model | CONNECT TO CANONICAL V1 PATH | One validated request, prompt and execution | High |
| Logo Wizard | `components/marologo/steps/*`, `lib/marologo/{constants,defaults,validation,generation,briefBuilder}.ts`: existing structured identity flow, hardcoded content | MODIFY FOR V1 | Keep wizard; configure only known fields and validate answers on server | Medium |
| Logo endpoint/path | `lib/marologo/generation.ts` builds client prompt and sends image request; no separate Logo endpoint | CONNECT TO CANONICAL V1 PATH | Shared image route, server-built brief, Flare only | High |
| Brain | `lib/workspaces/brainProfile.ts`, `engine/brainLoader.ts`, `supabase/server.ts`: profile, keyword sources, ownership checks | KEEP / MODIFY FOR V1 | Explicit Imazh opt-in; unconditional Logo exclusion at server boundary | High |
| Presets | `lib/presets/model.ts`, `getPromptTemplate`: published active tool-matched presets; recommendation wrapper | KEEP / CONNECT | Preserve published content/config and module targeting; park Web use | Low |
| Web | `/web`, `/api/ai/generate`, `/api/ai/edit`, `/api/ai/edit-html`, project editor and generation pages are live | DISABLE/PARK UNTIL V1.5 | Shared UI/API policy, preserve implementation/history/preview | Medium |
| Filma | Registry/Engine/navigation Coming Soon; no dedicated provider route found | DISABLE/PARK UNTIL V2 | Shared policy and cross-endpoint rejection | Low |
| Audio | Registry/navigation Coming Soon, but `/api/ai/audio` calls ElevenLabs | DISABLE/PARK UNTIL V2 | Reject before provider or billing | High |
| Marketing | Stub page, future Engine definition | DISABLE/PARK UNTIL V2 | Shared release state; no image-route bypass | Low |
| Fort | Pre-existing parking in `lib/shadow/maroFort.ts`; route/compiler payload stripping and hidden UI | KEEP PARKED UNTIL V2 | Connect release policy; preserve stripping/config safeguards | Medium |
| Standalone chat | `/api/ai/chat` executable; `AssistantPanel` has no importing consumer found; `/fjale` redirects to Brain | DISABLE/PARK UNTIL V2 | Block endpoint; keep code | Medium |
| Tool registry | `lib/tools/registry.ts` owns UI options/defaults, option costs and prompt fragments | MODIFY FOR V1 | Preserve IDs/options while moving mutable production decisions to authoritative config | Medium |
| Engine registry | `engine/toolRegistry.ts` maps historical IDs and duplicates product availability | CONNECT TO CANONICAL V1 PATH | Share release policy; retain compatibility aliases | Medium |
| Compiler | `engine/compiler.ts`: deterministic brief, versions/layers, warning-oriented model validation | MODIFY FOR V1 | Reject invalid configuration; build actual executable image prompt once | High |
| Prompt versions | `system_prompt_versions`, `engine/storage.ts`, publishing routes exist | CONNECT TO CANONICAL V1 PATH | Published version must reach provider, not only dry run | High |
| Prompt layers | `prompt_layers` collected into Engine brief; image mapping rebuilds prompt without general Engine layers | CONNECT TO CANONICAL V1 PATH | Explicit ordered layers in shared final builder | High |
| Model configs | `tool_model_configs` has enabled/default/order/provider/metadata controls; registry fallback remains | MODIFY FOR V1 | Flare/Sunburst fixed logical keys; explicit provider identifier; reject missing config | High |
| Provider adapters | `engine/adapters/openaiImage.ts`, `imageEngineRun.ts`, `ai/openai.ts` | KEEP / MODIFY FOR V1 | Pass explicit resolved provider model; preserve generate/edit/ref behavior; capture usage | High |
| Pricing | `pricing.options` overrides registry contributions; Engine estimate reuses same helper | MODIFY FOR V1 | One positive configured price per module/model, same request used for billing/execution | High |
| Credits | `credits/ledger.ts`, `generation/orchestrator.ts`, migration 0027: reservation, idempotent finalization | KEEP / FIX | Verify RPC outcome and terminal status; protect success from later auxiliary failures | High |
| Jobs | `generation/jobs.ts`: durable jobs, idempotency, stale reconciliation | KEEP / CONNECT | Request/config snapshot, result reference and recoverable settlement state | High |
| Generations/history | `uploadGeneratedImage`/`logGeneration` return nullable results; route can charge despite missing storage/history | MODIFY FOR V1 | Require complete durable outputs/history before success settlement | High |
| Admin Engine | `EngineToolWorkspace`, model/input/prompt/layer/pipeline/dry-run editors | MODIFY FOR V1 | Connect operational controls; hide unsupported/migration-only controls | High |
| Legacy admin | `LegacyAdminTabs` still controls runtime `app_settings.tool_prompts` and prices | KEEP DURING MIGRATION | Migrate existing values before retiring overlapping controls | High |
| Shadow system | `productionShadow.ts` post-success hooks; comparison tooling and tables | PARK AFTER VERIFIED CUTOVER | Detach from ordinary generation; retain diagnostic work initially | Low |
| Internal/canary | `imageExecution.ts`, `internalCanary.ts`, flags and pipeline config select execution | PARK AFTER VERIFIED CUTOVER | V1 does not select a path by operator flags or user allowlist | High |
| Feature flags | `features/flags.ts`: operational and migration concepts coexist | MODIFY FOR V1 | Preserve operational safeguards; retire production path selectors after cutover | Medium |
| Availability | Tool, Engine, navigation, Hub and route decisions differ | MODIFY FOR V1 FIRST | One code-owned release policy; database cannot reopen future modules | High |
| Auth/workspaces/uploads | Existing ownership, authorization, private references, recent security changes | KEEP AS-IS | Preserve and regression-test affected boundaries | High |
| Payments/Raiffeisen | Established separate commerce/payment implementation | KEEP AS-IS | Frozen; no implementation changes | High |

## Demonstrated convergence gaps

1. `ai/openai.ts` resolves `IMAGE_MODEL` from `OPENAI_IMAGE_MODEL` or the old
   default. Generate/edit do not accept a model argument. Engine request metadata
   therefore cannot control the model actually executed.
2. `toolSelectionCostBreakdown` ignores unknown options. With base cost zero,
   explicitly invalid paid selections can calculate zero; `prepareGeneration`
   treats nonpositive cost as skip-billing. The image route does not enforce
   Engine model validation before reserving/executing.
3. `compileGenerationBrief` resolves published system instructions and layers,
   but `buildEngineImageProviderRequest` reconstructs an image prompt using
   `ctx.toolPrompts`. `imageEngineRun` returns `brief.renderedProviderPrompt`
   preferentially while sending `req.prompt`. Preview, saved prompt and provider
   prompt are not guaranteed to agree.
4. The image route's Brain condition checks `body.useWorkspaceBrand` without
   excluding Logo. The official Wizard omits the switch, but a modified Logo
   request can opt into the legacy Brain path. Engine Brain mapping is also
   overridable and needs a product-level Logo invariant.
5. Image upload results are filtered to remove failures. The route accepts a
   nullable history ID and still settles success. Displaying base64 in the
   response does not make that result recoverable in history.
6. Some reference validation and workspace/context work happens after reservation
   but before the stream's financial try/finally. Failures can strand a reserve
   until reconciliation. Validation must precede reservation; all subsequent
   work must be inside a single lifecycle boundary.
7. `completeGeneration` ignores the boolean from `finalizeCreditCharge` and
   writes credits/telemetry afterward. Completion must distinguish an already
   charged success from a failed/no-op finalization and auxiliary logging errors.
8. `inferProviderFromModule` recognizes strings containing image/logo, but the
   actual Imazh ID is `reklama`, so cost records can be labeled Anthropic. Provider
   identity must come from the resolved model, not string inference.
9. Existing Engine inputs are merged from **Fort** schema. They are not a
   production Logo Wizard content editor. Reuse table/editor plumbing, not the
   Fort field set or an arbitrary form builder.

These are source findings, not a claim that live account configuration has been
audited. Existing passing tests do not establish that these cases are safe.

# PROPOSED CANONICAL V1 ENGINE

```text
Imazh composer / existing Logo Wizard
  -> POST /api/ai/image
  -> module release policy + authentication/ownership
  -> strict request validation and normalization
  -> one production configuration snapshot
       module + logical model + provider model + credits + inputs + prompt version
  -> validate/resolve owned references
  -> Imazh-only explicit Brain context + published tool-matched preset
  -> deterministic prompt construction (one executable provider request)
  -> existing prepareGeneration / job / credit reservation
  -> existing OpenAI wrapper (explicit model, prompt, options, references)
  -> durable private assets (all expected outputs)
  -> durable generation/history record linked to the job
  -> verified idempotent settlement
  -> response with recoverable result identifiers
```

Request layer: a small server-side V1 request parser before pricing/reservation.
Known selector IDs/options only; omitted values receive configured defaults;
explicit unknown/disabled values, invalid counts/quality and contradictory Logo
models fail. Logo sends structured known Wizard answers, validated and compiled
on the server. Existing ID aliases can normalize internally without rewriting
historical database rows.

Module configuration: `lib/modules/availability.ts` owns release eligibility.
Existing tool/Engine registries remain compatibility/UI projections.
Product availability is independent of public signup/launch gates.

Model configuration: constrain existing `tool_model_configs` to two logical image
models (`flare`, `sunburst`), Flare default and Logo-only. Store explicit provider
model and positive customer credits per module/model. The default marker has one
owner, not both `tool_engine_config.default_model_id` and model `is_default`.
The resolved snapshot feeds UI display, billing, provider execution and records.

Prompt configuration: published `system_prompt_versions` and supported ordered
`prompt_layers`, consumed by one actual image prompt builder. Preserve and migrate
existing `app_settings.tool_prompts` values (including option fragments) before
ending that runtime read. Do not blindly seed over live content. Admin preview
must call the same builder; ordinary result responses omit private instructions.

Brain: reuse existing owner-scoped loaders and keyword-source matching only when
module is Imazh and opt-in is true. Off means no Brain text/assets. Logo receives
none automatically, even if a client or stored mapping requests it.

Presets: reuse published/active/module-targeted lookup and recommendation wrapper.
No new preset engine. Web data and admin maintenance remain preserved for V1.5.

Provider execution: keep `ai/openai.ts` timeout, abort and reference behavior;
change its interface to consume the explicit resolved request and return outputs
plus available provider usage/request metadata. Do not select another model on
failure, missing config or reference errors.

Pricing: positive server-managed module/model credits; no client price and no
unknown-option zero fallback. Decide supported count pricing explicitly and
record the count actually executed. Provider usage, configured estimates and
observed/recorded costs must remain distinguishable; unavailable cost is unknown.

Persistence: require all durable output refs and a durable generation ID before
success settlement. Store user/workspace, module/model/provider, normalized
request, Brain/preset usage, charge, output refs, status/times and safe errors in
existing generations/jobs metadata where possible. Preserve prior records.

Settlement: retain existing reservations/RPCs; require verified idempotent success
after persistence. A settlement outage must leave the durable result and job
recoverable for reconciliation. A telemetry failure after charging must not turn
the job into a provider failure or trigger a false refund response.

Implementation dependency: persistence and settlement corrections must be proven
before enabling the converged production path, even though the original program
lists lifecycle work later. This does not authorize a commerce redesign.

# SOURCES OF TRUTH TO KEEP

| Concern | Owner after convergence | Current duplicate to retire after migration |
| ------- | ----------------------- | ----------------------------------------- |
| Modules/release availability | `modules/availability.ts` | Independent Hub/nav/Engine live flags |
| Models/defaults | `tool_model_configs`, constrained known logical IDs | Registry list, environment model default, duplicated Engine default |
| Production prompts | Published prompt versions + supported prompt layers | Legacy app settings runtime prompts; adapter prompt reconstruction |
| Inputs | Known code schema + validated `tool_input_fields` content overrides | Hardcoded mutable Wizard copy; Fort-derived fields presented as normal inputs |
| Customer prices | Explicit module/model configuration | Registry option costs pretending to price the chosen model |
| Provider model | Resolved model configuration | Global image-model constant |
| Credentials | Server environment only | None; never include secrets in public config |
| Brain | Existing workspace profile/sources | No new memory or retrieval platform |
| Presets | Existing published preset records | No replacement system |

# CODE TO PARK

- Web workspace/provider/compiler/editor/projects and migrations: V1.5. Existing
  previews/history remain readable. Entry screens for editor/generation show
  Coming Soon instead of invoking future functionality.
- Audio provider modes and UI, Filma, Marketing: V2.
- Fort UI/schema/config/brief work: V2; stale payload stripping remains active.
- Standalone chat endpoint and unused AssistantPanel: V2.
- Shadow/canary comparisons and path selection: retained during migration,
  detached from ordinary V1 requests after canonical verification.

# CODE THAT MAY EVENTUALLY BE REMOVED

Nothing was proven safe to delete during this first phase. Candidates are the
duplicate image-route assembler, competing image model defaults, production
shadow/canary hooks and overlapping prompt/pricing admin controls. Require
evidence that V1 runtime, V1 admin, database compatibility and V1.5 preservation
do not need them. Do not rewrite/delete historical migrations.

# IMPLEMENTATION ORDER

1. **V1 availability**: shared policy; UI and server boundaries; preserve future
   code. Implemented in this checkpoint.
2. **Trusted request/configuration**: strict selectors, known Logo answers,
   normalized identity, input bounds, ownership and positive authoritative price.
3. **Models/prices**: explicit Flare/Sunburst mapping through provider execution,
   public selector/config projection, real usage collection. No guessed prices.
4. **One prompt path**: connect published prompts/layers, Brain opt-in and preset
   context; verify the executed prompt equals the recorded/admin-preview prompt.
5. **Durability/settlement before cutover**: output/history failures, partial
   storage, disconnects, finalization errors and repeated/reconciled settlement.
6. **Operational admin**: existing Wizard content/options, known Imazh inputs,
   actual production prompt/model/credit controls; preserved permissions.
7. **Verification and cleanup**: focused runtime/model comparisons, admin-to-
   generation tests, remove misleading controls; remove only proven dead code.

## Configuration prerequisites for later phases

No Flare/Sunburst mapping or explicit approved credit amounts were found in the
inspected code/config examples. Do not equate a public product label with an API
model identifier, map both to the old model, or invent price differences. Require
explicit provider model configuration, then compare provider outputs/usage in
internal testing before final customer pricing. This is not a blocker to phase 1.

## Phase 1 implementation checkpoint

- Shared release policy is consumed by tool/Engine metadata, navigation, Hub,
  module screens, Web preset availability and Fort parking.
- Web generation, both AI edit endpoints, Audio and standalone chat reject with
  `403 module_unavailable` before body/key/auth/database/provider work.
- Image route rejects future modules and unknown module values before generation.
- Job preparation repeats the availability check as defense against future callers.
  Existing-job settlement/release/reconciliation stays available for parked modules.
- Web/Filma/Audio/Marketing show release-specific Coming Soon; Web editor and
  generation page cannot mount their active workflows. Web preview/history and
  all implementation files remain present.
- Web presets cannot be applied from the public page; future preset data/admin
  tooling remains intact. Direct Web generation remains server-blocked.
- Database-shaped Engine overrides cannot reactivate future products or Fort.
- No provider model changes, credit price decisions, migrations, deployment or
  payment implementation changes are included in this checkpoint.

## Verification

- Initial baseline: 58 test files, 639 tests passed; TypeScript passed.
- The existing test setup automatically loaded `.env.local` on the initial run,
  including database-backed commerce smoke tests. They used temporary users and
  test-provider orders, with cleanup hooks; no Raiffeisen call was made. This was
  broader than the intended V1 validation. Subsequent test commands explicitly
  disable database credentials so those integration tests are skipped.
- New availability suite: 42 passing tests, covering aliases, exact live scope,
  UI projections, database-shaped overrides, actual route handlers and job guard.
- Existing Fort suite: 7 passing tests; credit lifecycle suite: 11 passing tests.
- Final isolated regression run: 58 files passed, 1 integration file skipped;
  **670 tests passed, 11 database integration tests skipped**. TypeScript passed.
- Local Next.js runtime: Web generation, both AI edits, Audio and chat returned
  `403 module_unavailable`; Filma and Marketing sent to the image route also
  returned 403. Provider/database credentials were disabled for this preview.
- Browser verification: Web displays Coming Soon V1.5 in the light UI, Audio
  displays Coming Soon V2, and the public Web preset tab is disabled with V1.5.
- No production build/deployment or live provider generation was performed.
- Live Flare/Sunburst generation, provider-cost comparisons, production admin
  configuration, durable storage and settlement verification remain future work.

**Status: phase 1 implemented; V1 production finalization is not complete.**

## Phase 2 checkpoint — trusted image requests

Phase 2 now validates and freezes a server-owned image request, reads model and
positive customer price from `tool_model_configs`, validates workspace/preset/
reference ownership, and forwards the exact resolved provider ID through the
existing adapter under the user's explicit follow-up authorization. No live
provider test, price decision, database configuration or deployment was performed.
The complete contract, activation prerequisites, changed-file inventory and test
evidence are in [MARO-V1-PHASE2.md](MARO-V1-PHASE2.md). Historical compatibility
defaults and legacy/shadow/canary systems remain present; they cannot select or
price active V1 generations. Production launch and Phase 3 live verification remain
outstanding.
