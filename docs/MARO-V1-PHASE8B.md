# MARO V1 — Phase 8B Railway deployment verification

Date: 2026-09-18. Production: https://maro.al.

## Phase 8B status

PASS — healthy Railway web deployment, genuine scheduled reconciliation, real owner/MFA browser verification, and unchanged financial/configuration state.

## Railway web service

- Project `spectacular-magic` (`cb4c8dcc-712d-459d-b01c-96ae9ad29814`), environment `production`.
- Existing persistent service `maro` (`4f5a55b0-dc24-4d6e-8d20-669b8d6ecf3d`).
- Deployed accepted working-tree snapshot, including uncommitted Phase 1–8A work. Git base: `2db574a73f28e1d6b32b3c40f9dcb23a911a929d`; this base alone does not identify the deployed code.
- Local source manifest SHA-256: `4578AD52FDD272EBFECBFA6289435C245F31C94EFC47D9D0ACDB62BF266530CE`. Manifest retained in ignored `scripts/phase8b-data/source-manifest.json`.
- Railway deployment: `b8fe4e33-98ff-4d1a-a8ed-2f838e759f4d`, created 2026-09-18 12:26:35 UTC. Build SUCCESS; 89/89 static pages; health check `/` succeeded.
- Runtime: `pnpm start` → `node start.mjs` → Next.js bound to `0.0.0.0:8080` using Railway PORT. Startup ready in 197 ms.
- Previous known-good deployment retained as rollback reference: `3ca53e0b-cb53-4ea1-baab-dba01676d347`. No rollback performed.
- `https://maro.al/` returns 200 with valid TLS and DNS resolution. HTTP redirects to HTTPS. `www.maro.al` remains an existing HTTPS alias serving 200; no DNS or alias changes.
- Canonical APP_ORIGIN matches the intended domain. Empty auth callback redirects to `https://maro.al/sign-in?auth_error=missing_token`; real owner sign-in and MFA also succeeded. No observed localhost/Vercel redirect or redirect loop.

## Production environment

All required web names verified present: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `APP_ORIGIN`, `NEXT_PUBLIC_SIGNUP_ENABLED`. Canonical origin and explicitly disabled signup verified without recording values. No required names missing.

Scheduler `APP_ORIGIN` and `CRON_SECRET` present and match the web service. Secret copied privately through stdin; no secret contents written to files, commands, URLs, reports, or screenshots. Optional `RECONCILE_TIMEOUT_MS` uses the prepared default.

## Reconciliation service

- Created `maro-reconciliation` (`9366158f-0486-40f2-899a-4156bb60b7a1`).
- Uploaded only prepared `tools/reconciliation` as archive root, using its Dockerfile and Node 22 runner.
- Deployment `a906cebd-f8d3-49d2-843e-004599d3b213`.
- Every ten minutes, `node run.mjs`; no health check; restart policy NEVER; one run exits instead of serving web traffic.
- Deployment-time invocation at 12:32:38 UTC logged `reconcile_succeeded`, HTTP 200, 470 ms. Railway reported stopped/EXITED. This initial invocation is not counted as scheduled-delivery proof.
- Genuine 12:40 UTC scheduled run started its container at 12:40:47 and logged `reconcile_succeeded`, HTTP 200, duration 629 ms at 12:40:55.272 UTC. No manual run/restart was used. Railway advanced the next scheduled run to 12:50 UTC and reported SUCCESS, `deploymentStopped: true`, instance EXITED.
- Exit result: 0, established by the prepared runner's success path (`process.exitCode = await run()`, returning 0 after the success acknowledgement) and Railway's successful stopped instance. The exposed Railway deployment API does not separately return a numeric exit-code field.
- Delivery verified: Railway schedule → prepared runner → HTTPS maro.al → matching bearer authorization → endpoint reconciliation → successful acknowledgement → process exit. This was a legitimate zero-work run; no stale financial fixture was created.

## Unauthorized cron check

Unauthenticated POST returned 401 `unauthorized`. Source authenticates before calling reconciliation. The final comparison found no job, ledger, balance, order, email, membership, or notification mutation. No authorized manual cron request was made.

## Financial post-check

Predeployment baseline: internal credits 3047, reserved 0; 63 total generation jobs; 125 generation records; 133 credit transactions; 484 credit orders; 70 email logs. V1 operations: total 2, completed saved result 1, failed released result 1, pending/stale/settlement-pending all 0.

The completed existing job is charged 5/reserved 0 with stored output and saved history. The failed original remains charged 0/reserved 0, released, retaining its stored output without history.

Final read at 12:41:33 UTC: credits 3047/reserved 0, all above counts unchanged, and full-table SHA-256 comparisons unchanged for generation jobs, generations, credit transactions, credit orders, email logs, memberships, and user notifications. No duplicate charge, unexpected release, new job, or account-state change. The four retained failed-email logs remain preserved within the unchanged email table.

## Admin MFA and preview

Owner personally completed existing-account sign-in/MFA and confirmed readiness. Verified the authenticated `/admin` overview, Imazh configuration, Logo configuration, and dedicated Generations/Operations page. Existing MFA gates remained enabled.

Both published canonical previews completed with “Canonical preview ready. No generation or charge.” Imazh version `v1`, Logo `v1-canonical-phase4`, both estimated 5 credits. No draft, save, publish, price, model, or instruction mutation. The existing preview endpoint compiles without calling a provider and records its normal `engine.compile_dry_run` audit event for each preview.

## Owner history

Through the normal authenticated `/krijimet` UI, opened existing generation `4de70086-3fee-4929-aeac-415b259ef42b`. The private signed image visibly rendered and reported natural dimensions 1024×1024. No signed URL was retained. Admin Operations verified linkage to job `e010ed82-07a4-40b7-86a4-8b4048f33d6a`, completed, stored, history saved, charged 5/reserved 0. No generation was submitted.

## Imazh walkthrough

Flare selected by default, 5 credits, “Fast · Recommended.” Sunburst available at 5 credits, “Alternative · More deliberate”; selection worked. References attachment control, presets, and authenticated workspace Brain were available. No generation submitted.

## Logo walkthrough

Configured landing wording and options loaded. All three wizard steps worked using local synthetic preview text. No model selector or Brain; final button showed 5 credits. No generation submitted or content saved.

## Coming Soon

Production pages show Web V1.5, Filma V2, Audio V2, Marketing V2 as Coming Soon; Fort absent from navigation. Direct Web/Audio routes and Filma/Marketing/Fort image requests returned 403 `module_unavailable` before generation/billing/provider work.

## Signup and payment

Signup page explicitly shows registrations closed. Empty signup POST returned 403 `signup_disabled`. No user, signup email, or test email created. Payment implementation, variables, and live-payment state untouched; payment finalization remains outside this phase.

## Production log review

No startup/configuration/Supabase/unhandled V1 error observed in the scoped deployment review. The deliberate empty auth callback produced its expected `missing_token` warning (five stderr lines classified as error by Railway; all matched that expected callback). Zero unexplained error entries. Final platform read at 12:42:12 UTC showed the web deployment SUCCESS and its instance RUNNING. Existing React hook lint warning in `cards.tsx` did not prevent build or health. Railway warns that legacy config-as-code support ends 2026-12-01; no infrastructure refactor performed in this phase.

## Supabase final read

Final read confirms lifecycle readiness 2 and reachable 0049 Operations and Logo content. Imazh Flare enabled/default/5; Imazh Sunburst enabled/non-default/5; Logo Flare enabled/sole/default/5. Published versions remain `v1` and `v1-canonical-phase4`; model, full published-prompt, and Logo-content hashes match the baseline. V1 pending, stale, and settlement-pending counts remain zero.

## Production mutations

1. Created the separate reconciliation service.
2. Set only its required origin and shared cron-secret variables, using skip-deploys.
3. Set its ten-minute schedule, prepared start command/Dockerfile, no health check, and NEVER restart policy.
4. Deployed the accepted local web snapshot to the existing service.
5. Deployed the prepared isolated reconciliation runner; Railway executed its initial run and the genuine 12:40 UTC scheduled zero-work reconciliation. The ten-minute schedule remains active.
6. Owner performed normal sign-in/MFA. The two authorized canonical previews recorded their normal audit events.

No source product behavior changes, payment changes, customer-credit mutations, provider calls, test emails, synthetic financial jobs, incident cleanup, or account-state repair. Four incident email logs and unknown-prior-state internal membership were deliberately preserved. No production integration suite or local regression suite was rerun. Deployed source includes accepted test-worker credential isolation.

## Evidence and known limitations

Safe local evidence is retained under ignored `scripts/phase8b-data/`: required-variable gates, source manifest, HTTP checks, parked-module results, browser verification, and financial snapshots. Earlier incident reports/evidence remain intact.

Admin Operations contains existing static wording that scheduler delivery remains unverified; external Railway run evidence is authoritative for this phase. Existing profile-avatar images did not render during the image walkthrough; the private generation itself loaded correctly. Neither observation prompted an out-of-scope product change.

## Final verdict

RAILWAY PRODUCTION VERIFICATION PASSED

## Next step

Next separately authorized work: Public Auth / Onboarding Finalization, later Raiffeisen Payment Finalization, then Final Public Launch Verification. None started automatically. Phase 8B success does not authorize public launch.
