# MARO V1 — PHASE 6 OPERATIONAL ADMIN FINALIZATION

## PHASE 6 STATUS

**PASS — implementation and local verification complete; owner-applied Supabase migration 0049 verified through read-only inspection on 2026-09-17.**

No deployment, payment implementation/schema changes, paid generations, provider benchmarks, cleanup phase, or Phase 7 work. Existing work from Phases 1–5 and unrelated working-tree changes are preserved.

## FINAL V1 ADMIN STRUCTURE

| Page | Purpose |
|---|---|
| `/admin` and `/admin/engine` | V1 configuration readiness, published versions, enabled models/prices, job counts, recent jobs and recorded reconciliation |
| `/admin/engine/tools/maro_imazh` | Models/credits; published prompt, drafts, history, canonical preview, deliberate publication; approved production instructions |
| `/admin/engine/tools/maro_logo` | Flare price; the same prompt controls; existing Wizard content |
| `/admin/engine/brain` | Workspace ownership and actual Imazh-only opt-in behavior; no private user content editor |
| `/admin/engine/presets` | Existing preset manager; Web data marked V1.5/future |
| `/admin/engine/generations` | Durable output/history/settlement evidence, status filtering, older results and safe manual reconciliation |

Existing users/access, communications, commerce, support and audit/security pages remain. Generation models/credits live within each module rather than another shared settings store. The UI remains light-only and uses existing semantic tokens.

## IMAZH ADMIN

The owner can change Flare/Sunburst names, descriptors, order, enabled state, default, and positive integer customer credit prices. Provider identities are read-only and remain strictly allowlisted. Exactly one enabled default is mandatory.

Prompt versions use `system_prompt_versions`. The owner creates a draft from the published version, edits and saves, previews the saved draft, then explicitly publishes. History remains inspectable. Published and archived bodies cannot be edited through the draft endpoint.

Approved live production layers expose instruction content only. Their identity, conditions, priority, module and namespace stay fixed. Empty content, arbitrary condition changes and excluded namespaces are rejected.

## LOGO ADMIN

Logo remains Flare only, with no customer model selector. Its price and published prompt are authoritative. Brain remains excluded, including manipulated client requests.

The fixed content catalog covers 17 existing identities: brand name, description, audience, industry, other industry, slogan; traits; logo type, concept intent, symbol meaning, must-include and avoid; visual style, typography, colors; references; presentation mode.

Appropriate controls expose labels, help, placeholders, field order within existing sections, option labels/order, and option descriptions where the current cards display them. Existing single-choice defaults are configurable. Five optional text questions may be enabled/disabled or made required. Mandatory identity questions cannot be disabled or made optional. Industry “Other”, color validation, upload limits and all answer types stay code-controlled.

Both the customer Wizard and trusted request resolver load this content. Required/disabled optional answers are checked before reservation. Stable answer keys still feed the existing server Logo brief. Preset values cannot populate a disabled symbol-meaning question. The Wizard’s layout and specialized controls are preserved.

Storage inspection: `tool_input_fields` uses the older Engine/Fort schema/override model; the live Logo module has zero rows there. `fort_config` belongs to parked Fort behavior. Legacy `tool_prompts` is not the canonical prompt source. A single dedicated `app_settings.logo_wizard_content` column therefore reuses the settings singleton without overloading Fort or duplicating production prompts/models. A database trigger prevents legacy direct settings UPDATE permissions from bypassing the new validated admin API.

## MODEL / PRICE CONTROL

Chain: MFA-protected admin endpoint → shared production model validation → atomic `admin_save_v1_models` → existing `tool_model_configs` → safe public projection → customer display → fresh trusted request snapshot → reservation/provider adapter → durable history/settlement.

The parser now leaves an omitted Imazh model unresolved; the trusted resolver chooses the configured enabled default. Explicit model choices are preserved and disabled choices are rejected. Default selection no longer assumes Flare in code. The safe projection refreshes on page focus and every 60 seconds; generation always resolves fresh configuration regardless of display age. Logo displays the authoritative Flare cost.

Evidence:

- Local model tests changed 5 → 6 credits and a descriptor, and checked public fields plus the immutable next snapshot.
- The actual image route, with provider/database boundaries mocked, reserved 6 and returned `creditsSpent: 6` while forwarding the frozen Flare provider ID.
- Isolated PostgreSQL used a configured 6-credit snapshot to persist history with 6 credits and charge exactly once, including a repeated settlement call.
- Default switching, competing saves, disabled Sunburst, invalid defaults/prices, and Logo allowlisting were tested. Local launch configuration was restored afterward.
- Read-only Supabase inspection confirmed the approved live 5/5/5 configuration. No live prices or published prompt content were changed during Phase 6.

## PROMPT CONTROL

Chain: existing version table → isolated saved draft → shared canonical preview → deliberate atomic publication → Phase 4 `loadProductionImagePrompt` / `buildCanonicalImagePrompt`.

Production and preview still share one compiler. Only the authenticated admin preview endpoint supplies a saved draft ID. Preview reports that ID explicitly and makes no provider call. Customer requests cannot submit a draft ID.

Publication and rollback lock the module row and update old/new statuses in one transaction, preserving the existing one-live-version index. Local PostgreSQL proved that saving a draft leaves live content unchanged, publishing changes it, empty publication is rejected, and an injected publication failure restores the previous live version. Canonical tests prove draft preview does not alter live compilation.

## PRESETS

Create/edit, publish/unpublish, category, module targeting, internal instructions, featured/order and existing upload management are preserved. Imazh remains the default active view. Web remains accessible for preserved data but is labelled V1.5/future; this does not bypass public release policy. Presets were not rebuilt or deleted.

## OPERATIONS

The service-only database projection returns safe fields: time, user ID, module, logical model, provider/provider-model ID, job and generation IDs, configured/reserved/charged credits, durable output/history presence, ledger settlement, allowed failure category, provider latency, reconciliation eligibility and known saved-result recovery linkage.

It identifies provider/storage/history failures, reserved or settlement-pending work, released failures, completed jobs, stale jobs, and retained stored objects without history. Retained-output warnings require a terminal failure or stale job, avoiding a warning during normal brief persistence work. No objects are deleted.

Private prompts, full snapshots, Brain content, provider credentials and output URLs are excluded from the operational response. User identifiers are used without casually exposing email addresses.

After migration 0049, the live projection correctly returned the two existing Phase 5 records:

| Existing job | Durable evidence | Settlement |
|---|---|---|
| `e010ed82-07a4-40b7-86a4-8b4048f33d6a` | Completed; output stored; history saved as `4de70086-3fee-4929-aeac-415b259ef42b`; linked to the original failed job | Charged 5, reserved 0; no reconciliation eligible |
| `68300176-1c4e-4735-b98b-cce0c102cbc4` | History failure; output retained; history missing; retained-orphan flag visible | Released, charged 0, reserved 0; no reconciliation eligible |

Live counts were 2 total, 1 failed, 0 pending, 0 stale and 0 settlement-pending. No manual reconciliation activity was recorded. This was a service-role read of existing evidence, not a new generation, settlement action or authenticated admin-browser test.

## RECONCILIATION

The manual action requires existing `security.manage` authorization and MFA. It accepts only a valid job identifier, checks durable V1 state and a fixed 15-minute stale threshold, then calls the existing Phase 5 `reconcile_generation_job` RPC. It implements no credit arithmetic or alternate settlement algorithm. Terminal jobs return a truthful no-op result. The RPC rechecks state under database locks.

Successful calls record their returned result in the existing audit log. Recent recorded manual activity is shown. The existing ten-minute scheduled reconciliation configuration is unchanged. Historical scheduler activity was not recorded, and deployed scheduler delivery remains unverified.

Eight concurrent local reconciliation calls produced one history and one charge. Role tests deny ordinary database roles access to all new privileged functions. Admin endpoint tests preserve unauthenticated, permission and MFA rejection.

## MISLEADING CONTROLS HIDDEN

Normal active-module pages no longer expose pipeline selection, legacy/Engine switching, shadow, canary, Fort schemas, stale Brain mappings, future-provider models or disconnected legacy pricing. The Engine landing page now shows V1 operations. The feature-flags sidebar entry was removed; its implementation remains. Direct future-module workspaces are explicitly labelled developer/future and remain outside normal product navigation. No broad code deletion occurred.

## FILES CHANGED

Only Phase 6 files are listed below; preexisting dirty files are not claimed as Phase 6 work. Paths are relative to `C:/Users/nicep/Desktop/maro-al/maro-al`.

| File | Reason |
|---|---|
| [src/app/admin/page.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/admin/page.tsx) | V1 overview replaces the old dashboard |
| [src/app/admin/engine/page.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/admin/engine/page.tsx) | V1 overview replaces the Engine catalogue |
| [src/app/admin/engine/tools/[toolId]/page.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/admin/engine/tools/[toolId]/page.tsx) | Active modules use the operational workspace; future workspaces labelled |
| [src/app/admin/engine/brain/page.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/admin/engine/brain/page.tsx) | Read-only actual V1 Brain behavior |
| [src/app/admin/engine/generations/page.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/admin/engine/generations/page.tsx) | Operational generations page |
| [src/lib/admin/routes.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/admin/routes.ts) | Product navigation; hide feature flags from the normal menu |
| [src/components/admin/v1/shared.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/admin/v1/shared.tsx) | Authenticated requests and existing-token form primitives |
| [src/components/admin/v1/V1Overview.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/admin/v1/V1Overview.tsx) | Useful readiness/model/prompt/job overview |
| [src/components/admin/v1/V1ToolWorkspace.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/admin/v1/V1ToolWorkspace.tsx) | Models, prompt publication/preview, layers and fixed Wizard content editor |
| [src/components/admin/v1/V1Operations.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/admin/v1/V1Operations.tsx) | Safe lifecycle presentation and reconciliation action |
| [src/components/admin/presets/MaroPresetsWorkspace.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/admin/presets/MaroPresetsWorkspace.tsx) | Mark preserved Web presets as V1.5/future |
| [src/app/api/admin/v1/configuration/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/admin/v1/configuration/route.ts) | Permission-gated V1 configuration readiness |
| [src/app/api/admin/v1/logo-content/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/admin/v1/logo-content/route.ts) | Validated, MFA-gated Wizard content read/save |
| [src/app/api/admin/v1/operations/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/admin/v1/operations/route.ts) | Safe operations read and reconciliation endpoint |
| [src/lib/admin/v1Configuration.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/admin/v1Configuration.ts) | Reuse production model validation; guard prompt/layer edits |
| [src/lib/admin/v1Operations.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/admin/v1Operations.ts) | Eligibility checks and delegation to the Phase 5 RPC |
| [src/app/api/admin/engine/tools/[toolId]/models/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/admin/engine/tools/[toolId]/models/route.ts) | Guard V1 writes through the atomic validated model set |
| [src/app/api/admin/engine/tools/[toolId]/prompt-layers/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/admin/engine/tools/[toolId]/prompt-layers/route.ts) | Restrict V1 writes to approved existing instruction content |
| [src/app/api/admin/engine/tools/[toolId]/system-prompts/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/admin/engine/tools/[toolId]/system-prompts/route.ts) | Reject empty/invalid draft content before creating a version |
| [src/lib/engine/promptVersions.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/engine/promptVersions.ts) | Atomic V1 publication/rollback; immutable published bodies; draft status guards |
| [src/app/api/admin/engine/compile/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/admin/engine/compile/route.ts) | Saved-draft canonical preview, retaining existing MFA |
| [src/lib/generation/v1ImagePrompt.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/generation/v1ImagePrompt.ts) | Optional internal saved-draft configuration for the same compiler |
| [src/lib/engine/v1ImageModels.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/engine/v1ImageModels.ts) | Validate enabled default sets rather than hard-code Flare |
| [src/lib/generation/v1ImageRequest.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/generation/v1ImageRequest.ts) | Resolve omitted default from DB; validate configured Logo answer requirements |
| [src/app/api/ai/image/models/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/ai/image/models/route.ts) | Validated enabled-only public model projection |
| [src/lib/hooks/useV1ImageModels.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/hooks/useV1ImageModels.ts) | Refresh display configuration on focus and periodically |
| [src/lib/tools/selections.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/tools/selections.ts) | Preserve absence of an explicit Imazh model choice |
| [src/components/app/ToolComposer.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/app/ToolComposer.tsx) | Authoritative default/price/descriptor display; disabled model handling; explicit Brain opt-in |
| [src/lib/marologo/content.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/marologo/content.ts) | Fixed content identities, strict validation, supported defaults/order/answer rules |
| [src/lib/marologo/contentServer.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/marologo/contentServer.ts) | Authoritative settings-column loader |
| [src/app/api/ai/image/logo-content/route.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/app/api/ai/image/logo-content/route.ts) | Safe public Wizard content projection |
| [src/components/marologo/LogoContent.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/LogoContent.tsx) | Shared content context and field ordering |
| [src/components/marologo/MaroLogoWizard.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/MaroLogoWizard.tsx) | Load content/defaults; preserve presets; enforce configured answer rules in UI |
| [src/components/marologo/steps/StepBrand.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/steps/StepBrand.tsx) | Configurable existing question wording/order |
| [src/components/marologo/steps/StepDirection.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/steps/StepDirection.tsx) | Configurable existing direction/details wording/order |
| [src/components/marologo/steps/StepPresentation.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/steps/StepPresentation.tsx) | Configurable presentation question/help |
| [src/components/marologo/ui/LogoTypeCards.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/ui/LogoTypeCards.tsx) | Stable values with configured labels/order |
| [src/components/marologo/ui/PresentationModeCards.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/ui/PresentationModeCards.tsx) | Configured option labels/descriptions/order/default recommendation |
| [src/components/marologo/ui/SearchableSelect.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/ui/SearchableSelect.tsx) | Separate industry labels from stable answer values |
| [src/components/marologo/ui/TraitPills.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/ui/TraitPills.tsx) | Configured trait labels/order with stable values |
| [src/components/marologo/ui/TypographyGrid.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/ui/TypographyGrid.tsx) | Configured typography labels/order; retain font previews |
| [src/components/marologo/ui/ColorEditor.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/ui/ColorEditor.tsx) | Existing color question label/placeholder |
| [src/components/marologo/ui/ReferenceUpload.tsx](C:/Users/nicep/Desktop/maro-al/maro-al/src/components/marologo/ui/ReferenceUpload.tsx) | Existing reference question/upload wording |
| [src/lib/__tests__/v1-admin-configuration.test.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/__tests__/v1-admin-configuration.test.ts) | Model, content, render, layer and eligibility protection |
| [src/lib/__tests__/v1-admin-routes.test.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/__tests__/v1-admin-routes.test.ts) | Actual permission gates, MFA denial, validated saves and RPC delegation |
| [src/lib/__tests__/v1-canonical-prompt.test.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/__tests__/v1-canonical-prompt.test.ts) | Update scoped fixtures; verify saved-draft canonical parity/isolation |
| [src/lib/__tests__/v1-image-request.test.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/__tests__/v1-image-request.test.ts) | Configured default semantics and disabled-model fixture |
| [src/lib/__tests__/v1-image-route.test.ts](C:/Users/nicep/Desktop/maro-al/maro-al/src/lib/__tests__/v1-image-route.test.ts) | Invalid-default response and six-credit end-to-end route evidence |
| [supabase/migrations/0049_v1_operational_admin.sql](C:/Users/nicep/Desktop/maro-al/maro-al/supabase/migrations/0049_v1_operational_admin.sql) | Logo content column/guard, atomic configuration functions and safe operations projection |
| [tools/phase6/database-fixture.sql](C:/Users/nicep/Desktop/maro-al/maro-al/tools/phase6/database-fixture.sql) | Disposable local schema matching relevant existing columns |
| [tools/phase6/database.test.mjs](C:/Users/nicep/Desktop/maro-al/maro-al/tools/phase6/database.test.mjs) | Real PostgreSQL configuration atomicity/authorization/settlement tests |
| [tools/phase6/browser-entry.jsx](C:/Users/nicep/Desktop/maro-al/maro-al/tools/phase6/browser-entry.jsx) | Isolated synthetic UI fixture, never part of the application |
| [tools/phase6/browser.test.mjs](C:/Users/nicep/Desktop/maro-al/maro-al/tools/phase6/browser.test.mjs) | Headless UI interaction/render checks with network blocked |
| [tools/phase6/inspect-remote.mjs](C:/Users/nicep/Desktop/maro-al/maro-al/tools/phase6/inspect-remote.mjs) | Read-only safe Supabase inventory/readiness evidence |
| [docs/MARO-V1-PHASE6.md](C:/Users/nicep/Desktop/maro-al/maro-al/docs/MARO-V1-PHASE6.md) | This completion/handoff report |

Ignored local evidence is stored under `scripts/phase6-data`: database/browser result JSON, safe remote inventory, generated fixture bundle/CSS/HTML, screenshots and local PostgreSQL logs. No credentials are written there by Phase 6 tools.

## MIGRATIONS

`0049_v1_operational_admin.sql` was applied by the owner and verified against Supabase. It adds one nullable Logo content column to existing settings plus its write guard. It also provides service-only transactional functions for existing model/prompt configuration and a read-only operational projection. It creates no duplicate prompt/model store, changes no payment schema, and replaces no Phase 5 financial function.

The transactional helpers are necessary to operate existing unique-default/live-version constraints safely. Supabase schema reload is included. The owner applied the migration after accepted migrations 0047 and 0048. Read-only verification confirmed the Logo content column is accessible and the operations function returns the existing durable records. Logo content is not customized yet, so the validated existing content defaults apply. Transactional model/prompt writes and authorization were verified in isolated PostgreSQL; live configuration was left unchanged.

## TEST RESULTS

- Full Vitest regression: **942 passed, 11 skipped, 953 total**; **66 files passed, 1 skipped, 67 total**.
- TypeScript: `tsc --noEmit --incremental false` **passed**.
- Isolated PostgreSQL 17: **16/16 passed**, including concurrent writes, publication rollback, six-credit history/settlement, ordinary-role denial and direct-settings bypass prevention.
- Headless Edge, synthetic fixture with external network blocked: **5/5 passed**, including model price editing, draft/save/preview/publish, actual Wizard wording, operational states and no browser runtime errors.
- Visual review: Imazh admin, Logo Wizard and operations screenshots inspected; existing light tokens and layout retained.
- Read-only Supabase inventory after owner application of migration 0049: Logo content column and operations function available; approved live models/prices and published prompt IDs unchanged; no existing Logo Engine input rows. Both existing Phase 5 jobs show correct completion/failure, persistence, settlement and recovery linkage.
- Phase 6 provider calls: **0**. Live customer credit mutations: **0**. Temporary price/publication/settlement changes occurred only in isolated tests and fixtures.

Regression test credentials were cleared. The local PostgreSQL fixture uses text workspace IDs matching the actual schema. It runs only against loopback, never Supabase.

## FINAL APPROVED CONFIGURATION

Read-only Supabase verification:

| Module/model | Enabled | Default | Credits | Descriptor |
|---|---|---|---|---|
| Imazh Flare | Yes | Yes | 5 | Fast · Recommended |
| Imazh Sunburst | Yes | No | 5 | Alternative · More deliberate |
| Logo Flare | Yes | Yes, sole model | 5 | Fast · Recommended |

Published Imazh version remains `v1`; Logo remains `v1-canonical-phase4`. Brain is available only through Imazh opt-in. Logo excludes Brain. Web, Filma, Audio, Marketing, Fort and standalone Chat remain parked by the unchanged code-authoritative V1 policy.

## KNOWN LIMITATIONS

1. No valid real MFA-authenticated admin session was supplied/used. Real browser-to-admin preview parity remains unverified; MFA was not bypassed. Local endpoint and canonical parity tests passed.
2. The browser harness is a synthetic UI test. Live Supabase verification was read-only through the service role; live admin writes were not exercised.
3. No deployment occurred. Scheduler delivery remains unverified. Historical scheduled reconciliation activity is unavailable; only known recorded manual activity is displayed.
4. Logo field types, upload/color constraints, mandatory name/description rules, known conditions and new field creation remain intentionally fixed. No generic form builder or rule engine was introduced.

## NEXT RECOMMENDED PHASE

**V1 cleanup + production launch-readiness audit**, after Phase 6 acceptance. Not started. No deployment or cleanup is authorized by this report.
