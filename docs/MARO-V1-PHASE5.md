# MARO V1 — Phase 5 report

17 September 2026. Active scope: maroImazh and maroLogo, continuing the accepted Phase 4 working tree. No deployment, payment gateway change, broad cleanup, or Phase 6 implementation.

## PHASE 5 STATUS

**PASS.** Local implementation, failure injection, real PostgreSQL concurrency checks, and corrected Supabase recovery verification passed. The first live request exposed an incorrect workspace-ID cast in migration 0047; the failure path safely released its reservation without a charge. The user applied correction 0048, and the saved provider result then completed through the real route and Supabase lifecycle with exactly one 5-credit charge. No additional OpenAI request was made. The verification limitations and harness capture error are disclosed below.

## SUCCESS INVARIANT

A normal V1 success response now requires all of the following:

1. Exactly one provider output passes byte validation and full raster decoding.
2. That image is stored in the private `generations` bucket at `<user UUID>/<job UUID>/output.png`.
3. The upload is verified by downloading that exact object and comparing its SHA-256 with the decoded PNG bytes. A lost upload response can be recovered only when the existing object matches; a transient/base64 response is never success.
4. The required restricted Phase 4 execution trace and trusted model/price snapshot remain associated with the job.
5. A non-null history UUID is created by a database transaction. `generations.job_id` uniquely links it to the job; user, module, model, owned workspace, and output reference come from the immutable trusted job snapshot.
6. Database evidence confirms the linked history and committed storage object metadata exist and match the job.
7. Reservation conversion to a charge is verified as `finalized` or `already_finalized`, with one ledger charge, the correct history credit amount, no remaining job reservation, and a completed job.
8. The API returns the generation ID, job ID, durable storage reference, logical model, and charged credits. Signed display URLs are a convenience; their failure cannot erase an already completed durable result.

The SQL transaction does not include OpenAI or object storage. It coordinates only history creation/linkage and the ledger/job/history financial state after external storage exists.

## JOB LIFECYCLE

The existing database status vocabulary is retained. Detailed progress is in safe `metadata.v1_lifecycle` fields; internal prompt content remains in the restricted Phase 4 trace.

| Progress | Job status / evidence |
| --- | --- |
| Created | `pending`; immutable V1 request/configuration snapshot |
| Reserved | `reserved`; one reserve ledger row; spendable balance debited |
| Provider running | `processing`; verified start transition and required private trace |
| Provider output validated | `processing`; `provider_succeeded` checkpoint, expected object path/hash, provider observation |
| Stored | Same checkpoint plus committed object; route verifies bytes by reading back |
| History committed | `processing`; `persisted`, linked generation UUID, one history row with zero credits spent until finalization |
| Settlement uncertain | `processing` with persisted evidence; explicit `settlement_pending` where the RPC can record it, or inferred from durable history without a charge during an outage |
| Completed | Atomic charge + history credits + job `completed`, zero reservation |
| Provider/persistence failure | Database-controlled release and `failed`, or a truthful reconciliation-pending response if that release cannot be verified |

Database terminal guards reject attempts to reactivate or change the financial terminal fields of completed, failed, or cancelled jobs. V1 user/module/model/request/canonical-configuration identity is immutable after job creation. A released job cannot later persist history or charge when its provider finishes late.

Browser disconnects and SSE cancellation stop delivery, not the durable progression after provider work begins. Enqueue/heartbeat failures cannot enter the financial failure path. Process death is handled by the durable checkpoints and existing reconciliation entry points.

## STORAGE

`storeV1ImageOutput` replaces nullable/best-effort image upload in the active V1 route. It requires one valid image, decodes it to PNG, records the provider-result checkpoint, uploads without overwrite, and reads the object back to verify its hash. It returns only an owner/job-bound private storage reference.

Upload failure, a wrong returned path, a missing object, or mismatched bytes cannot produce a normal success or charge. A transport-uncertain upload is accepted only if the deterministic stored object matches the expected bytes.

If history subsequently fails, the stored asset is retained under its job path for diagnosis or explicitly authorized recovery. It is not deleted to hide a failed purchase. No automatic orphan deletion policy was added.

Stale SQL reconciliation checks committed storage-object metadata and the provider checkpoint rather than downloading image bytes inside PostgreSQL. It can create the missing history from the frozen request when a process died after storage. It does not pretend to provide a transaction across the provider, object storage, and database.

## HISTORY

`persist_v1_image_generation` locks the job, checks its state and storage evidence, and inserts history plus its job linkage in one database transaction. Repeated calls return the same history ID. The unique `generations(job_id)` index prevents independent duplicate history purchases.

The route's `persistV1ImageHistory` wrapper throws on an RPC error, null, or invalid UUID. It has no schema-compatibility fallback and no nullable success contract. The older `logGeneration` helper remains for other paths; the V1 route no longer calls it.

History starts with `credits_spent = 0`. Finalization updates that row to the actual reserved amount in the same transaction as the charge ledger and terminal job. User history stores the normalized user request and an empty `final_prompt`; the canonical prompt remains private.

Migration 0048 uses Maro's actual text workspace IDs and checks workspace ownership. The earlier UUID cast was an implementation error, not a requested workspace architecture change.

## CREDIT LIFECYCLE

**Reserve:** lock the job, validate user/state/amount, then lock the profile. One job's repeated reserve returns its existing reservation instead of debiting again. A new job after a terminal failure receives its own legitimate reservation even when a client reuses an idempotency key.

**Finalize:** lock the same job; reject released or invalid terminal states; require V1 durable evidence and the frozen configured amount; release the profile's hold, insert the unique charge, set history credits, and complete the job atomically. A repeated finalized call verifies the existing charge/history/job state rather than charging again.

**Release:** use the same job lock and lock order as finalize/persist/reconcile. Completed or charged jobs cannot release. A V1 job with committed history retains its result and hold for reconciliation instead of being refunded after an uncertain settlement. Repeated releases create only one release ledger row.

**Reconcile:** each stale job is rechecked under the database lock. A committed output with provider evidence can repair missing history; durable history can finish settlement. Work without durable success evidence releases safely. Already completed/released jobs remain terminal. The SQL batch reconciler uses `FOR UPDATE SKIP LOCKED`; the application cleanup delegates to the same per-job RPC.

The existing unique charge-per-job index is retained. No process-local JavaScript lock is relied upon. `completeGeneration` now rejects a false finalization result; ledger wrappers accept only a real boolean `true`. The V1 route uses richer settlement results and preserves pending work when the outcome is unknown.

Optional accounting, telemetry, preset counters, and signed URL work are isolated after verified settlement. They cannot trigger a release or tell the route to overwrite a completed job as failed. Provider identity remains the trusted configured OpenAI provider; the provider observation is preserved in the job checkpoint even when persistence fails. No provider-cost redesign was undertaken.

## RESERVATION ACCOUNTING

The double subtraction existed in both `reserve_credits` and application availability calculations. The stored `profiles.credits` value already represents the spendable amount after reservations. It is now used directly by the reserve RPC, preparation guard, and entitlement calculation.

Verified arithmetic:

```text
credits 10, reserved 0
reserve 5 → credits 5, reserved 5, available 5
reserve another 5 → credits 0, reserved 10, available 0
release both → credits 10, reserved 0
```

No customer balance or historical ledger rewrite was performed.

## FAILURE MATRIX

| Failure point | Durable output | History | Charge | Reservation | Final job state |
| --- | --- | --- | --- | --- | --- |
| Provider failure | No | No | None | Released when verified | Failed, provider failure recorded |
| Invalid or unexpected-count output | No accepted result | No | None | Released | Failed, invalid-output reason |
| Upload/read-back verification failure | Missing or untrusted; possible retained orphan | No | None | Released or pending DB recovery | Failed storage, or recoverable pending |
| History transaction rolls back | Yes, retained | No | None | Released when safe | Failed history |
| History committed but response lost | Yes | Yes | Not claimed | Retained | Recoverable; release RPC refuses to discard persisted work |
| Finalization exception before commit | Yes | Yes | Rolled back | Retained | Processing/persisted, awaiting reconciliation |
| Finalization committed but response lost | Yes | Yes | Exactly one | Cleared | Completed; replay returns already finalized |
| Optional telemetry/accounting failure after settlement | Yes | Yes | Exactly one | Cleared | Completed; API success remains success |
| Repeated finalization | Yes | One row | Exactly one | Cleared | Completed |
| Release after finalize | Yes | Yes | Exactly one | Cleared | Completed; release is false/no-op |
| Finalize after release | Possible late orphan | No accepted new history | None | Already released | Failed; finalization rejected |
| Stale race with persisted result | Yes | One row | Exactly one | Cleared on finalization | Completed, never charge plus release |
| Stale race before history | Possible object | Either no accepted history or one committed row | Zero or one, according to the locked winner | Released or finalized, never both | Coherent failed or completed outcome |
| SSE disconnect | Progress continues | Required for success | Per job, not connection | Settled or recoverable | Durable truth independent of delivery |

## CONCURRENCY / IDEMPOTENCY

Final local PostgreSQL evidence comprises **15 checks** using independent sessions:

- Text `ws_…` workspace preservation and ownership.
- Two simultaneous 5-credit reservations from 10 credits.
- Eight repeated reserves on one job producing one debit.
- Failure release idempotency and finalize-after-release rejection.
- Injected history transaction failure retaining the object without a charge.
- Six simultaneous history calls returning one ID; twelve finalizations producing one `finalized` and eleven `already_finalized` results.
- Injected charge-insert exception rolling the transaction back and preserving history for a later successful finalize.
- Eight iterations each of release/finalize and release/late-history races.
- Concurrent stale reconciliation and finalization after a storage checkpoint.
- Stale provider success without storage releasing safely and rejecting resurrection.
- Concurrent duplicate submission, plus duplicate rejection after completion.
- An intentional retry after terminal failure creating a new separately reserved job.
- Missing/wrong storage, trace, model, or history ownership preventing charge.
- Ordinary roles denied the new privileged RPCs.

The original active-job unique index is preserved. A database insertion guard serializes idempotency-key checks and also rejects keys belonging to completed purchases. A failed/cancelled attempt may intentionally be retried as a new job; it cannot revive or recharge the released old job.

Provider-wrapper invocation is not equated with provider HTTP attempts. The customer charge belongs to a successful Maro job, never an SDK retry. The live harness separately counted HTTP attempts.

## LIVE CHECK

The initial internal Imazh Flare call used exactly **one OpenAI HTTP attempt**. Its provider output was stored and read back successfully. History then failed because 0047 cast the real text workspace `ws_13090214f4c5` to UUID.

- Original job: `68300176-1c4e-4735-b98b-cce0c102cbc4`.
- Final original state: `failed`, reason `history_failed`.
- Ledger: one 5-credit reserve and one 5-credit release; **no charge**.
- Balance: **3052 → 3047 reserved → 3052**, final reserved **0**.
- History: no row, as expected after a failed insert.
- Stored image: retained and downloaded; private reference tied to the original job.
- Executed canonical hash: `7b7ef37b776bbd6562c487059162dc7ed83168d1d48cc3199f265d56b52b1314`.

This was useful live failure evidence but was not reported as a successful generation. The incorrect local fixture had used UUID workspaces with null test values; it has been corrected to the existing text workspace schema and all concurrency tests rerun with actual `ws_…` values.

Migration 0048 and a prepared saved-result verification finish the integration without another paid provider generation. That check invokes the real route and Supabase lifecycle, substituting only the already-produced image at the provider boundary and forbidding OpenAI network access. It uses a new internal job/reservation; the original failed job stays released. This is an explicit verification harness, not a new automatic production recovery feature.

**Final saved-result check: verified.** The user explicitly approved this check after applying 0048. The real corrected route returned success with linked history and a verified stored object. Five concurrent repeated finalizations returned `already_finalized`; release-after-finalize returned false; reconciliation returned `completed`; duplicate submission returned HTTP 409 without a second provider-boundary invocation.

| Final evidence | Value |
| --- | --- |
| Recovery job | `e010ed82-07a4-40b7-86a4-8b4048f33d6a` |
| Generation/history | `4de70086-3fee-4929-aeac-415b259ef42b` |
| Restricted trace | `9f7b55b9-cdbc-4dd2-b393-cb9b1ec67038` |
| Original live provider request | `req_fb8d2e3853744f798ebf551681837350` |
| Canonical hash, original and recovered | `7b7ef37b776bbd6562c487059162dc7ed83168d1d48cc3199f265d56b52b1314` |
| Recovery configuration hash | `187603156abd9a468fa0514c9158d8708885252096a3cbb4cdab30656ded3aef` |
| Final credits / reserved | **3047 / 0** |
| Net customer credits charged in Phase 5 | **5** |
| Live OpenAI HTTP requests / additional recovery requests | **1 / 0** |

After all critical recovery assertions had passed, the harness incorrectly treated the empty response from a successful auxiliary metadata update as missing data. The helper call was corrected. The recovery request was not repeated: `audit-recovery.mjs` reread the committed job, history, ledger, trace and stored bytes, verified all invariants, and wrote the final evidence with exit 0. This distinction preserves the actual test history rather than presenting the original harness run as an unqualified pass.

## PRICING

Read-only Supabase inspection confirmed the active Phase 2 allowlisted rows remain:

| Model | Credits | Pricing stage |
| --- | ---: | --- |
| Imazh Flare | 5 | Launch |
| Imazh Sunburst | 5 | Launch |
| Logo Flare | 5 | Launch |

No model configuration, descriptor, default, canonical prompt, layer order, Brain behavior, preset behavior, or customer visual design was changed.

## FILES CHANGED

Phase 5 changes only; earlier and unrelated working-tree modifications remain intact.

| File | Reason |
| --- | --- |
| `src/app/api/ai/image/route.ts` | Require verified output/history/settlement; truthful failure classes; preserve pending results; isolate optional work and SSE delivery. |
| `src/lib/generation/v1ImagePersistence.ts` | Strict storage/read-back, required history RPC, verified settlement/release wrappers, safe error codes. |
| `src/lib/generation/orchestrator.ts` | Require corrected lifecycle readiness/start for V1, fix available-credit arithmetic, verify legacy completion result, separate optional post-completion accounting. |
| `src/lib/generation/jobs.ts` | Delegate stale reconciliation to database-locked evidence checks; surface reconciliation query/RPC failure. |
| `src/lib/credits/ledger.ts` | Accept only boolean `true` from finalization/release RPCs. |
| `src/lib/commerce/entitlements.ts` | Stop subtracting a reservation twice from available credits. |
| `src/lib/__tests__/v1-image-route.test.ts` | Preserve canonical/model regressions and inject provider, storage, history, settlement, telemetry, and disconnect failures. |
| `src/lib/__tests__/v1-image-persistence.test.ts` | Validate output count/decoding, upload/read-back contract, history IDs, settlement replay, and unverified-release behavior. |
| `src/lib/__tests__/credit-lifecycle.test.ts` | Verify corrected availability, false-finalization rejection, readiness gate, and database-owned stale reconciliation. |
| `supabase/migrations/0047_v1_durable_settlement.sql` | Job/history linkage and guarded reserve/persist/finalize/release/reconciliation RPCs. |
| `supabase/migrations/0048_v1_history_workspace_text.sql` | Correct the applied 0047 function for owned text workspace IDs; bump readiness version to 2. |
| `tools/phase5/database-fixture.sql` | Isolated PostgreSQL fixture matching relevant existing schema, including text workspaces. |
| `tools/phase5/database.test.mjs` | Real independent-session database races and failure injection, loopback-only. |
| `tools/phase5/vitest.config.ts` | Explicitly selected live/recovery harnesses outside ordinary tests. |
| `tools/phase5/live.verify.ts` | Bounded one-image live check with provider HTTP count and durable/financial assertions. |
| `tools/phase5/recover.verify.ts` | Prepared saved-output route verification with OpenAI network forbidden and replay checks. |
| `tools/phase5/inspect-remote.mjs` | Read-only lifecycle readiness and approved pricing inspection. |
| `tools/phase5/inspect-failure.mjs` | Read-only capture of the live failed job, ledger, balance, and stored image. |
| `tools/phase5/audit-recovery.mjs` | Read-only final proof of the completed recovery, single charge, original release, and durable result. |
| `docs/MARO-V1-PHASE5.md` | This report. |

Ignored `scripts/phase5-data/` contains before-source backups, local PostgreSQL runtime/test evidence, readiness snapshots, and restricted live diagnostics/image. It is not a public deliverable and contains no saved credential values. An unused remote-user diagnostic script was removed after its execution was blocked; it never created a user or remote test records.

## MIGRATIONS

- **0047:** applied by the user and confirmed through Supabase readiness version 1. Adds only the history/job link/index and lifecycle guards/RPCs. Existing financial tables/charge uniqueness are reused; no payment schema or historical balance rewrite.
- **0048:** corrects the workspace-ID mistake in 0047 without editing the applied migration. Applied by the user and confirmed in Supabase with readiness version **2**, followed by successful corrected route/history/settlement verification. The application requires version 2 before creating a new V1 job or spending at the provider.

Both migrations explicitly restrict their privileged functions to the service role. No earlier migration was rewritten.

## TEST RESULTS

Run from `C:\Users\nicep\Desktop\maro-al\maro-al`.

### Local unit/regression

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL=''
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=''
$env:SUPABASE_SERVICE_ROLE_KEY=''
$env:OPENAI_API_KEY=''
pnpm test -- --reporter=dot
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Final unit suite: **875 passed, 11 skipped; 886 tests across 65 files, 64 passed and 1 skipped.** The skipped commerce/database suite remained disabled; no Raiffeisen tests or payment orders were run. TypeScript: **exit 0, no errors**.

Targeted route/persistence/credit runs were used while implementing failures. Their earlier expected failures were fixed before the full passing run. Expected logs from deliberately failing optional telemetry are not suite failures.

### Real PostgreSQL

The official Windows PostgreSQL binaries were obtained from [EDB's PostgreSQL distribution](https://www.enterprisedb.com/download-postgresql-binaries). The server listened only on `127.0.0.1:55435` and used the isolated `phase5_test` database with generated local test users and no customer data. Docker startup failed, so no Docker test database was used or reset.

Fixture and migration invocation:

```powershell
psql -h 127.0.0.1 -p 55435 -U phase5 -d phase5_test -v ON_ERROR_STOP=1 -f tools/phase5/database-fixture.sql
psql -h 127.0.0.1 -p 55435 -U phase5 -d phase5_test -v ON_ERROR_STOP=1 -f supabase/migrations/0047_v1_durable_settlement.sql
psql -h 127.0.0.1 -p 55435 -U phase5 -d phase5_test -v ON_ERROR_STOP=1 -f supabase/migrations/0048_v1_history_workspace_text.sql
node tools/phase5/database.test.mjs
```

The actual executable was `scripts/phase5-data/postgresql-runtime/pgsql/bin/psql.exe`. The already-running initial fixture was corrected to text workspaces before applying 0048 and rerunning; the checked-in fixture reflects that corrected schema. **15 checks passed, exit 0.** The 0047 installation was also reapplied locally to verify replay-safe DDL before the later correction was created. The disposable local database is shut down and its test data removed during closeout; its evidence JSON and fixture remain.

### Supabase / provider integration

```powershell
node --env-file=.env.local tools/phase5/inspect-remote.mjs
$env:MARO_PHASE5_LIVE_APPROVED='1'
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config tools/phase5/vitest.config.ts --reporter=verbose
node --env-file=.env.local tools/phase5/inspect-failure.mjs
```

Initial live harness: **failed at required success assertion**, correctly reflecting a released history-insertion failure. Exactly one provider HTTP attempt; zero customer charge. Read-only failure inspection passed. The prepared recovery harness is selected only with `MARO_PHASE5_RECOVER=1` and explicit `MARO_PHASE5_RECOVERY_APPROVED=1`; it refuses repeated recovery jobs/checkpoints and makes no provider network call.

```powershell
$env:MARO_PHASE5_RECOVER='1'
$env:MARO_PHASE5_RECOVERY_APPROVED='1'
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config tools/phase5/vitest.config.ts --reporter=verbose
node --env-file=.env.local tools/phase5/audit-recovery.mjs
```

Recovery route, persistence, replay, duplicate, and ledger assertions passed; the harness exited with the auxiliary empty-response capture error described above. **The final read-only audit passed, exit 0.** The initial failed purchase stayed released; the approved recovery finalized one 5-credit charge. No new remote test user or payment order was created.

Automatic approval review initially rejected the live check; it accepted the existing explicit Phase 5 authorization after the brief and bounded payload were rechecked. A separate remote diagnostic-record proposal was rejected and never executed. Diagnosis instead used read-only evidence and the local database. The subsequent saved-result check had explicit additional user approval and completed as described.

## KNOWN LIMITATIONS

- The original live attempt failed on the workspace cast. Corrected full-route/Supabase success was verified with its saved provider output, not a second fresh OpenAI generation. The original real provider call and corrected downstream lifecycle are separately evidenced.
- SQL reconciliation verifies storage metadata, not an end-to-end object checksum; the active route does perform the checksum read-back. This is not protection against later deliberate object deletion or a catastrophic storage failure.
- A history-less retained object from an explicitly failed/released job is not automatically recharged or resurrected. It requires intentional recovery/cleanup. The prepared one-off internal recovery harness does not change that product policy.
- The existing ten-minute reconciliation schedule is present in `vercel.json`. Scheduler delivery after deployment was not verified because deployment is prohibited in this phase. Direct reconciliation logic and database races were tested.
- Optional accounting failures remain operational repair work. Provider observations/checkpoints survive, but this phase does not claim perfect invoice reconciliation or automatic repair of every secondary aggregate.
- Interrupted response delivery is tested; no new queue or guarantee that a hosting process survives termination was introduced. Recovery uses durable checkpoints and existing reconciliation entry points.

## NEXT RECOMMENDED PHASE

The next phase is **V1 operational admin finalization**: make pending settlement, persistence failures, retained orphans, and reconciliation outcomes reviewable and actionable, and verify the scheduled recovery path during the later authorized deployment process.

Phase 6 has not been started.
