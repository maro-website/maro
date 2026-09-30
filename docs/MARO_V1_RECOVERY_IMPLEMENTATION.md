# MARO V1 recovery implementation — 30 September 2026

**Local recovery complete; NOT READY TO OPEN REGISTRATION.** No deployment, registration enablement, production DB write, payment/provider action, push, merge or permanent deletion occurred. The remaining launch checks are listed in §12. The approved light-mode fallback is used.

## 1. Final source strategy

Recovery worktree: `C:/Users/nicep/Desktop/maro-al/maro-v1-recovery-20260930`; branch `recovery/maro-v1-20260930`. Base is the exact recovered Golden commit `1a1dfb9d748bd03bb3342be26998b288961f0986`, tree `ee3a342adac36bb3a96bac8b4d8213ddac1e0056`, tag `maro-v1-golden-20260919`. This is the recovered upload snapshot, not an original historical deployment Git commit.

Golden owns generation, financial, auth, ownership, reconciliation and admin behavior. Current Paddle checkout/backend compatibility, OAuth verification, private prompt storage and patched dependencies were ported selectively from `c922dc32ec097e1725abdf28ae800971c3df33a0`. Selected latest presentation comes from the existing dirty `feature/maro-hub-redesign` checkout at `fa8f78bcfa9e3c0728b0100128f067d96ffa81cd`. Current main `32e2ecbe2598ff2d06326229c66505ee478d662b` was not used as the recovery base. Original development/Paddle checkouts and Golden archives remain in place.

## 2. Implemented M01–M32 decision map

| ID | Implementation / verification |
| --- | --- |
| M01 | Shared server policy permits Imazh/Logo generation and Brain/Presets core. Web/Case Studies are V1.5; Filma/Zo/Marketing V2. Future project pages are placeholders. Fort stays disabled irrespective of settings. |
| M02 | Golden strict Flare/Sunburst DB model and canonical request/provider mapping retained; live configuration passes the same validator offline. No environment/registry price fallback. |
| M03 | Golden validated Logo wizard, server brief, public content and model contract retained; live Logo configuration validates. Fort presentation controls extracted. |
| M04 | Golden durable output → history → verified settlement preserved in a server-only shared application used by browser and MCP. Pending settlement never claims a refund. |
| M05 | Golden reconciliation endpoint, guarded per-job recovery, runner, Dockerfile and package commands restored. Local runner/DB recovery checks pass; actual scheduled deployment remains a launch gate. |
| M06 | Golden V1 admin model/prompt/operations controls and atomic publishing retained; production RPC bodies/grants match. |
| M07 | Golden signup, resend, PKCE, recovery, callback bounds, CAPTCHA fail-closed and enumeration safeguards retained. Signup stays disabled. |
| M08 | Golden auth email hook delivery/per-token idempotency retained with current Resend dependency; mocked delivery tests pass. |
| M09 | Explicit foreign workspace/reference rejection retained before admission. Newer deterministic active-owner fallback retained; DB read errors fail closed at trusted acceptance. |
| M10 | Golden Explore private asset service-role owner enforcement retained and tested. Explore ownership infrastructure was explicitly required and was not quarantined. |
| M11 | Golden mobile collapse/result/feed behavior retained. Guest mobile composer keyboard expansion checked at 390×844; authenticated result/device checks remain pending. |
| M12 | Golden prompt, draft, keyboard, acceptance/error behavior retained. Shared JSON reader now stops oversized streamed bodies by UTF-8 byte count; MCP uses it too. |
| M13 | Brain editor/storage and workspace ownership retained. Browser Brain remains opt-in; standard MCP requests do not silently include private Brain material. Web-specific generation/integration remains inaccessible. |
| M14 | Golden workspace CRUD plus current safe active-owner fallback retained. RLS expressions verified on synthetic local users. |
| M15 | Golden multi-tool presets, privacy and release filters retained. |
| M16 | Golden private previews, owner-scoped history, pending recovery and avatar fallback retained. Exact-key completed MCP replay uses durable history rather than optional pricing telemetry. |
| M17 | Selected latest lime logos/assets/tokens ported. Text accents use contrasting green; lime buttons/email CTA use dark text. Zoom remains enabled. |
| M18 | Selected latest Hub, Imazh/Logo/Web/Filma media and required shell/layout presentation ported. No shader/lab imports added. |
| M19 | Local Case Studies/content/assets preserved in the development checkout and excluded from recovery runtime. Only a V1.5 placeholder/navigation entry is active. |
| M20 | Showreel source preserved at its original checkout location; excluded from recovery. |
| M21 | hub-bits, Brain mock, dark preview, shaders and local experimental modules excluded. Golden hub-lab source moved into quarantine with hashes. |
| M22 | Golden launch/waitlist/login-ad safeguards retained. Signup closed state verified in the production build. External launch configuration unchanged. |
| M23 | Golden account/history surfaces retained; existing membership fields/renewal mode remain provider-aware. Purchase/portal CTAs removed. No OAuth account revocation panel was found in either source; the earlier audit's suggestion that one existed is not substantiated. |
| M24 | Spendable balance is `max(0, profiles.credits)`; reserved credits are not subtracted twice. Renewal/top-up availability is false for this release. Existing paid entitlements remain intact. |
| M25 | Golden legal rights/refund/privacy/cookie text retained with minimal module/closure/subscription/provider corrections. Operator/contact and operational legal facts need launch confirmation (§12). |
| M26 | Current verified MCP OAuth issuer/audience/client/expiry/user/permission checks, consent/discovery and privacy retained; adapted to trusted V1 execution. Prompt-only approximate completed replay removed. |
| M27 | Golden ownership/upload/SSRF/rate/abuse/admin-MFA/service isolation/preview protections retained with current shared headers. Role grants and local RLS behavior verified; real staged sessions remain pending. |
| M28 | Current locked Next 15.5.26, sharp 0.35.5, MCP SDK 1.31.0 and associated dependency/workspace patch retained; build/typecheck pass. Security CI restored from current source. |
| M29 | Golden test isolation restored and extended to Paddle/DB secrets. Ordinary tests block non-loopback fetches; production smoke integration remains skipped. |
| M30 | Only proven route/UI groups isolated; originals and manifests preserved. Required Fort schema/config/types used by the shared Engine remain as disabled compatibility infrastructure. No archive/backups/security migrations removed. |
| M31 | Applied Paddle schema/wrappers, webhook authenticity/idempotency, provider fields and paid-state compatibility preserved. Checkout/portal/product routes deny requests even if external flags are enabled. |
| M32 | Distinct `v1-recovery-20260930` marker, source/hash manifests and reviewed local branch; Golden release/archive marker is not reused. No production migration chain was rewritten. |

## 3. Files restored from Golden

The worktree started with the entire exact Golden tree. Critical retained groups include `src/lib/generation/v1Image{Request,Prompt,Persistence,Observation}.ts`, `src/lib/engine/v1ImageModels.ts`, `src/lib/credits/ledger.ts`, `src/lib/generation/orchestrator.ts`, `src/app/api/cron/reconcile-jobs/route.ts`, `tools/reconciliation/*`, V1 admin routes/components, `src/app/api/auth/*`, `src/app/auth/callback/route.ts`, `src/app/api/explore/publish/route.ts`, upload/private-reference/preview/security helpers, workspace/Brain/preset/history core and all 49 Golden migration files.

The image route delegates to `src/lib/generation/v1ImageApplication.ts`, extracted from Golden without replacing its trusted pipeline. The migration files remain historical recovery sources; their differing number lineage must not be pushed against production.

## 4. Selectively ported files

`docs/evidence/selected-source-ports.json` records each selected input and its source SHA-256. Presentation ports include public/design-system logos, email symbol, final tokens/layout/primitives, selected Hub components/CSS/media, AppShell/AppTopNav/AppHeader and color-only hunks in existing Golden files. `src/styles/maro-compat.css` was corrected for dark text on lime; email behavior stayed Golden.

Current compatibility ports include MCP/OAuth/discovery, private prompt projection, provider-aware memberships/types/entitlements/order APIs, Paddle webhook/config/backend, guarded legacy payment paths, dependency lock/workspace/security headers and security CI. Older current/local compiler, storage, orchestrator, auth and image application files were not copied over Golden.

## 5. Quarantined groups

No existing grave could be positively identified. `quarantine/20260930/PROVENANCE.json`, `ADDITIONAL_PROVENANCE.json` and `non-v1-routes/PROVENANCE.json` record preserved originals and paths/hashes. These cover Fort UI/admin sections, old hub-lab, purchase flows, Paddle UI originals, Web/project routes and unapproved community/learning route originals. Public contests/kreator/academy are unavailable; shared existing admin/data/security compatibility remains.

Showreel, hub-bits, marobrain-test, Case Studies, development dark preview, unused shaders and experimental future module work remain preserved in the original development checkout and are absent from recovery. Quarantine is excluded from TypeScript, Railway upload and Docker context. Required Engine schema/types, auth/security/credit/reconciliation/Paddle backend, migrations, evidence, backups and Golden archives were not graved. Git records moved paths as removals/additions; preserved bytes remain in quarantine.

## 6. Production DB compatibility checks

`docs/evidence/production-contract-20260930.json` records verified TLS/hostname, an explicitly READ ONLY transaction and rollback. Queries read catalog metadata and non-user product configuration; no financial RPC, provider call, user rows or writes occurred.

All Golden reserve/release/finalize, lifecycle, durable history/settlement/reconciliation, transition guard and V1 admin function bodies match production except edge whitespace. Expected sensitive functions deny anon/authenticated and allow service role. Trigger and history/charge/idempotency indexes are present; `generations.workspace_id` and `workspaces.id` are TEXT. RLS is enabled on all 10 inspected tables; internal prompts have no ordinary-user policy. Product model sets, unique nonempty live prompt counts and Logo content validate with recovery code offline.

Paddle fulfillment/cancel wrappers intentionally differ from Golden and match current applied `0047_paddle_billing.sql`; create/event functions and the MCP claims hook also match current source (`current-db-body-comparison.json`). Production ledger retains `20260929150544 remote_schema` and `20260929223117 0047_paddle_billing`. Current 0045–0047 privacy/OAuth/Paddle SQL is preserved under `docs/db-history/current-main`, outside Golden's colliding numbered migration chain. **No migration is required or proposed. Do not run a migration push/reset as part of recovery.** Earlier documentary financial hashes used a different/unspecified representation; this pass compares actual function bodies directly rather than treating those hashes as proof.

## 7. Financial, security and auth verification

Code boundaries and catalog contracts were reviewed separately from tests. Golden accepts validated model/workspace/private references/published prompts before reservation/provider work, stores verified owner/job output, requires durable history/evidence before charge, and separates optional telemetry from committed settlement. MCP shares that application; exact completed replay is owner-scoped and does no new financial/provider work.

Tests cover failed storage/history/settlement, duplicate/replay/disconnect, ownership, private prompt/reference/asset protections, unauthenticated denial, privileged RPCs, callback/PKCE/enumeration/rate limits, upload bytes/MIME, preview/SSRF and admin protections. Actual production RLS expressions were executed only against synthetic local data. Signup/email/session tests use mocks; no real account, email, provider or Paddle action was performed. Minimum password length remains 10.

## 8. Reconciliation status

Golden endpoint and `tools/reconciliation/{run.mjs,run.test.mjs,Dockerfile}` are present. Runner tests: 26 pass. Local PostgreSQL stale-storage recovery settles once; missing storage releases once and terminal jobs cannot resurrect. Live routine bodies/grants match Golden.

Historical audit evidence proves the September 18 scheduled run, not current scheduling. Current Railway service root/builder/schedule/secret wiring and a post-recovery scheduled run are unverified; prior read access was unauthorized. No Railway configuration or job was changed or triggered. Proposed runner service root/build context remains `tools/reconciliation`, with its own Dockerfile.

## 9. Qelt / Mshelt status

Qelt light mode is retained, with `maro.theme=qelt` persisted and accessible accent text/button tokens. The old light-only `mshelt` label was corrected. Mshelt dark mode is not implemented: the development preview needs broad page-specific overrides, whereas core pages/modals use fixed light styles. Promoting it would require the architectural theme migration the request explicitly permits deferring. No dark switch or incomplete dark promise is shown. Both-theme readiness cannot be claimed.

## 10. Focused test results

- Initial risk-focused pass: **655 tests / 36 suites passed**, before any full validation.
- Actual independent PostgreSQL 17 sessions on a new loopback-only disposable DB: **15 financial checks passed**, including concurrent reservations/finalizations, rollback, process-loss state recovery, race/idempotency and role denial (`financial-postgresql.json`). No production/customer data used.
- Runner: **26 passed** (`reconciliation-tests.txt`).
- Final recovery-specific checks: **34 tests / 7 suites passed**, including streamed request bounds, MCP replay/settlement, purchase gates, actual catalog-derived RLS expressions and offline current product-config validation. Original structural tests were adapted to the shared application/new closed-product policy; guards and behavioral assertions were retained.

## 11. Full validation results

Full suite: **1,135 passed; 11 intentionally skipped; 86 passing suites and 1 skipped suite**. Skips include live mutating Supabase smoke tests and pre-existing integration-only cases; they are not successful live verification.

Typecheck: pass. Lint: pass with three pre-existing hook-dependency warnings in cards, ToolComposer and Logo draft restoration. Production build: pass with signup false and production DB/provider credentials absent. The warnings remain recorded; validation is not a substitute for launch runtime proof.

Local production-build browser review at 390×844 and 1440×900 checked selected Hub/media, no horizontal page overflow, mobile navigation/prompt keyboard expansion, closed signup, catalogue prices and no purchase CTAs, future-module notice and factual legal notice. Logo correctly fails closed without a configured database; real published config is separately validated offline. Authenticated account/Brain/workspace/history/result flows and mobile touch behavior were not claimed as live browser passes. See `docs/evidence/browser-review.json`.

## 12. Exact remaining launch blockers

| Gate | Evidence / closure required |
| --- | --- |
| Auth and delivery end-to-end | `public-auth-phase9`, `auth-recovery-flow`, `auth-resend-idempotency`, email tests pass with mocks; no real confirmation/resend/recovery/email delivery or authenticated browser session was used. Verify these with disposable staging accounts, including expired token, logout, CAPTCHA and redirects. |
| Authenticated product/device flows | Local no-credential Logo returns `logo_content_unavailable`; current configuration passes offline validation, but no authenticated browser Imazh/Logo result, Brain/workspace/preset/history/account flow or mobile touch result was exercised. Run these in staging with disposable data and mocked/disposable provider access. |
| Reconciliation deployment wiring | Runner source/26 tests/15 DB checks pass. Current Railway root/builder/schedule/secret linkage and successful scheduled log after this candidate are unverified; prior audit §6 records unauthorized current access. Confirm wiring without a production write in this task; validate scheduled behavior during separately authorized rollout. |
| External auth/MCP/security configuration | Function/claims bodies/grants are verified; actual OAuth hook enablement, allowed redirect/origin configuration, Turnstile, email-hook delivery credentials and current admin MFA/session behavior remain outside this local evidence. Validate staging configuration and obtain current production configuration evidence before opening signup. |
| Legal/operator operational confirmation | Minimal factual corrections are applied. Current operator/address/support contact, processor/retention disclosures, cancellation/refund support for existing automatic subscriptions and account-deletion handling require operator confirmation. Historical official tax data supports name/NUI, not current contact or compliance: [Kosovo Tax Administration business list, 2020](https://www.atk-ks.org/wp-content/uploads/2020/03/Lista-E-bizneseve-sipas-MEPTINIS_ENG.pdf). Do not treat retained legal citations/copy as current legal approval. |

Mshelt is a documented deferred theme requirement under the user's permitted light fallback, not an implemented feature. No financial-contract conflict, data-loss risk, required migration or unresolved quarantine dependency was found. No action requiring one of the stated stop conditions was guessed or performed.

## 13. Final registration verdict

**NOT READY TO OPEN REGISTRATION.** Keep `NEXT_PUBLIC_SIGNUP_ENABLED=false` for the candidate build/deployment. The route and safeguards are prepared; §12 evidence must be completed before a separate explicit registration-open decision. A staged runtime pass and separately authorized deployment are still required. New purchases remain closed regardless of existing Paddle/legacy flags.

## 14. Exact proposed deployment diff/source

The proposed source is this recovery worktree/branch, based on Golden with the selected changes above, identified by `public/ui-release.json` as `v1-recovery-20260930`. `docs/evidence/recovery-source-manifest.json` gives relative paths, SHA-256 and changes against both Golden and current main; `recovery-against-golden.patch` records tracked changes. The worktree contains the additional files/media/quarantine; a tracked-only patch alone is insufficient.

Use the reviewed recovery tree, not the older dirty checkout/current main/Hub backup, and do not automatically merge unrelated root histories or migrations. The final local commit at the tip of `recovery/maro-v1-20260930` freezes this candidate. Golden base, source manifest hash, provenance checks and validation evidence hashes are recorded in `docs/evidence/recovery-source-identity.json`; the patch excludes verification artifacts to avoid recursive hashes. Exclude credentials, dependencies, build output, local test DB, recovery-only tools/evidence and quarantine from runtime upload/context. The existing external production configuration/secrets are unchanged; preserve Paddle webhook backend configuration while keeping the candidate signup flag false. This report authorizes no deployment or registration change.

## 15. Rollback / recovery reference

Preserved Golden checkout: `C:/Users/nicep/Desktop/maro-al/.v1-restored-release-20260919`; archive: `C:/Users/nicep/Desktop/maro-al/golden-recovery/maro-v1-golden-20260919`. Historical Golden Railway deployment: `8f82feb5-b092-4e2c-8bb3-a51bfd84be49`, marker `v1-restored-20260919`. Current main/development/Paddle identities are recorded in §1. All quarantined originals remain recoverable with provenance hashes.

Before a separately authorized rollout, preserve the actual current deployment artifact/configuration and select a tested rollback artifact that keeps applied Paddle/backend/security compatibility and closed purchase/signup gates. A raw pre-Paddle Golden upload is not an automatically approved rollback of billing. Roll back application artifacts only; do not reverse 0047, reset/drop production objects or use tests as production repair scripts. This task changed no production data and needs no production DB rollback.
