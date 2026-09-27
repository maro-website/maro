# Phase 8A regression execution incident

Current disposition, September 18, 2026: **Phase 8A.1 and Phase 8A are closed as PASS WITH DOCUMENTED INCIDENT.** The original assessments and September 17 addendum below are preserved as historical evidence; the final owner-decision addendum records the accepted resolution.

## What happened

On September 17, 2026, approximately 14:20:07–14:20:25 UTC, the first `pnpm test` run inherited the repository's existing `vitest.setup.ts`, which automatically loaded `.env.local`. That supplied the connected Supabase service credential and activated the legacy commerce integration suite. I should have inspected and isolated that setup before running it. This violated the Phase 8A prohibition on production mutation and payment work. It was not authorized by the brief.

The suite creates synthetic accounts, test-provider orders, membership/credit records and notifications through existing application/RPC paths. Nine integration cases passed and two legacy reservation cases failed. Its teardown deleted its synthetic Auth users, but retained records and a broad renewal-reminder operation had additional effects. No application payment implementation/schema was edited and no bank/payment provider was called. No OpenAI generation occurred.

The incident was disclosed during the task. No further mutating integration runs or cleanup actions were performed. All subsequent remote assessment was read-only.

## Read-only assessment

Assessment window: 14:20:00–14:20:40 UTC. Evidence: `scripts/phase8a-data/regression-impact.json`, produced by `tools/phase8a/inspect-regression-impact.mjs`.

| Finding | Verified result |
| --- | --- |
| Synthetic Auth accounts created in the window | None remain; Auth pagination completed |
| Synthetic test-provider orders | 17 remain, all with null user linkage; 13 marked paid by test fulfillment, 4 pending |
| Credit transactions remaining from the window | 0 |
| Generation jobs created in the window | 0 |
| Email outbox rows in the window | 0 |
| Email logs in the window | 4 failed with `CONFIG_MISSING`, no linked recipient remains |
| Surviving notification in the window | 1 billing renewal notification on the accepted internal account |
| Surviving membership updated in the window | 1, belonging to that same internal account, now `RENEWAL_WINDOW` |
| Accepted internal account credits/reserved | 3047 / 0, equal to the Phase 5 accepted baseline |
| V1 configuration and operations | Lifecycle v2, migration 0049 functionality, accepted prompts and 5/5/5 prices intact; no pending/stale/settlement-pending generation |

The observed failed email logs indicate no successful email delivery in the assessed run. The source uses test-provider database fulfillment, not live payment processing. The assessment does not claim to have inspected all platform audit logs or recovered prior membership status. The renewal code updates a status/timestamp, not expiry or plan; no pre-run membership status snapshot exists for a trustworthy automatic rollback.

## Records for owner review

Synthetic order IDs (all `provider=test`, all user links null):

| Order ID | Status |
| --- | --- |
| `d490466e-2355-429c-8289-bf395f7dfa72` | paid |
| `f5e20832-dbd0-49d1-a540-d6ce966c9300` | paid |
| `57c837cd-fadf-4a7c-a9ff-77feb5d6a61a` | pending |
| `c087a691-ed6a-404b-9950-759790612f26` | paid |
| `4480ea1b-0c7b-466d-be87-cd9e5ed9a57d` | paid |
| `086a2664-fb0c-44ac-8ed0-1b22ad8cf486` | paid |
| `539c2e3a-3dac-4db1-ba39-a1fefc98bced` | pending |
| `7f179cd5-361f-4abc-9967-12ad3cb073d3` | paid |
| `fe5ab39b-cf06-41f9-a6b1-a19a7be71560` | pending |
| `e7e4bf91-e45a-40a6-bf26-fefd9b14ae17` | paid |
| `5c639474-32f8-4617-a59e-54f4f114e898` | paid |
| `9ed41241-7ccf-400c-a64a-a231939276eb` | paid |
| `336f8e5f-834c-43e9-ae1b-5af0a2c24695` | paid |
| `6783d2a9-ada9-4db2-959e-e7cc47710cb2` | paid |
| `2e74b691-e679-483e-8e67-b2f0e1c98943` | pending |
| `5cb24f16-71b0-4e35-9802-80a22c8cff3d` | paid |
| `5fb10511-e796-4728-ae43-1a360dc91267` | paid |

Internal-account notification: `a68c510f-6802-4f59-9923-ce633418a3e3`.

Internal-account membership: `183f4a2a-b8bf-400d-8043-c48f6871f03a`.

Owner review is required to decide whether to retain the synthetic records as incident evidence or authorize a narrowly scoped cleanup. No cleanup SQL or production write was run after detection. Do not infer an earlier membership status or change its expiry, plan, credits or payment state.

## Prevention and validation

`vitest.setup.ts` no longer loads local environment files. Ordinary regression clears inherited Supabase and provider credentials. Database integration requires a separate `VITEST_LOCAL_INTEGRATION` opt-in plus an explicitly supplied loopback Supabase URL and test service key; remote hosts fail before tests. Provider/email credentials remain blocked even in local integration mode.

Four subprocess checks passed: inherited production access stripped; explicit remote integration rejected; explicit loopback accepted; missing local test key rejected. The safe full regression then passed 946 tests, with all 11 database integration cases skipped. The payment implementation and legacy integration assertions were not changed to conceal the failure.

Phase 8A remains PARTIAL pending this incident's owner review, despite passing infrastructure verification. No Phase 8B deployment is authorized or underway.

## Phase 8A.1 closure addendum — September 17, 2026

The owner conditionally authorized removal of proven incident records. All 17 exact order IDs above were proved against fixture identities, timestamps, amounts and generated transaction strings; no dependent or real-customer order was found. A saved dry run preceded the approved deletion. All 17 orders are now gone; the 484 unrelated orders and all other snapshotted records are unchanged. The safe ignored manifest `scripts/phase8a1-data/cleanup-1789657039776.json` records the proof, deletion and verified before/after hashes.

Correction from deeper email inspection: two failed-email logs concern the synthetic domain and two the existing internal account's domain. Null recipient links do not prove user deletion because the renewal sender never supplies that field. None retains an order/test-run ID. All four logs remain pending proof or explicit owner acceptance of retention as incident evidence. No successful delivery was recorded.

No account rollback occurred: **pre-incident value unknown — no speculative rollback performed**. Audit and saved-snapshot review did not establish its previous status. Credits remain 3047, reserved 0. The known internal-account status/notification difference is preserved for later deliberate configuration.

Credential isolation was reverified with six subprocess tests and an ordinary regression run with fake remote parent credentials: 946 passed, 11 skipped. For precision, the skipped set comprises ten commerce integration cases plus one workspace-trigger integration case; the earlier report used “11 commerce integration tests” loosely.

Closure remains PARTIAL pending email-log disposition. See `MARO-V1-PHASE8A1.md` for the full closure report. The original incident narrative above remains the historical record; this addendum records subsequent authorized actions. No deployment or Phase 8B execution occurred.

## Final owner decision and closeout — September 18, 2026

The owner explicitly directed: retain all four failed-email logs as documented incident evidence, without deletion or modification, because their origin is not conclusively attributable to the regression run. This is the final disposition of log IDs `d654f9f1-31a5-4c0b-aa41-020b8cd6c573`, `ee56c447-73d4-426d-b4b6-5f587eb3b3ae`, `a57138a9-ceb5-413c-86af-9c5662cb1e2e` and `3a0fe43b-4d85-415b-a927-40caea995e84`.

The owner accepted the verified removal of the 17 proven synthetic orders, unchanged unrelated records and credit state of 3047 / 0 reserved. The internal account remains unchanged: **pre-incident value unknown — no speculative rollback performed**. Retention does not assert that all four email logs were caused by the incident.

**Phase 8A.1: PASS WITH DOCUMENTED INCIDENT.**

**Phase 8A: PASS WITH DOCUMENTED INCIDENT.**

**Railway verdict: READY FOR AUTHORIZED RAILWAY DEPLOYMENT VERIFICATION.**

All original incident evidence and reports remain preserved. The September 18 closeout updated local documentation and added an ignored owner-disposition artifact only; it performed no production query or mutation, no log/account changes, and no test rerun. It does not authorize or start Phase 8B, deployment, signup enablement or payment work.
