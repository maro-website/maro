# MARO GOLDEN RECOVERY AUDIT

Audit date: 2026-09-30, Europe/Berlin. **Audit only. Recommendations are not product decisions or authorization to implement them.** The only repository write in this audit is this document. No implementation, cleanup, grave move, Git mutation, deployment, migration, environment change, Railway change, Paddle action, or production write was performed. No full test or build suite was run.

## 1. GOLDEN POINT IDENTIFICATION

### Exact source and deployment relationship

The Golden identifier **`8f82feb5` is a Railway deployment prefix, not a resolvable Git commit**. The full recorded deployment is `8f82feb5-b092-4e2c-8bb3-a51bfd84be49`, for service `maro`, described as “Fix V1 release packaging: include required design-system CSS and complete source”. It was uploaded from a prepared working-tree snapshot containing accepted, uncommitted V1 changes. Choosing the GitHub commit that happened to be current that day would select the wrong source.

The exact preserved source is:

| Identity | Value |
| --- | --- |
| Saved release directory | `C:/Users/nicep/Desktop/maro-al/.v1-restored-release-20260919` |
| Preserved Git commit | `1a1dfb9d748bd03bb3342be26998b288961f0986` |
| Tree | `ee3a342adac36bb3a96bac8b4d8213ddac1e0056` |
| Annotated tag | `maro-v1-golden-20260919` |
| Tag object | `a458c13e6e2263fe51720f13c41cd447408ed772` |
| Release marker | `v1-restored-20260919` |
| Complete source manifest SHA-256 | `78a88c35896bdec6acd85dc05795617c69fc5fd9c305172427cd18fe1577e6e3` |
| Original 1,081-file manifest SHA-256 | `8246235f63bcec4ab41e2875d8efd58c6ed04aa0cc24cec7ae2f92e917c139ff` |
| Recovery bundle SHA-256 | `3d7416473d518a2e5339534e7a0f5bf6d2d75a03c4b8d6f4b4c60274232a6b47` |

The preserved Git commit is a **recovery root commit created on September 27**, not a commit claimed to have been deployed on September 19. It has no ordinary ancestry relationship to current main. Its tree is the recovered uploaded snapshot. Do not mechanically merge or cherry-pick that root commit into main.

### Evidence and confidence

The audit checked Git history, reflog, branches, objects and commit titles first. `8f82feb5^{commit}` does not resolve. The stronger evidence is the contemporaneous deployment record and independently preserved source:

- `C:/Users/nicep/Desktop/maro-al/DEPLOY-RECOVERY.md` records the accepted V1 working tree, packaging failure `83968693-442a-4e25-8587-1785f06209d0`, missing required design-system CSS, corrected deployment `8f82feb5-b092-4e2c-8bb3-a51bfd84be49`, and the warning that older GitHub main would overwrite the uploaded release.
- `C:/Users/nicep/Desktop/maro-al/v1-restored-source-manifest.json` identifies the original 1,081-file source set. The release includes those files plus `.railwayignore` and `public/ui-release.json`: **1,083 files total**. Environment files, `.github`, `.vercel`, `.cursor`, and `vercel.json` were excluded from the uploaded release.
- `C:/Users/nicep/Desktop/maro-al/golden-recovery/maro-v1-golden-20260919/identity.json`, `original-source-manifest.json`, `source-sha256.json`, `RECOVERY.md`, `VERIFICATION.json`, `golden.git`, and the bundle preserve source identity and provenance.
- **This audit rehashed all 1,083 saved files and compared them with the preserved Git blobs: all match byte-for-byte.** It also verified the manifests and bundle digest. This is an exact preserved source baseline, not an approximate commit.
- The archive records an HTTP 200 production release-marker check on September 27 showing `v1-restored-20260919`. That is historical evidence, not a fresh production check.

**Confidence:** HIGH in exact preserved snapshot identity; HIGH in its association with the recorded Golden deployment through the deployment record, manifest and historical marker. Independent byte verification of the original running Railway container is unavailable; archive metadata explicitly records `production_bytes_independently_verified: false`. Current Railway access returned `Not Authorized`, so this audit cannot independently retrieve that deployment's original uploaded archive or today's running image. This limitation does not justify substituting another Git commit.

### Source and evidence notation used below

| Label | Absolute location / meaning |
| --- | --- |
| G | `C:/Users/nicep/Desktop/maro-al/.v1-restored-release-20260919`, identical to Golden tree above |
| L | `C:/Users/nicep/Desktop/maro-al/maro-al`, current original development checkout, including dirty and untracked files |
| P | `C:/Users/nicep/Desktop/maro-al/maro-paddle`, Paddle checkout at `c922dc32ec097e1725abdf28ae800971c3df33a0` plus its dirty readiness document |
| MAIN | GitHub main `32e2ecbe2598ff2d06326229c66505ee478d662b`, independently confirmed through the GitHub connector during this audit |
| E1 | Container `DEPLOY-RECOVERY.md` and Golden recovery archive listed above |
| E2 | Git objects, reflogs, worktree status, ancestry, targeted G/L/MAIN/P diffs |
| E3 | G `docs/MARO-V1-PHASE8B.md`, `docs/MARO-V1-RAILWAY-SETUP.md`; L `scripts/phase8b-data/final-platform.json`, `scheduled-runtime.json`, `scheduler-gate.json` |
| E4 | G `docs/MARO-V1-PHASE9.md` and associated auth/email source |
| E5 | P `docs/paddle-production-readiness.md`, `paddle-file-audit.md`, `paddle-review.md`, `paddle-testing.md`; distinguish its uncommitted post-deployment observations |
| E6 | Read-only production Supabase REST schema, bucket metadata, exact aggregate counts and constant lifecycle-version RPC checked on September 30 |
| E7 | Local feature documentation and targeted dirty/untracked source reads; filesystem dates only corroborate local work, not deployment |

“Current production” in the matrix means **the reported Paddle deployment's code, associated with confirmed MAIN**, unless explicitly marked live DB evidence. Its exact currently running Railway revision was not independently verified. Public website requests returned 403 from this audit environment; that does not establish that ordinary users receive 403. Saved runtime reports are labeled historical. There is no claim that every source finding was reproduced against live production.

## 2. WHAT HAPPENED

The accepted V1 release lived in a local working-tree upload while GitHub main remained older. That older main included the creative Hub/MCP lineage but lacked the accepted V1 settlement, auth, mobile and operational changes. A September 19 Hub push had already caused an older-source overwrite; the deployment recovery record says the uploaded Golden release corrected it afterward.

On September 29, Paddle was branched from **`origin/main` at `fa8f78bcfa9e3c0728b0100128f067d96ffa81cd`**, rather than from the preserved Golden snapshot or the complete original development work. Paddle was then merged into main at `32e2ecbe...` and deployed according to the local readiness record. It carried the older application underneath the new payment integration. The principal regression is therefore **a source-baseline replacement**, not proof that Paddle-specific edits deliberately removed every feature.

The original development checkout is also insufficient as a wholesale recovery source: it was reset/checked out onto that older lineage on September 22 and now contains valuable newer UI work mixed with older backend behavior. Its latest branding/Hub/case studies were not necessarily ever deployed. The full September 20 stash includes an untracked-files parent containing important V1 files; inspecting only its tracked tree would falsely suggest those files were lost. The exact Golden archive is the stronger recovery baseline.

Production database evolution followed a different path. **Live production still exposes V1 settlement, operational admin and reconciliation RPCs; the lifecycle-version RPC returns `2`. Paddle tables/columns/RPCs also exist.** Older code is now paired with a database containing newer safeguards. Restoring code must preserve that database rather than replaying older migrations over it.

Two observations require correction before recovery decisions:

- **Golden intentionally made maroWeb “coming soon” for V1.5 and parked maroFort/chat for V2.** Those statuses are explicit release policy. Golden did not ship an active Web/Fort product to restore automatically. Current source retains the policy file but bypasses several consumers and brings back older Fort/Web behavior.
- **The design system has not disappeared wholesale.** Required `maro-final` token/component CSS is present in main and semantically unchanged against Golden. Mobile behavior and component wiring differ; the newer green branding exists locally. The original CSS packaging failure was fixed in Golden and must not be conflated with those later changes.

## 3. CHANGE TIMELINE

Commit timestamps include their recorded timezone; local file dates are only filesystem evidence. Pre-Golden rows explain ancestry and safeguards, not newly invented post-Golden features.

| Period / source | Meaningful change set | Where it exists / production relation |
| --- | --- | --- |
| August 18, `b1ac3ab82222f604b7088117ec85238da0b79e58` | Stale generation failure lifecycle, `/api/cron/reconcile-stale-jobs`, SQL reconciliation, ten-minute schedule | Pre-Paddle infrastructure. Endpoint and old migration survive main; Golden later hardens the algorithm and adds Railway runner. |
| August 18–22 | Security S1–S4/CI hardening, account/admin/design system, workspace/Brain/presets and visual editor changes | Mostly shared ancestry. `4a9075ae...` security lineage; `2db574a73f28e1d6b32b3c40f9dcb23a911a929d` is the August 22 local phase-2 state. Do not describe all of these as missing. |
| August 24–25, MCP lineage ending `111991f6b37f95da975a82882aa14e3f61edb6ae` | Private OAuth, service-only internal prompt history, shared Brain/context, MCP image integration, completed-job/retry recovery | Present in older-main lineage and reintroduced by the later deployment. These predate Golden by calendar, but are not all in the uploaded Golden tree. Preserve privacy and reviewed integrations when adapting to V1. |
| September 17–19, accepted local V1 phases | Trusted Flare/Sunburst request/configuration, Logo briefing, durable storage/evidence/settlement, release availability gates, mobile composer/results, V1 admin, launch surfaces, auth/email corrections | Exact G source and phase documents. Accepted working-tree work was not fully represented by a GitHub commit. |
| September 18, scheduled runner proof | Dedicated `maro-reconciliation` service executes the guarded endpoint successfully at the actual 12:40 UTC schedule | E3 provides scheduled logs and platform metadata, not merely a manual invocation. |
| September 19, 03:04:54 +02, `fa8f78bc...` | Creative studio Hub with Filma preview pushed from older main | E1 and `.hub-backups/before-hub-vision-20260919/PUSH-RECEIPT.txt` show push and overwrite risk. Older GitHub source replaced accepted V1 until corrected release upload. |
| September 19, corrected deployment `8f82feb5...` | Complete accepted V1 source packaged with required design-system CSS | GOLDEN. Exact snapshot preserved and reverified. |
| September 20, 23:53:57 +02, stash `d56c6862...` | Local V1 work saved, including untracked V1 generator/auth/admin/reconciliation files and migrations | Tracked/index/untracked stash parents matter. Untracked parent `7958fa9c...` retains critical files. Not an independently deployed release. |
| September 22 checkout/reflog | Main advanced to older `fa8f78bc...`; `feature/maro-hub-redesign` created on that lineage | Explains why L has older backend despite newer local presentation work. Tag `production-2026-09-22` also points at `fa8f78bc...`; its name does not prove Golden identity. |
| September 23–28, local files | Showreel (Sep 23), Hub bits lab (Sep 24), case studies (Sep 26), Brain mock lab (Sep 27), newer Hub/green brand/dev dark preview (Sep 28) | Dirty/untracked L work. No commit/deploy proof. Case-study record explicitly says not committed/pushed/deployed. Dates are filesystem timestamps. |
| September 27 | Golden source archived as root commit `1a1dfb9d...`, annotated tag and bundle; historical release-marker check | Preservation only. Does not put Golden changes into current main. |
| September 29, 15:15:36 +02, worktree reflog | Paddle worktree created from `origin/main` = `fa8f78bc...` | Exact wrong-baseline source is established, not inferred solely from UI symptoms. |
| September 29, 21:24:45 +02, `2b2eb0e47627c6df16657c444274999d4fbb06cd` | Paddle gateway, DB migration, routing, subscription/top-up/portal and webhook integration | P and MAIN. Treat as PADDLE / QUARANTINE. |
| September 29, 23:25, `65d122a8dc1321aa519dee5ca9659b54b338ed4b` | Production readiness documentation | Contains applied migration/configuration evidence; later runtime notes remain dirty locally. |
| September 29, 23:33, `c922dc32ec097e1725abdf28ae800971c3df33a0` | Dependency/security patch and lockfile updates | P branch `feat/paddle-production-config`; preserve separately from payment product decisions. |
| September 29, 23:36:11 +02, `32e2ecbe...` | PR #1 merge into main; deployment documented locally | Confirmed current GitHub main. Actual latest running Railway deployment association remains documentary/user evidence. |
| September 30, this audit | Exact source/hash verification; GitHub main read; production schema/buckets/aggregate-only checks | Confirms DB coexistence and no active credit reservations in this snapshot. No production mutations. Railway current metadata unavailable; public site reads blocked from this environment. |

Raw G→MAIN diff: 472 files, +33,746/-37,611 lines. Ignoring end-of-line whitespace: 378 files, +9,511/-13,376. G→`fa8f78bc...`: 335 files, +6,729/-13,178. Large CRLF-only changes, especially Brain/shared migrations, were filtered before classifying behavior. No additional meaningful remote post-Golden core feature series was found between that main base and the Paddle merge.

## 4. DECISION MATRIX

IDs cover meaningful feature groups, not every changed filename. All classifications are technical recommendations. “G/L/P” resolves to the absolute source locations in section 1. “Missing” means source behavior absent from MAIN/P; live UI reproduction is not implied.

| ID | Feature / change | Golden Point state | Latest local state | Current production state | Where source currently exists | Production DB dependency | Security impact | Dependencies | Suggested classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | Release availability: Web, Fort/chat, Filma/audio/marketing | Web V1.5 coming soon; Fort/chat parked V2; only Imazh/Logo generate in V1; enforced across routes/engine/UI | Older Web workspace/Fort paths restored; policy file remains with incomplete consumers | Older behavior; exact visible state unverified | G module availability and route/registry gates; P/L old workspace/Fort plus policy file | Existing module/entitlement config; no automatic new migration | Lost server policy gates can expose unapproved generators; Fort entitlement checks still exist | Routes, tool registry, shadow/parity, navigation, server policy | REVIEW |
| M02 | Imazh canonical model/request/provider configuration | Trusted Flare/Sunburst logical IDs, DB provider mapping, cost snapshot, one output, strict input | Older shared image application service plus local UI changes | Legacy/env model path despite live V1 model rows | G `engine/v1ImageModels.ts`, `generation/v1ImageRequest.ts`, `v1ImagePrompt.ts`, image route; P/L application service | Model rows and published V1 prompts; live launch models enabled at 5 credits | Prevents client price/model/prompt ambiguity; immutable execution provenance | M04, M06, M09; provider adapter and UI DTO | CRITICAL RESTORE |
| M03 | Logo wizard/content/server brief | Validated wizard, server-authored brief, Flare only, content/model endpoints, result/history links | Older wizard survives; local styling; new server contracts missing | Older Logo compile/UI path | G `marologo/request.ts`, `draft.ts`, `/api/ai/image/logo-content`, V1 model route; P/L older wizard | Logo configuration/content and admin V1 RPC | Structured server validation and trusted prompts lost | M02, M04, M06; wizard version and presets | CRITICAL RESTORE |
| M04 | Durable image lifecycle, credits, provider evidence, telemetry | Reserve/start; hash-check stored result; history linkage; DB-positive settlement; pending recovery; financial outcome independent of optional telemetry | Older backend; completed-job replay from MCP lineage retained | Legacy upload/history best effort can precede success/finalization; DB safeguards still present | G orchestrator, `v1ImagePersistence.ts`, jobs/credits; P/L application service and cleanup | V1 start/mark/persist/settle/fail RPCs, ledger, triggers, workspace IDs; live version 2 | P0 money/data consistency; acknowledgment and available-credit semantics mismatch | M02/03, M05/06, storage, DB contract, timeout/replay | CRITICAL RESTORE |
| M05 | maro-reconciliation service and endpoint | Dependency-free runner + scheduled Railway service; endpoint invokes safe per-job DB reconciliation | Runner directory/package commands absent; endpoint uses older cleanup | User reports missing-Dockerfile build failure; current schedule/logs inaccessible | G `tools/reconciliation/*`, cleanup, E3; L historical platform JSON; P old endpoint/SQL | Both reconciliation RPCs live; preserve V1 evidence-aware settlement | P0 abandoned reservations, false-positive health, stale-job settlement | M04, CRON_SECRET, source root/Dockerfile config, existing service | CRITICAL RESTORE |
| M06 | V1 admin operations, model controls, atomic prompt publish | V1 status/operations, validated models, atomic prompt publishing and Logo content | Older generic admin remains; new controls missing | New RPCs live but corresponding V1 UI/server controls missing | G admin V1 routes/client/schema, `admin_v1_operations`, `admin_publish_v1_prompt`; P generic admin | Live V1 admin RPCs and content/model rows | Avoids inconsistent published prompt/version/price changes; admin MFA baseline remains | M02/03/04; service-role permissions | CRITICAL RESTORE |
| M07 | Registration, resend, reset/PKCE, callback | Real SSR signup confirmation; resend endpoint; bounded/limited requests; fail-closed CAPTCHA; guarded recovery callback | Reverted signup/reset routes | Admin-create-user signup, missing resend; stateless reset and weakened callback guards | G `auth/publicAuth.ts`, auth routes/pages, E4; P/L older auth | Supabase auth, native signup/confirmation settings and app feature flag | Enumeration, abuse and callback/referrer safeguards weakened; confirmation flow regressed | M08, Turnstile, SSR cookies, email hook, production config | CRITICAL RESTORE |
| M08 | Auth email hook delivery/idempotency | Per-token key; signup avoids uncommitted-user FK; correct email-change delivery/SDK idempotency | Old user/action dedupe and delivery behavior | Reintroduced old hook behavior; signature verification remains | G/P auth-email hook and email send implementation, E4 | Hook settings, email logs and FK, Resend sender/key | Confirmation/reset replay and delivery reliability; wrong email-change handling | M07, proper URLs, sender/domain verification | CRITICAL RESTORE |
| M09 | Requested workspace and private reference validation | Explicit foreign workspace rejected before reserve; canonical owned references; max three | Active-workspace ownership fallback improved, but explicit requested workspace can fall back; reference boundary weaker | Old pipeline validation/reservation order | G V1 request + `ai/imageReferences.ts`; P/L application service and workspace service | Workspace membership, private storage refs, V1 text workspace RPC | Prevent silent wrong-workspace execution and weaker private-path handling | M02/03/04, M14, upload validators | CRITICAL RESTORE |
| M10 | Explore private asset publishing ownership | Canonical path plus owner-prefix check before service-role copy | Older publish code without caller ownership check | Cross-user private-asset copying possible if another object path is known | G/P `storage/assets.ts`, Explore publish route | `generations` private bucket; `maro-public` public bucket; no DB rollback | P0: service-role operation bypasses storage RLS without application owner check | Existing Explore routes, path parser, authorized source asset | CRITICAL RESTORE |
| M11 | Mobile promptbox collapse, result modal and feed behavior | Collapse/expand accessibility, bounded mobile prompt area, result modal, append/scroll latest | Older component behavior plus brand changes | Golden interaction states deleted; prepend/scroll-top path | G/P/L `ToolComposer.tsx` and related CSS | None beyond normal generation/history | Low direct risk; duplicate submission prevention depends on M12 | Composer, responsive layout, reduced-motion behavior | KEEP |
| M12 | Prompt limits, draft acceptance, keyboard submit, errors | Client bounds/canSubmit and server compile limits; preserve draft until accepted; human-readable errors | Older component; some local parity tests | Lost bounds/acceptance helper; immediate clearing and input mismatch | G `PromptExpand`, draft acceptance helper, ToolComposer; P older paths | Request/job contract | Server request abuse and failure/retry confusion; UI validation alone insufficient | M02/03/04, route transport limits | KEEP; server boundary CRITICAL RESTORE |
| M13 | Brain editor, context and opt-in defaults | Brain editor/storage present; Imazh context opt-in by default; Logo excludes Brain | Editor retained; newer canonical/shared context integration and automatic-ready toggle; local mock lab | Brain core retained; generation context/default behavior differs | G/P Brain workspace; P/L context/compiler; local `marobrain-test` | Brain source/profile tables, workspace ownership | Prompt privacy/provenance and per-user context must survive adaptation | M02/03/09, M26; product choice for default opt-in | REVIEW |
| M14 | Workspaces CRUD, active owner fallback | Core workspace CRUD and RLS; strict generation request boundary | Core retained; active-owner fallback/repair stronger | Core survives, so not a wholesale lost feature | G/P/L workspace service and migrations | Workspaces, memberships/owner RLS; text IDs | Retain current active-workspace owner check while restoring explicit-request rejection | M09, M13, UI active selection | KEEP |
| M15 | Multi-tool presets and future-module filtering | Presets retained, schema 0044; availability-aware selection | Presets retained, old module filtering; style thumbnail changes | Core presets survive; Golden filter/UI details lost | G/P presets service, ToolComposer; L `StyleThumb` | 0044 presets/content rows | Trusted prompt recommendation vs authoritative policy must stay separate | M01/02/03, content administration | KEEP |
| M16 | History, private previews, avatars and fallback states | Durable history linkage, minimized job projection, pending recovery, private preview/avatar fallback | Older history; local cosmetic UI | Old best-effort history/base64 fallback and broader job DTO; normal signed asset flow survives | G preview/avatar components, jobs route; P/L history/UI | Generations/job links, private bucket, avatar paths | Data minimization and private URL handling; core history integrity covered by M04 | M04/09/10; known Golden fresh-history race remains | KEEP |
| M17 | Design system and newer green branding | Complete required design-system CSS; older accepted brand | New green tokens/logos/email accents/default colors across many dirty files | Golden core CSS still included; newer local green work absent | G/P `maro-final-design-system/*`; L `maro-design-system`, brand/tokens/CSS/email/defaults/assets | None; product previews embed colors | Public archive/dead asset exposure and preview color scope need review | CSS imports, logo manifests, email assets, mock/default theme consistency | REVIEW |
| M18 | Latest Hub, home navigation, Web preview and hero assets | Accepted earlier Hub/Filma presentation; release policy as M01 | New Hero/Ecosystem/WebHubPreview/video assets/frosted nav; uncommitted | Older main Hub; new local presentation not proven deployed | L HubVision/Ecosystem/AppShell/AppTopNav/AppHeader and assets; G earlier source | None beyond existing signed-in shell | Respect module gates; external/media permissions and public assets | M01/17, complete import/asset set | REVIEW |
| M19 | Case studies / NOMA Coffee | No new case-study feature in Golden | New route/components/data/source assets/documentation; local-only | Absent from MAIN; never deployed per local record | L `case-studies` app/components/data/public assets and QA records | None | Publishing rights, truthful attribution, safe image/modal behavior | Asset bundle, accessible mobile layouts, navigation placement | REVIEW |
| M20 | Showreel | Not in Golden | New route, noindex; no production environment guard | Not in MAIN; would be reachable if copied/deployed | L showreel route and media | None | Noindex is not access control; media/license/product exposure | Media files; deliberate production gate or public approval | GRAVE CANDIDATE |
| M21 | Hub bits, Brain mock, shaders, dev dark preview | Not part of accepted shipped product | Dev-gated labs; root-layout dev-only dark preview; multiple visual experiments | Absent from MAIN | L `hub-bits`, `marobrain-test`, `dev/PreviewDarkMode.tsx`, preview CSS, Hub shader variants | None unless mock later connects to real data | Production gate must remain; check import graph before removal | Some shaders imported by labs; WebHubPreview is real Hub dependency | GRAVE CANDIDATE |
| M22 | Launch coming-soon gate, waitlist, login/signup ads | Public launch restriction and waitlist/admin/login ads source | Source removed by older baseline; tables survive | Middleware no longer applies original public launch gate; flag effectiveness uncertain | G middleware, coming-soon/waitlist/login-ad routes/UI | Live `launch_waitlist` and `login_ads` tables | Launch visibility control differs from independent signup flag; submissions require abuse guards | M07, chosen launch mode, admin media validation | REVIEW |
| M23 | Account UI, avatar handling, OAuth app connections | Account UI/private avatar support; no full newer OAuth connections integration | Older account UI plus OAuth connections and dirty brand changes | OAuth connection panel remains; Golden avatar/fallback lost; billing touched by Paddle | G/P/L account components and OAuth panel | Profiles, memberships, OAuth consent/application state | Never lose revocation/owner controls while restyling; MFA remains | M08/16/17/26/31 | REVIEW |
| M24 | Core pricing, credit display and entitlements | Commerce catalog and plan gates; V1 available-credit convention | Older reserved-credit arithmetic; shared commerce plus Paddle hunk | Shared entitlements modified for Paddle; possible double deduction of reserved credits under V1 DB | G/P commerce, orchestrator, pricing | Production reserve/release semantics, memberships, credits, paid-through | Financial/plan enforcement must be compatible with preserved DB; no free/test fallback | M04/31, subscription states | KEEP core; compatibility CRITICAL RESTORE |
| M25 | Legal/privacy/refunds/cookies | Accepted public copy including concrete operator context and consent surfaces | Older-main copy plus latest email/brand changes | Older expanded copy plus Paddle legal statements | G/P legal pages and CookieBanner; L dirty cookie/branding | Consent/logging and actual processors/business operation | User/legal accuracy requires owner review; no legal determination made here | M07/13/26/31, truthful processor/product availability | REVIEW |
| M26 | MCP, OAuth, prompt privacy and retry replay | Browser V1 path/private canonical execution trace; not all MCP branch changes included | MCP/OAuth and canonical/shared context retained in older lineage | Private OAuth claims/hook, service-only internal prompts and replay survive; shared generator remains old | P/L MCP/auth/compiler/application service; migrations 0045/0046 | Production OAuth claim hook, internal prompts table/grants, user/job state | Keep privacy, token verification and user claims; route through durable V1 boundary | M02/04/09/13/23; replay idempotency and costs | REVIEW; retain security protections |
| M27 | Common headers, preview sandbox, uploads/SSRF, RLS/admin/abuse guards | Strong shared baseline; some scoped V1 improvements | Mostly retained; dev localhost CSP addition; preview highlight color only | Common protections retained in code; current effective headers/grants not tested | G/P/L security modules, headers, preview frame/runtime, shared migrations | Service-only RPCs, owner RLS, strict rate limiter, account-risk flags | Preserve explicitly; cannot use shared baseline to excuse missing M07/09/10 | Actual prod settings, storage ACL, MFA enforcement, header delivery | KEEP |
| M28 | Dependency/security patch | Older package versions | Original checkout has differing package/lock modifications | c922 patch versions in MAIN/P | P `package.json`, lock/workspace files; L dirty package files | None | Avoid reintroducing older dependency vulnerabilities through whole-tree rollback | Lockfile consistency, compatibility validation for recovered V1 | KEEP |
| M29 | Test isolation and operational diagnostic tooling | Explicit local integration opt-in; strips secrets/blocks nonlocal fetch; phase tools/evidence | Older test setup and many preserved phase records | Test isolation source regressed; production cron remains independently relevant | G/P `vitest.setup.ts`, G/L scripts/phase records | Tools may touch real financial state if misconfigured | Restore guard before any broad testing; archive only superseded runnable tools | Loopback-only sandbox, separate credentials; no tools executed here | CRITICAL RESTORE guard; REVIEW tools |
| M30 | Superseded UI, duplicated assets and legacy artifacts | Accepted release plus historical copies outside repo | Legacy Hub backups/variants, __MACOSX resources, brand archive, old release/QA directories | Some older UI active; not all duplicates dead | Container artifact directories; L untracked assets/components | Storage/private data/evidence may exist separately | Preserve rollback evidence/secrets; prove unused before grave | Import/route/asset manifest audit; latest Hub choices | GRAVE CANDIDATE |
| M31 | Paddle provider/UI/schema/external configuration | No Paddle product surface in Golden | Separate P worktree; main integration; dirty post-deploy readiness evidence | Recorded prod backend enabled, browser disabled; live schema exists; external current state unverified | P/MAIN Paddle paths, commits and shared hunks listed in §9 | Applied 0047 Paddle, events/orders/membership columns/RPC wrappers | Preserve webhook verification, payment idempotency, ledger and default legacy denial | Existing paid state, external destination/secrets; quarantine plan | PADDLE / QUARANTINE |
| M32 | Release packaging, source provenance and deploy discipline | Complete immutable upload and marker; missing CSS repaired | Exact G archive/bundle and several older release copies | MAIN selected from older source; marker/current root unverified | E1; G `.railwayignore`, marker; container release copies | No DB reset; backups/storage not interchangeable with code | Prevent another old-source overwrite; do not ship env/backup artifacts | Explicit source tree, web vs runner root, controlled deployment strategy | KEEP |

## 5. CRITICAL REGRESSIONS

### P0 — money, security and data integrity

**Durable image settlement and positive acknowledgments (M04/M24).** G's `generation/v1ImagePersistence.ts` records a provider-result hash, stores one normalized raster at a deterministic owner/job path, verifies downloaded bytes, atomically links history and job, and settles only against evidence. Failed/pending financial RPC acknowledgment stays pending for reconciliation. P's `maro-imazh/applicationService.ts` around lines 608–617 tolerates failed uploads and null history, including a base64 display fallback, then reaches settlement around line 682. P's orchestrator around line 373 calls `finalizeCreditCharge` without requiring a positive result. Optional cost/telemetry work is no longer cleanly separated from a completed financial outcome. Live V1 DB safeguards may reject unsafe transitions, but that is a code/DB incompatibility, not proof the older path is safe.

G reserve SQL deducts the reserved amount from available `credits` while increasing `credits_reserved`. Older orchestrator and entitlement code subtract reserved credits again (`orchestrator.ts` around line 315; `commerce/entitlements.ts` around line 25). Historical production routine hashes establish V1-era semantics survived the Paddle migration; current bodies were not re-read through a SQL connection. With zero reservations in the live aggregate snapshot, this mismatch is latent, not evidence it cannot occur. Restore against verified production semantics rather than changing the DB to satisfy old code.

**Reconciliation lost its runnable source and regressed its endpoint algorithm (M05).** P/L lack the Dockerfile and runner. More seriously, restoring only the runner would invoke older cleanup: `generation/jobs.ts` around lines 70–103 calls release then marks the job failed without requiring successful release acknowledgment; errors can be logged and swallowed while the endpoint still reports `{ok:true, staleJobsReconciled:true}`. G cleanup around lines 43–70 calls evidence-aware per-job DB reconciliation and propagates errors. A 200 response from current endpoint alone is not a financial-integrity acceptance test.

**Explore service-role ownership check lost (M10).** G `storage/assets.ts` checks canonical path and caller ownership before downloading private `generations` storage through the service role; the Explore publish route supplies the caller ID. P's copy helper around line 132 has no owner argument/check, while publish around line 151 accepts a storage reference or extracts a path from a supplied URL. An authenticated caller who knows another user's object path can cause a privileged copy into public storage. Storage RLS cannot protect an operation performed by the service role. No exploit or cross-user request was attempted during this audit.

**Trusted execution boundary and private reference/workspace validation lost (M02/M03/M09).** G validates logical model/price/workspace/reference/Logo inputs and requires canonical published prompt provenance before reservation or provider invocation. P restores legacy compiler/environment paths and softer requested-workspace fallback. This weakens financial provenance and isolation at the point where privileged provider/storage/credit operations meet client input. There is no proof of arbitrary workspace data access; the confirmed behavior is silent fallback and changed validation order.

**Auth request hardening regressed (M07).** Production CAPTCHA misconfiguration was fail-closed in G; P's forgot-password path verifies only when both required and configured. Bounded body/token handling, hashed-recipient rate limits, duplicate-safe signup handling and callback referrer/ambiguity guards also regress. Generic auth/admin and user verification checks elsewhere survive. Severity applies to abuse/security safeguards; actual signup availability is separately unverified.

### P1 — core functionality and recovery

- **Imazh/Logo model and prompt contracts:** G model route exposes an allowlisted public DTO and reads DB Flare/Sunburst configuration. P's provider adapter defaults to `OPENAI_IMAGE_MODEL || "gpt-image-2"` and lacks G's explicit per-request model/observation contract. Live V1 model rows remain enabled at 5 credits. That does not make older static configuration equivalent. G explicitly sets SDK `maxRetries: 0`; P no longer fixes that value. The precise installed SDK retry behavior was not independently verified, so an exact retry count is not asserted.
- **Logo validated brief/content route and operational controls:** G server wizard/content/model contracts and V1 admin model/prompt/operations controls are missing from P. Generic Logo UI and generic admin permission/MFA checks remain. Old prompt publication is a multi-step path rather than G's atomic V1 RPC.
- **Signup/confirmation/resend/reset:** G uses supported SSR signup and confirmation delivery. P creates an auth user through the admin API with `email_confirm:false`, without the same email-initiation flow, exposes email-taken/provider details, and lacks the resend surface. Stateless reset initiation loses the SSR PKCE verifier-cookie path. G's recovery callback forces the reset-password destination and guards malformed combinations/provider exceptions; P removes those guards. Token-hash recovery paths may still work, so this is not a claim every reset method always fails.
- **Auth email hook:** G deduplicates per token, avoids a signup log FK to a not-yet-committed user, supports the email-change delivery requirements and passes idempotency through the correct SDK option. P restores user/action deduplication and older delivery/SDK usage. Signature verification remains. E4 reports real signup, confirmation, login and recovery checks passed in G, then registration was returned OFF.
- **History/pending recovery and prompt submission:** Missing durable history linkage/minimal job DTO, validated server limits and draft acceptance can yield success without durable history, confusing retry/credit state or loss of user input. Current completed-job replay from the MCP lineage is useful but must be adapted to the restored durable path.
- **Launch/operational surfaces:** Removed launch middleware/coming-soon/waitlist/login-ad and V1 operations surfaces can make configuration flags ineffective or hide recovery visibility even while their DB objects remain. Opening these features is a product decision.

**maroEngine parity/shadow/canary:** the engine is not wholly absent. P retains legacy/shadow/internal-canary compilation paths and the shared browser/MCP application service. These paths are not equivalent to G's default V1 image route, canonical model/price/published-prompt resolution, immutable private trace, provider request/usage observations and evidence-backed settlement. G also strips parked Fort contributions and applies release availability before execution; P removes several route/registry consumers, including generation/edit/edit-HTML/audio/chat boundaries. Restoring only a UI badge or enabling a canary flag cannot recover that contract. L's modified parity fixtures and Imazh/Web parity/shadow/brand-isolation tests accompany local presentation/default changes; they are not proof of deployed parity or of durable lifecycle recovery. A later implementation must reconcile compiler/context differences and prove browser/MCP parity against the chosen V1 contract, without promoting shadow results to authoritative billing or silently activating parked modules.

### P2 — UX and product polish

- G `ToolComposer.tsx` includes mobile collapsed state and result modal state around lines 197–199, accessible collapse controls around 1109, bounded mobile content, and result modal around 1507. Those states/controls are removed in P. Feed insertion/scrolling changes from append/scroll-latest to prepend/scroll-top.
- Prompt maximums, `aria-invalid`, keyboard submission respecting `canSubmit`, draft preservation until `generation_started`, useful error translation, private-avatar and preview fallback behavior differ. Client reference count and server maximum are no longer aligned.
- New green brand, latest Hub/navigation/hero/Web preview and case studies are absent from MAIN, but these are **local-only additions**, not proven previously shipped Golden regressions.
- Preset filtering and module placeholder presentation regress even though presets and the core design-system CSS remain.

### P3 — experiments and nonessential work

Local showreel, Hub bits, Brain mock, shader variants and development dark-preview work have no production deployment proof. Their absence from main is not a core outage. Grave decisions must consider actual imports and useful future design references.

### Symptoms that are not established Golden losses

Fort core was not deleted. G deliberately disables its product use through `modules/availability.ts`, shadow stripping, Fort config and UI hiding. P config instead defaults it on when config is not false, and shared application code can apply it under paid entitlement gates. Exact current visibility requires live user/config checks. Likewise, Web is deliberately coming soon in G; P contains an older functional workspace. Brain editor/storage, workspace CRUD, Explore's broader social features, presets, common security protections and required design-system CSS are retained. Avoid restoring features the accepted Golden policy did not activate.

G itself also has a documented `/imazh?open=<id>` fresh-document history race in E4. Recovering G does not automatically fix this existing issue.

## 6. SECURITY DELTA

Statuses below describe source/schema evidence with its limits. They do not certify effective production enforcement.

| Protection | Status | Evidence / consequence |
| --- | --- | --- |
| Security headers/CSP | PRESENT in source; delivery UNKNOWN | G/P `security-headers.mjs` and `next.config.mjs`: HSTS 63,072,000 seconds with subdomains/preload, nosniff, DENY frame policy, restrictive object/frame-ancestor/form directives, permissions denial and private-route/API no-store handling. P adds conditional Paddle hosts when browser enabled with explicit environment; L adds local development host. No general removal established. Existing inline-script allowance remains a baseline limitation; eval is development-only. Public requests were blocked from this environment, so actual delivered headers are unverified. |
| AI HTML preview isolation | PRESENT | `aiPreview.ts` is semantically unchanged G→P; sandbox permits scripts only, not same-origin/forms/popups/top navigation. Preview CSP, opaque origin, frame/host/source/channel validation survive (`AiHtmlPreviewFrame.tsx` around 52–66; runtime around 21). L changes highlight color only. Existing broad HTTPS preview connection allowance remains; not a new regression. |
| Generic service-role/admin auth | PRESENT in source | Server-only Supabase admin client; remote `getUser` for bearer auth; `admin/auth.ts` permission check and MFA/AAL2 policy remain. No finding that generic admin access was made public. Runtime MFA settings/session enforcement still require verification. |
| Common generation abuse/eligibility gates | PRESENT, with V1 boundary MISSING | Email-verified, disabled/risk-account checks, strict DB rate limits (user 120/hour, IP 200/hour, module 30/hour), concurrency, budget/circuit/credit gates survive. Release availability, canonical price/prompt/model/evidence and acknowledgment contracts do not. Shared gates do not repair those gaps. |
| Upload normalization and remote fetch protections | PRESENT, reference boundary WEAKENED | Security upload validators retain byte/MIME/raster checks: private refs 25 MiB, avatar 5 MiB, generated images 15 MiB; normalization, request limits, SSRF DNS/IP blocking and admin SVG safeguards remain. G's canonical owned Workspace image resolver is missing. Do not claim every remote-fetch route is unguarded. |
| Explore privileged private-to-public copy | MISSING owner enforcement | G `storage/assets.ts` canonical/owner check precedes service-role copy; P helper and publish route omit it. P0 cross-user publication risk under known-path condition. |
| Requested workspace isolation | WEAKENED | G V1 request resolves/rejects explicit foreign workspace before reservation. P application service falls back to active owned workspace; explicit failure semantics lost. Current `getActiveWorkspaceId` ownership fallback is stronger and should be retained. No foreign row disclosure was demonstrated. |
| Credit finalization/failure integrity | WEAKENED / INCOMPATIBLE | G positive RPC acknowledgments, private execution snapshot, provider evidence and safe pending recovery missing from older path. P `Boolean(data)` acknowledgment is weaker than strict `data === true`; some cleanup calls ignore acknowledgment altogether. Live DB safeguards exist but complete current definitions were not obtained. |
| Job/history response minimization | WEAKENED | G V1 job projection is limited to necessary state/credit/date fields; P returns broader job rows/metadata. Owner check remains. No specific secret leak was proven. |
| Registration/password-reset abuse controls | WEAKENED | Shared G `auth/publicAuth.ts` missing: bounded 8 KiB inputs, email length 254, password 8–256, strict IP/hashed-recipient limits, required CAPTCHA fail-closed and bounded verification. P's configured-only condition can skip required verification; duplicate-safe response behavior regresses. |
| Callback/referrer and recovery guards | WEAKENED | G sets `Referrer-Policy:no-referrer`, rejects malformed code/token/type/redirect combinations, forces recovery destination and handles verification errors. P omits these enhancements. Internal redirect sanitization remains; no open external redirect was established. |
| Auth email authenticity | PRESENT; delivery/idempotency WEAKENED | Hook signature verification survives; per-token idempotency, signup FK handling, email-change behavior and SDK options regress as M08. |
| Published V1 prompt/model administration | MISSING modern contract | Generic admin permission/MFA survives; atomic V1 publish RPC/client/schema path missing from code despite live RPC presence. Old multi-step publication and config paths need review. |
| Sensitive RPC privileges/RLS baseline | PRESENT in shared migration source; runtime UNKNOWN | 0001–0044 unchanged semantically; 0032 service-only sensitive RPCs, 0033 trigger privileges, 0034 promo insert, 0035 private-owner access, 0040 commerce service role and workspace ownership policies retained. Raw EOL diffs in 0037–0041 are not functional changes. Live schema presence does not prove current grants/policies/trigger bodies. |
| Internal prompt privacy/MCP identity | PRESENT newer protections | P 0045 internal-prompt table is service-only; public history strips compiled prompt. P 0046 custom claim hook and MCP verifier check signature/issuer/audience/expiry/subject/client context and verified user. Keep these protections alongside G's private canonical trace. MCP must inherit restored durable generation contracts. |
| Subscription/Fort entitlement | PRESENT checks, behavior REVIEW | Shared entitlements/plan gates survive; Paddle paid-through fields are integrated. Fort default and release gate differ. Verify all paid, expired, paused and no-membership paths and available-credit arithmetic before launch. |
| Paddle webhook trust/idempotency | PRESENT in source; runtime/config UNKNOWN | Raw body limit 1 MiB; timestamp-bounded HMAC, timing-safe/multiple-signature handling plus SDK verification; authoritative paid events; DB event/paid-cycle idempotency; retryable config/DB failure. No payment test or current Paddle API action performed. |
| Launch restriction | MISSING original public gate | G middleware handles configured public launch visibility. P matcher only covers API/admin; retaining a launch variable alone cannot restore removed enforcement. Signup flag is independent. |
| Test environment separation | WEAKENED | G `vitest.setup.ts` requires explicit `VITEST_LOCAL_INTEGRATION=true` with loopback, strips live Supabase/secrets and blocks nonlocal fetch. P restores older setup. Historical phase records document accidental integration financial writes and preserved failed-email logs; restore isolation before future broad tests. |
| Secret exposure | NO matches in scoped scan; broader UNKNOWN | Regex scan of 852 G and 775 P text files found no matches for selected private-key/provider/GitHub/AWS/embedded-password patterns. This is not a universal secret-free certificate; untracked assets/archives and all external secrets need separate custody review. G upload excluded env files; public Supabase URL/anon and Paddle client token are intentionally public, service keys must remain server-only. No secret values were printed. |

**Production configuration traps:** L `.env.local` targets loopback; P `.env.local` targets sandbox Supabase `bpvaatqlbmaokilsyihf`. Neither is proof of production binding. E6 used the existing production backup configuration for `pbhzobqpavkuttdipjaq`, with credentials kept in-process. An anonymous schema attempt using the saved anon credential returned 401; that does not prove correct RLS/grants. Current valid anonymous/authenticated isolation and role-specific RPC access were not tested.

## 7. MARO-RECONCILIATION

### Purpose and history

This is critical financial infrastructure, not a UI experiment or Paddle artifact. Jobs can outlive a killed web process, abandoned request, provider timeout or failed lifecycle transition. Reconciliation must determine whether durable success evidence warrants settlement, or whether an abandoned reservation can safely be released, without duplicate charges/releases or overwriting a successful result.

Historical `b1ac3ab82222f604b7088117ec85238da0b79e58` introduced the stale-job endpoint, SQL and scheduling before Paddle. Its older 0031 algorithm is not the final Golden algorithm: G 0047 adds evidence-aware, locked per-job settlement/release, and 0048 fixes the workspace-ID contract. Preserve the later DB safeguards.

### Last known working implementation and actual configuration

G `tools/reconciliation/Dockerfile` uses Node 22, dependency-free `run.mjs`, non-root `USER node`, and `CMD ["node", "run.mjs"]`. The directory also includes runner tests and ignore/configuration support. G package scripts expose `reconcile:stale` and its focused checks.

`run.mjs` validates an HTTPS `APP_ORIGIN` with no credentials/query/fragment and a required `CRON_SECRET`, then sends exactly one authenticated POST to `/api/cron/reconcile-stale-jobs`. It uses manual redirect handling, a bounded timeout (default 60 seconds; accepted 100–120,000 ms), bounded JSON response, and requires HTTP 200 plus `ok:true` and `staleJobsReconciled:true`. It logs sanitized event codes and exits 0/1. It needs no database/provider secrets and does not retry financial work itself.

E3 establishes:

| Item | Recorded last working value |
| --- | --- |
| Railway project | `cb4c8dcc-712d-459d-b01c-96ae9ad29814` |
| Production environment | `46f492bd-a88b-4b68-aa5a-455a2707ca10` |
| Web service | `4f5a55b0-dc24-4d6e-8d20-669b8d6ecf3d` |
| Reconciliation service | `9366158f-0486-40f2-899a-4156bb60b7a1` |
| Reconciliation deployment | `a906cebd-f8d3-49d2-843e-004599d3b213` |
| Working source packaging | Uploaded only `tools/reconciliation` as archive root, so `Dockerfile` was at that root |
| Command / health / restart | `node run.mjs`; no health check; restart NEVER |
| Schedule | `*/10 * * * *`, UTC |
| Auth/origin | Historical scheduler-gate shows matching web/service secret and correct production origin |
| Actual scheduled success | 2026-09-18 12:40:55.272 UTC; HTTP 200, 629 ms, successful runner event; instance EXITED / deploymentStopped true |
| Next recorded run | 12:50 UTC; final platform snapshot at 12:42:12 UTC |

A 12:32 manual success also exists, but **the 12:40 scheduled logs are the actual schedule proof**. The historical run's financial counts/hashes remained unchanged. These records do not establish successful runs after September 18.

G setup documentation proposes `/tools/reconciliation` as the future repository-linked service root. That differs from the historical CLI archive-root upload. The web's root `railway.toml` describes a persistent Railpack web process/health check; it is not the runner configuration and must not be inherited accidentally.

### What changed and current evidence

P/L and MAIN lack `tools/reconciliation/Dockerfile`, `run.mjs`, its tests and package commands. That missing source directly matches the user's reported scheduled-service build failure. The exact current Railway root/Dockerfile override, builder, schedule, variables and most recent run cannot be independently confirmed because current project access is unauthorized. The original known-good runner and scheduler records remain recoverable.

**Both `reconcile_stale_generation_jobs` and `reconcile_generation_job` are present in live production REST schema.** `v1_image_lifecycle_version` returns `2`. Do not infer missing DB infrastructure from missing source files. Full current function bodies/grants/triggers were not independently read.

### Repair options for a later approved implementation

1. Restore the Golden runner source in the chosen recovery tree and restore the endpoint/cleanup's compatible per-job reconciliation behavior first or together. Reconfigure the existing service's source root/Dockerfile path only after reading its actual settings. Preserve schedule, secret, origin, no-health-check and one-shot exit semantics.
2. A minimal isolated upload of the preserved runner directory reproduces the historically working archive-root packaging. It still requires a compatible web endpoint; deploying runner alone against the old swallowing cleanup is insufficient.
3. A repo-root Dockerfile override or subdirectory-root arrangement can work, but copy paths must match the actual build context. Choose one verified arrangement instead of guessing whether `/tools/reconciliation/Dockerfile` is relative to repo or service root.
4. An alternative managed one-shot scheduler could call the same authenticated endpoint only as an explicit future infrastructure decision. It is not needed to justify deleting or disabling the existing service.

Do not move reconciliation to grave, delete/disable its service or schedule, apply cron semantics to the persistent web service, invoke the financial endpoint casually during audit, or revert DB routines to 0031. **No repair was performed.**

## 8. DATABASE STATE

### Source migration histories are divergent, not interchangeable

| Version | Golden source | Current MAIN/P source | Meaning |
| --- | --- | --- | --- |
| 0001–0044 | Shared baseline | Same functional SQL; some EOL-only diffs | Includes jobs/ledger, rate/RPC protections, memberships/notifications, workspace entitlement, Logo intelligence and multi-tool presets. |
| 0045 | Launch waitlist | Generation internal-prompt privacy | Same number, unrelated history. Privacy branch work predates Golden; not a brand-new Sep 29 feature. |
| 0046 | Login ads | MCP OAuth claim hook | Same number, unrelated history; preserve both deployed schema families. |
| 0047 | V1 durable image settlement | Paddle billing | **Critical collision. Do not replace or replay by filename alone.** |
| 0048 | V1 history/workspace TEXT correction | Absent | Live version 2 corroborates this contract survives; missing file is not missing schema proof. |
| 0049 | V1 operational admin and atomic prompt publication | Absent | Related live admin RPCs exist. |

The only newly introduced numbered migration in the actual post-Golden Paddle commit series is P **`0047_paddle_billing.sql`**. Source privacy/OAuth migrations were brought from earlier ancestry. Applied production history cannot be reconstructed by simply sorting current checkout filenames.

E5 records a consolidated production migration entry **`20260929150544 remote_schema`**, with 1,024 statements, rather than a clean individual 0001–0049 ledger. The Paddle deployment procedure records applying only the exact Paddle migration and registering it, while preserving existing production routines. This audit did not directly reread the current migration ledger.

Recorded Paddle migration SHA-256: `28407e9d82fb3ce10d30a7ee11df87195fe42cfea36650a1f09e6dda346ca707`.

Recorded preserved routine body MD5 values:

| Routine | Production/test value recorded around Paddle | Older-main value / relevance |
| --- | --- | --- |
| reserve_credits | `76643913c8b8c6feb591576c5a026b94` | Older main `1b40868bf4010b5f1eb51d010d455d96`; incompatible assumptions must not be restored into DB. |
| release_credit_reserve | `d8f5c39d76f0a5916022f05ba53486c0` | Older main `a8844179733d711d5c68bd0dbc017082`. |
| Legacy fulfillment body preserved by Paddle wrapper | `e85309136acb48eaab6196da2bcb9190` | Payment migration renames/preserves old body behind guarded non-Paddle wrapper. |
| Legacy cancellation body preserved by Paddle wrapper | `902f086152c19b0bdc71cdcd889b2faa` | Same preservation requirement. |

These hashes are documentary evidence, not newly computed live function-body hashes.

### Fresh production observations, September 30

Read-only production REST schema inspection found:

- `reconcile_stale_generation_jobs`, `reconcile_generation_job`, `v1_image_lifecycle_version`, `start_v1_image_job`, `mark_v1_image_provider_result`, `persist_v1_image_generation`, `v1_image_success_evidence`, `settle_v1_image_job`, `fail_v1_image_job`.
- `reserve_credits`, `release_credit_reserve`, `finalize_credit_charge`, `admin_v1_operations`, `admin_publish_v1_prompt`.
- `maro_mcp_custom_access_token_hook`, `create_paddle_order`, `apply_paddle_event`, `fulfill_non_paddle_commerce_order`, `cancel_non_paddle_credit_order`.
- Launch waitlist/login ads, private internal prompt, workspace/membership/generation-job and Paddle event tables.

The only RPC actually invoked was **GET `v1_image_lifecycle_version`**, a constant read, returning HTTP 200 and value **2**. No financial/reconciliation/admin mutation RPC was invoked.

Aggregate-only HEAD reads returned **88 generation jobs**, **27 with `metadata.v1_durable=true`**, **0 pending/reserved/processing jobs**, **0 profiles with reserved credits above zero**, **150 generations**, **0 Paddle webhook events**, **0 Paddle orders**. These are a point-in-time snapshot, not proof of idempotency, scheduling, absence of all payment activity, or future race safety. No user records were downloaded for those counts.

Model config read returned enabled launch rows: Imazh Flare (default), Imazh Sunburst, Logo Flare (default), all **5 customer credits**, not coming soon, mapping to `gpt-image-2.5-flare` / `gpt-image-2.5-sunburst`. The V1 production data survives despite older application configuration.

Live buckets: **`generations` private**, **`maro-public` public**. Both report null bucket-level MIME/file-size constraints. App byte/MIME limits and owner enforcement are therefore material; bucket publicity alone does not prove complete RLS or ACL behavior.

### Preserve versus restore versus specially reconcile

**Code restoration with compatibility verification:** Golden request/Logo/model/admin/auth/mobile/private-asset/runner source can be restored without assuming a DB rollback. V1 lifecycle/admin dependencies already exist, but validate exact signatures, grants, triggers, model/prompt/content state and workspace types before deploying. UI-only restoration generally has no new migration dependency.

**Already-applied DB/data that must be preserved:** production user/account/auth records, credit ledger/reservations/jobs/generation history/storage, workspaces/Brain/Fort/membership state, V1 settlement and operations, launch tables, MCP privacy/OAuth objects, Paddle columns/events/orders/unique constraints and guarded payment RPC wrappers. Code archives do not contain live storage or substitute for data backups.

**Special reconciliation before any new migration:** divergent 0045–0049 numbering, consolidated remote_schema ledger, function body/hash/grant/trigger verification, old/new available-credit convention, V1 text workspace contract and Paddle payment-provider state. Do not run bulk migration push, down migrations, renumber/reapply old files, or overwrite production reserve/release/reconciliation/fulfillment with older definitions. A future additive migration, if needed, must be derived from verified actual production state and approved separately.

### Backup evidence

`C:/Users/nicep/Desktop/maro-al/maro-production-backups/pre-paddle-0047-20260929-222116.zip.aes` has recorded SHA-256 `d45aa2a226904b002cdc4593d2802a8b51b53390132d93abe577d9c0d36d4208`. Its README records AES-256-GCM encryption and successful schema/data/aggregate/RLS/ACL/routine restore checks **before Paddle**. The key is local/ignored and is not included here. No decryption or restoration occurred. This is a sensitive recovery asset, not a grave candidate or an automatic production rollback plan.

E5 also records a September 29 02:33 UTC physical backup and seven prior backups, with PITR off at that time. Current backup availability/retention and a post-Paddle recovery point remain unverified.

## 9. PADDLE QUARANTINE

**Classification: PADDLE / QUARANTINE. No deletion, rollback, redesign, configuration change or Paddle API action in this audit.** Exclude its purchase UI from deciding the Golden core product while preserving backend/data compatibility.

### Commits, files and routes

Paddle implementation `2b2eb0e...`; readiness documentation `65d122a8...`; dependency patch `c922dc32...`; main merge `32e2ecbe...`. The dependency patch is separately M28 rather than an automatic payment discard: Next/eslint-config-next `^15.5.26`, sharp `0.35.5`, MCP SDK `^1.31.0`, and corresponding lock/workspace updates. Recovered V1 must be checked with the retained versions.

| Group | Paths relative to P/MAIN |
| --- | --- |
| Provider library | `src/lib/payments/paddle/{checkout,config,environment,webhooks}.ts` |
| Provider routing/legacy denial | `src/lib/payments/checkout-routing.ts`, `src/lib/payments/legacy.ts`, modified `orders.ts` |
| New endpoints | `src/app/api/payments/paddle/checkout/route.ts`, `portal/route.ts`, `src/app/api/webhooks/paddle/route.ts` |
| New UI | `src/app/pay/paddle/page.tsx`, `src/components/account/PaddlePortalButton.tsx` |
| Shared modified API | Payments `create-order`, `cancel-order`, `complete-test`, `invoice`, `order` routes |
| Shared modified product surfaces | Checkout, pricing, pay redirect/test, account BillingSection/OrdersSection, commerce entitlements/memberships/types |
| Shared modified legal/config | Terms/privacy/refund pages, `.env.example`, `.gitignore`, package/lock/workspace, `security-headers.mjs` |
| DB | `supabase/migrations/0047_paddle_billing.sql` |
| Checks/tooling | Seven Paddle/legacy test groups plus commerce smoke changes; `tools/paddle/{check-sandbox,rehearse-production-migration,seed-sandbox,test-environment}.mjs` |
| Documentation | `docs/paddle-{file-audit,production-readiness,review,testing}.md` |

Payment hunk separation must include shared commerce/API/legal/CSP files. Deleting only the new `paddle` directory would leave inconsistent provider routing. Sandbox seed/migration-rehearsal tools can mutate environments; none were run here.

### Applied production DB additions

Live schema corroborates membership fields: `payment_provider`, `paddle_subscription_id`, `paddle_customer_id`, `paddle_price_id`, `paddle_origin_order_id`, `paddle_status`, `paddle_event_at`, `paddle_scheduled_change`, `paddle_paid_through`.

Commerce-order fields include Paddle customer/subscription/price IDs and period start/end. `paddle_webhook_events`, unique event and paid-cycle protections, provider-aware order/entitlement state, `create_paddle_order` and `apply_paddle_event`, and guarded legacy fulfillment/cancellation wrappers belong to the applied migration. Source enforces service-only event handling. Current effective grants/constraint definitions require a direct catalog check before changes.

**Do not drop these objects, clear events/orders, strip provider state from memberships, restore unguarded old fulfillment/cancellation, or blindly restore the pre-Paddle backup.** Zero aggregate event/order counts today do not authorize deletion.

### External production configuration: historical record, not fresh Paddle verification

E5's production and dirty post-deployment notes record:

- `PADDLE_ENABLED=true`, `NEXT_PUBLIC_PADDLE_ENABLED=false`, production server/browser environment, `LEGACY_PAYMENTS_ENABLED=false`, six live price IDs, no sandbox API key in production.
- EUR inclusive-tax catalog: Standard €9/30 days/100 credits; Pro €35/30 days/500 credits; top-ups 100/€9, 200/€17, 500/€40, 1,000/€75. No annual plan, trial, discount or proration in that recorded setup.
- Least-privilege live API key, client token and webhook secret in secret storage. Values intentionally omitted.
- `maro.al` approval recorded **Pending**, discount entry disabled, default payment link `https://maro.al/pay/paddle`.
- Active live notification destination `ntfset_01m3qjswrjcfxyhhftftydz6xh`, with `transaction.completed` and subscription `created`, `updated`, `activated`, `canceled`, `past_due`, `paused`, `resumed`.
- Recorded post-deploy GET webhook 405 and invalid POST 400. These were not repeated in this audit. No real €9 purchase was attempted.

Current dashboard approval/destination/catalog/secrets/browser behavior is unverified. Do not convert recorded readiness into a claim of live checkout approval.

### Later hiding versus preserving

Product purchase CTAs, checkout entry, pricing purchase affordances and portal navigation can be hidden in a later approved quarantine plan. Existing webhook ingestion, event idempotency, order history, membership paid-through processing, provider-aware entitlements and secret/config custody must remain compatible with any live state. Preserve default-deny legacy/test payment routes and avoid automatic provider fallback. Golden's old commerce code must not reopen a fake/test payment route simply because the Paddle UI is hidden.

## 10. GRAVE CANDIDATES

The user reports an existing `/grave`; it was **not located in the audited G/L/P source trees or release directory searches**. This audit neither creates nor chooses a grave location and moves nothing. Verify its actual location before future cleanup.

| Candidate group | Technical reason / dependency / risk |
| --- | --- |
| Local `hub-bits`, `marobrain-test` and development preview | Experiments/dev-only surfaces. Preserve useful design reference and production guards until the user chooses. Remove root-layout imports together if preview is archived. |
| Unselected shader/old Hub variants | `ColorBends`, `Dither`, `SoftAurora`, `CursorGrid`, `Stack`, wrappers and legacy visuals need import checks. Some are used by labs; WebHubPreview is a latest Hub dependency, not disposable merely because it is untracked. |
| Showreel | Product intent/media rights unresolved. Noindex does not restrict access. Archive or deliberately gate/publish only after M20 decision. |
| Duplicate raw assets / `__MACOSX` / public brand archive | Resource-fork duplicates and an unneeded `brand.zip` are plausible candidates. First prove no route, logo manifest, email template, CSS or preview references them; do not delete source masters needed for chosen brand/case study. |
| Older release/QA/Hub snapshots | Container has `.hub-backups`, `.hub-release-20260919`, `.ui-recovery-20260919`, legal/presentation/preview/security deploy/release directories, case-study/Brain QA outputs. They are not interchangeable deploy sources. Preserve provenance/rollback evidence before archiving duplicate working copies. E1 explicitly warns old Hub/UI releases regress V1. |
| Superseded phase diagnostics/runnable scripts | Separate immutable reports from scripts with provider/financial/admin side effects. Keep evidence and necessary operational tooling; archive only after usage/secrets/dependency review. |
| Obsolete component/asset implementations after M17/M18 decisions | Latest green brand and Hub involve coordinated CSS, logos, email/default-color and shell changes. Check the deleted Nice partner logo against surviving manifest references before accepting its deletion. |

**Explicit exclusions:** maro-reconciliation, financial/auth/payment/retention/reminder cron infrastructure, V1 settlement/ledger/privacy/RLS logic, active MCP/OAuth revocation, Paddle/backend data, production backups/keys, the exact Golden archive/tag/bundle and deployment evidence. An apparently unused operational endpoint can still be externally scheduled. Do not infer dead code solely from no UI imports.

## 11. RESTORE STRATEGY

Proposal only; none of these steps has been executed.

1. **Use the exact Golden tree as the recovery application baseline**, with its root-commit provenance documented. Preserve both dirty worktrees/stash/untracked content and Golden bundle before implementation. Avoid replacing L wholesale or calling P the product source of truth.
2. **First resolve P0 contracts as one coherent change set:** V1 model/request/prompt/compiler/provider evidence; durable storage/history/settlement; verified available-credit arithmetic; private Explore ownership; strict requested workspace/reference checks; compatible endpoint and runner. Confirm actual production function signatures/bodies/grants/triggers rather than replaying migration files.
3. **Retain safe current integrations deliberately:** dependency patch M28, active-workspace owner fallback, private internal prompt storage and MCP claim verification, useful completed-job replay adapted to V1, common security headers/preview/upload/SSRF/rate/admin protections. Keep compiled/internal prompts private on every browser/MCP/history surface. Browser and MCP must share the restored trusted lifecycle.
4. **Keep Paddle-compatible backend/schema safeguards quarantined.** Preserve payment idempotency/provider state, paid-through entitlements and default legacy denial even if purchase UI is later hidden. Select shared payment hunks explicitly; do not mix whole old/new commerce directories or revert DB.
5. Restore chosen Golden auth/email/admin/mobile/history UX. Decide M01 release availability explicitly: Web/Fort activation is additional work, not a consequence of restoring Golden. Restore test isolation before running any tests that load env.
6. After the user's M IDs, selectively port **only approved local presentation/content work**: green brand, latest Hub/navigation/assets, case studies, account/legal choices. Port color/UI hunks rather than copying entire `lib`, security, engine or app folders from L, whose backend is older. Labs/showreel/obsolete assets remain decisions, not deployment defaults.
7. Validate in an isolated sandbox with no production secret loading: financial acknowledgment failures, durable-success recovery, provider/storage/history failure, duplicate/retry/process-death paths, user isolation/Explore ownership, auth confirmation/recovery, model/prompt publication and responsive chosen UX. Use focused checks first; build/release checks become appropriate during implementation, not this audit.
8. Produce a concrete reviewed source diff, immutable release manifest, environment/source-root plan and preserved DB compatibility evidence before any deployment approval. Ensure web and runner build contexts differ appropriately. Avoid repository autodeploy from old main overwriting an uploaded recovery release again.
9. Only in a later authorized rollout verify actual runtime revision/marker, auth feature flags, headers and reconciliation's genuine scheduled exit/logs; inspect jobs/ledger before opening public registration. A documented code rollback may be possible; automatic DB rollback is not the plan.

The smallest safe outcome is **Golden core + selected current security/compatibility work + approved local additions**, while leaving existing production DB and Paddle infrastructure intact. A one-line checkout/redeploy of either old main or the Golden tree without compatibility work would not meet these requirements.

## 12. REGISTRATION / LIVE READINESS

Registration must not be declared ready from the current source or historical reports. E4 records Golden's real auth tests passed and then signup returned OFF at 13:48:56 UTC; native Supabase signup OFF and confirmation ON were recorded then. An earlier setup document's outstanding signup note is superseded by phase 9, but **none of those historical settings proves today's configuration**.

Required evidence before a later public opening:

| Area | Exact readiness requirement |
| --- | --- |
| Auth and launch policy | Confirm chosen app signup flag, public launch middleware and native Supabase signup/confirmation settings. Verify supported SSR signup produces confirmation, no authenticated unconfirmed session, duplicate-safe response, resend and disabled/risk-account denial. Verify approved redirect allowlist and correct canonical origin. |
| Reset/callback | Verify both supported token-hash and PKCE flows, verifier cookie handling, recovery-forced reset destination, malformed/expired/reused-token behavior, bounded inputs, internal-only redirects and no-referrer behavior. |
| Email | Verify hook secret/signature handling, sender/domain configuration, production URLs, actual confirmation/resend/reset delivery, per-token dedupe/retry, signup log FK safety and all required email-change inbox deliveries. Suppressed errors must not masquerade as delivered mail. |
| Credits | Verify initial allocation exactly once, available/reserved arithmetic against real routine semantics, nonnegative/concurrency guards, strict positive reserve/release/finalize acknowledgment, duplicate-ledger prevention and trustworthy displayed balance. Use controlled authorized accounts, not incidental real-user data. |
| Entitlements/Fort | Verify free/Standard/Pro, absent/expired/paused/canceled/past-due memberships, paid-through and provider ownership. Confirm Fort remains in the chosen release state and cannot bypass subscription/release gates. Legacy/test payment routes must remain default denied while Paddle is quarantined. |
| Generation lifecycle | Verify actual Flare/Sunburst/provider/price/prompt mappings and Logo wizard contract. Validation must precede reserve/provider work. Test provider timeout/disconnect/process death, rejected input, storage/hash/history failure, settlement RPC uncertainty, retries/completed replay, optional telemetry failures and durable success recovered without a second charge/provider call. |
| Critical reconciliation | Confirm existing service/root/Dockerfile/command/no-health/restart/schedule/auth/origin. Observe a real scheduled successful run and error propagation, plus controlled stale reserved and durable-success recovery. Confirm no false positive after failed release, no duplicate settlement and no disabled service. |
| Abuse/rate limits | Verify configured-required CAPTCHA fails closed if missing/bad, token/body/recipient bounds, DB-backed per-user/IP/module/recipient limits, concurrency/circuit/budget guards and account-risk behavior. Avoid relying on UI-only limits or permissive fallback. |
| RLS and RPC grants | Obtain actual catalog evidence for owner/member policies, service-only financial/admin/MCP/privacy functions, trigger privileges and storage policies; test valid anonymous/authenticated roles and two users. Saved migration text and service-role schema visibility alone are insufficient. |
| User/workspace isolation | Verify requested foreign workspace rejects without reserve/provider work, active-workspace owner fallback is safe, Brain/reference/history/job access is scoped, private asset paths are canonical and owned, and Explore cannot publish another user's private object through privileged storage copy. |
| Privacy/legal | Ensure private compiled prompts and request traces stay service-only/minimized in history/MCP/jobs/logs. Review truthful operator, processors, payment quarantine, refund/credit terms and cookies/consent against the chosen product. Approve rights/attribution for Hub, showreel and case-study media. |
| Production environment | Independently confirm Railway running SHA/manifest/release marker and web/runner source roots; production Supabase/provider/Turnstile/auth/email/CRON bindings; public vs server-only variables; no sandbox/local credentials in production; post-Paddle backup/recovery access. L/P local env files are not the production specification. |
| Headers/preview/uploads | Verify delivered HSTS/CSP/no-store/referrer/nosniff/frame/permissions headers on representative pages/APIs/callbacks; preview sandbox/message isolation; upload MIME/byte normalization and owner checks; SSRF protections. The audit's 403 network limitation leaves live delivery unverified. |
| Operational visibility | Verify V1 admin prompt/model publishing and operations accurately reflect reservations/jobs/provider evidence, without leaking private prompts. Inspect error/cron/settlement alerts and owner-access controls. Retention, temp cleanup and plan/reminder jobs must be inventoried before any cleanup. |
| Product acceptance | Verify chosen mobile collapse/result/history/draft behavior, accessibility, release placeholders and navigation. Address or knowingly accept the existing Golden fresh-history race; do not label it fixed by restore. |

**Opening registration is a later explicit decision after these checks have concrete evidence.** This audit did not toggle signup, create users, send email, invoke generation/payment/reconciliation mutations, or certify current production readiness.

**Final audit preservation verification:** before/after fingerprints match for all tracked and nonignored untracked source files, excluding this permitted audit document: 1,074 files in L and 1,002 in P. Both HEADs, both Git index hashes and the shared refs hash match the pre-write readings. Existing dirty/untracked user work, including P's readiness notes, is preserved. The only new repository artifact is this file. Document validation confirms all 13 required sections and identical M01–M32 IDs in the matrix and decision queue.

| Checkout | Unchanged source aggregate SHA-256, excluding this audit |
| --- | --- |
| L | `8f4008adefe6b9b77dc68a0356c165a71e9bac57ad4e5189f24a1df8a801c613` |
| P | `061a7d5896bf5dd416946e39042bae80f2b97b6fb8627d713e1c6c5be5a26224` |

## 13. MY DECISION QUEUE

Respond with these IDs and your choices; your response becomes the recovery implementation's product scope. Suggested choices are recommendations only. “GRAVE” means a later deliberate archival action, not deletion now. Critical groups include compatibility/security fixes rather than optional activation decisions.

1. **M01 — REVIEW?** Keep Golden Web coming soon/Fort-chat parked, or choose separately scoped activation? Confirm Filma/audio/marketing release status too.
2. **M02 — CRITICAL RESTORE / REVIEW?** Restore trusted Imazh Flare/Sunburst configuration, canonical requests/prompts and provider mapping.
3. **M03 — CRITICAL RESTORE / REVIEW?** Restore validated Logo wizard/server brief/content/model contracts.
4. **M04 — CRITICAL RESTORE / REVIEW?** Restore coherent durable image/history/credit settlement and retry/telemetry contracts against preserved DB.
5. **M05 — CRITICAL RESTORE / REVIEW?** Restore compatible reconciliation endpoint and existing scheduled runner; preserve service and DB.
6. **M06 — CRITICAL RESTORE / REVIEW?** Restore V1 admin operations/model controls/atomic prompt publishing.
7. **M07 — CRITICAL RESTORE / REVIEW?** Restore signup/resend/PKCE/callback and auth abuse safeguards; opening registration remains a later gate.
8. **M08 — CRITICAL RESTORE / REVIEW?** Restore correct auth email delivery and per-token idempotency.
9. **M09 — CRITICAL RESTORE / REVIEW?** Restore explicit requested-workspace/private-reference boundary while retaining current active-owner fallback.
10. **M10 — CRITICAL RESTORE / REVIEW?** Restore Explore service-role asset ownership enforcement.
11. **M11 — KEEP / REVIEW?** Keep Golden mobile collapse/result-modal/feed behavior.
12. **M12 — KEEP / REVIEW?** Keep prompt bounds, draft acceptance, keyboard/error UX and server limits.
13. **M13 — REVIEW?** Choose Brain opt-in defaults and reconcile shared browser/MCP context; core Brain editor/storage is retained.
14. **M14 — KEEP / REVIEW?** Keep workspace CRUD and stronger active-owner fallback.
15. **M15 — KEEP / REVIEW?** Keep multi-tool presets and chosen release-aware filters.
16. **M16 — KEEP / REVIEW?** Keep private preview/avatar fallback, minimized job/history UX and pending recovery.
17. **M17 — REVIEW / KEEP?** Select newer local green branding or Golden brand; port coordinated visual hunks.
18. **M18 — REVIEW / KEEP / GRAVE?** Select latest local Hub/home navigation/Web preview/hero assets.
19. **M19 — REVIEW / KEEP / GRAVE?** Select local case studies/NOMA Coffee content and navigation.
20. **M20 — GRAVE / REVIEW / KEEP?** Decide showreel purpose, public access and media rights.
21. **M21 — GRAVE / REVIEW / KEEP?** Decide dev labs/Brain mock/shaders/dark-preview reference value.
22. **M22 — REVIEW / KEEP?** Decide launch gate, waitlist and login/signup-ad surfaces.
23. **M23 — REVIEW / KEEP?** Choose account presentation and retain OAuth connection/revocation controls.
24. **M24 — KEEP / REVIEW?** Retain core pricing/entitlements with verified DB-compatible credit arithmetic and legacy-payment denial.
25. **M25 — REVIEW?** Approve legal/privacy/refund/cookie content for the chosen product and payment quarantine.
26. **M26 — REVIEW / KEEP?** Retain MCP/OAuth/privacy/replay, adapted to trusted V1 generation.
27. **M27 — KEEP / REVIEW?** Retain and verify common headers, preview, upload/SSRF, abuse/admin/RLS protections.
28. **M28 — KEEP / REVIEW?** Retain current dependency/security patch with recovered-core compatibility.
29. **M29 — CRITICAL RESTORE / REVIEW / GRAVE?** Restore test isolation; separately classify superseded runnable diagnostics versus preserved evidence.
30. **M30 — GRAVE / REVIEW?** Archive only proven-unused UI/assets/duplicate working snapshots, preserving recovery evidence.
31. **M31 — PADDLE / QUARANTINE?** Preserve applied DB/backend/external state; decide purchase-UI hiding later without provider/data rollback.
32. **M32 — KEEP / REVIEW?** Retain exact Golden packaging/provenance and explicit deployment source discipline.
