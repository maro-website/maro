# MARO V1 — PHASE 8A.1 incident closure

## INCIDENT CLOSURE STATUS

**PASS WITH DOCUMENTED INCIDENT — closed by owner decision on September 18, 2026.** The 17 proven synthetic orders were removed under the owner's conditional authorization and verified gone. The owner explicitly directed retention of all four failed-email logs as documented incident evidence because their origin is not conclusively attributable to the regression run. They must not be deleted or modified. The unknown internal pre-state remains a documented limitation; no speculative rollback was performed. This final closeout updated documentation only. No deployment, signup enablement, paid generation, payment implementation change or remote integration-test execution occurred in this closure task.

## SYNTHETIC ORDERS

**17 identified; 17 deleted; 0 remain.** Exact IDs remain in `MARO-V1-PHASE8A-INCIDENT.md` and the ignored cleanup manifest.

Proof combined the previously recorded explicit ID allowlist with the exact fixture-generated identities and their embedded millisecond timestamps, creation/capture times within the incident, test billing fields, item/amount/currency tuples, and the successful legacy test log. All had `provider=test`, null Auth-user and membership links, no external provider order ID and no promotion/cancellation association. Fifteen had no provider transaction ID; the other two exactly matched source-generated strings consisting of `tx-std-` or `shared-tx-` plus their own order UUID. These were fixture strings, not external payment transactions. The 13 paid / 4 pending statuses matched the recorded incident evidence.

The live API schema identified the incoming `credit_transactions.order_id` foreign key and soft order references in support tickets, pricing snapshots, refund records and creator commissions. Repository migration 0038 specifies `ON DELETE SET NULL` for the credit-transaction reference. Every related-table reference check returned zero, including order UUIDs within metadata. No other order contained a target UUID; no direct target-order audit dependency was found. Membership and notification records had no reference to these orders. The tool refuses newly exposed order-reference relationships. Review covered current exposed schema and repository migrations; direct PostgreSQL catalog access was not available.

A separate dry run saved safe evidence and printed the summary before deletion. Mutation required the explicit `MARO_INCIDENT_8A1_APPROVAL` flag. A fresh snapshot had to equal the preflight snapshot immediately before execution. One DELETE request targeted only the fixed 17 IDs with additional test-provider/null-link guards. It returned exactly those 17 IDs. No deletion by time window, email or account alone was used.

## FAILED EMAIL LOGS

**4 identified; cleanup performed: no; 4 remain.** All were failed Resend attempts with `CONFIG_MISSING`, product channel, zero recorded provider latency, no provider message ID, no outbox link, and no retained recipient-user link.

| Exact log ID | Created at, UTC on 2026-09-17 | Association evidence | Failure |
| --- | --- | --- | --- |
| `d654f9f1-31a5-4c0b-aa41-020b8cd6c573` | 14:20:20.598759 | Internal account's domain; renewal template; exact invocation unproven | CONFIG_MISSING |
| `ee56c447-73d4-426d-b4b6-5f587eb3b3ae` | 14:20:21.606224 | Synthetic test domain; renewal template; exact test recipient unproven | CONFIG_MISSING |
| `a57138a9-ceb5-413c-86af-9c5662cb1e2e` | 14:20:22.465556 | Internal account's domain; renewal template; exact invocation unproven | CONFIG_MISSING |
| `3a0fe43b-4d85-415b-a927-40caea995e84` | 14:20:23.328895 | Synthetic test domain; renewal template; exact test recipient unproven | CONFIG_MISSING |

All use `plan_expiring_2_days`. Their alternating domains and timing fit the test's two global renewal-reminder passes, including its `notify` fixture order `d490466e-2355-429c-8289-bf395f7dfa72`. However, this is correlation, not a stored order/test identifier. The email engine persists only channel/latency metadata on these failures; it does not retain the supplied idempotency key or order ID. The renewal sender does not supply a recipient user ID, so a null recipient link does not prove that teardown deleted that recipient. Two attempts concerned an existing internal account's domain, not the synthetic domain.

The owner's condition required proof of exclusive incident origin. Timing and matching code behavior do not establish that for every row. No email log was deleted. On September 18, 2026, the owner explicitly decided to retain all four unchanged as documented incident evidence and close the incident on that basis. Their uncertain origin remains recorded; retention does not establish attribution. This corrects the earlier assumption that all four were necessarily synthetic-recipient logs without erasing the original incident record.

## INTERNAL ACCOUNT STATE

The known incident effect is a renewal notification and a membership status/timestamp update to `RENEWAL_WINDOW`. Current membership ID is `183f4a2a-b8bf-400d-8043-c48f6871f03a`; notification ID is `a68c510f-6802-4f59-9923-ce633418a3e3`. The membership update timestamp remains 14:20:22.482 UTC, within the accidental run. It has an existing Pro plan and expiry on September 19; this explains why the reminder routine selected it but does not prove its prior persisted status.

Reviewed available pre/post reports, ignored snapshots, test fixture expectations, renewal implementation, current row timestamps, exposed history-table inventory, and `audit_events` for both account and membership through the incident window. No relevant audit entry or saved pre-incident status was found. No separate membership-history table was exposed. Platform-internal logs/PITR were not available through the configured data API.

**pre-incident value unknown — no speculative rollback performed**

No account, membership or notification change was made during closure. Entire membership and notification table hashes match before and after order cleanup. The remaining known account difference is internal and can be deliberately configured later, as the owner allowed. No rollback values have been proposed as facts.

## CREDIT STATE

**3047 credits; 0 reserved.** Equal before and after cleanup and equal to the accepted Phase 5 baseline. No balance manipulation or settlement call occurred.

## EVIDENCE PRESERVED

Ignored, local safe evidence:

- `scripts/phase8a1-data/discovery.json`: explicit order IDs, synthetic fixture associations, proof flags, timestamps, safe email metadata and exposed relationship descriptions. No raw billing/auth payload is stored.
- `scripts/phase8a1-data/cleanup-1789657007906.json`: initial dry-run manifest.
- `scripts/phase8a1-data/cleanup-1789657039776.json`: mutation manifest, before/after counts and per-row hashes, exact deleted IDs, zero related-row counts and `verified=true`.
- `scripts/phase8a1-data/account-evidence.json`: audit-search result and unchanged balance.
- `scripts/phase8a1-data/isolation-tests.log` and `regression-isolated.log`: local test proof with fake credentials.
- `scripts/phase8a1-data/owner-disposition-2026-09-18.json`: explicit owner retention decision and final closure statuses; earlier evidence remains unchanged.

`git check-ignore` confirmed the evidence directory is ignored. Snapshots persist IDs/counts/hashes and approved nonsecret configuration metadata; raw rows are used in memory for comparison and never written to the manifest. No secret, token, private auth material, full sensitive payload or payment credential was printed or persisted. Human history remains in the original incident report with a dated closure addendum.

## TEST-ISOLATION PROOF

**6/6 subprocess checks passed.** They show ordinary regression clears inherited Supabase URL, anon credential, service credential and provider credential; explicit integration rejects remote hosts; a valid deliberate loopback opt-in can retain only local DB access; missing local credentials fail closed; deceptive loopback-like domains and credential-bearing URLs are rejected without fallback.

An actual ordinary **`pnpm test`** run was executed with fake remote Supabase/provider credentials in its parent shell and the non-routable `production.invalid` hostname. It passed **946 tests**, skipped **11 database integration cases**, and passed 67 files with one skipped. The ten legacy commerce cases and the separate workspace-trigger case were skipped. This is stronger than checking the environment helper alone and never used real production credentials for tests.

The incident's automatic `.env.local` loading was removed in Phase 8A. Current setup runs before test modules, clears inherited production access by default, and only permits explicit integration against loopback. It does not guarantee against someone intentionally rewriting/bypassing the test setup or connecting a loopback tunnel to production; ordinary repository regression cannot reproduce the original credential-inheritance path.

## PRODUCTION MUTATIONS PERFORMED

Exactly **17 DELETEs of allowlisted `credit_orders` rows**, issued as one database/API delete statement. All were proven synthetic incident records. **Zero email-log deletes. Zero account, membership, notification, balance, model, prompt, migration, generation or payment-implementation changes.** No automatic retry or additional repair mutation was performed.

The one-off script is `tools/phase8a1/cleanup-orders.mjs`; its approval phrase is specific to this incident and its ID list cannot expand from an environment variable or time filter. A second execution will refuse because all 17 target records must exist and match before any delete.

## POST-CLEANUP READINESS

| Check | Before | After |
| --- | --- | --- |
| Allowlisted incident orders | 17 | 0 |
| Total orders | 501 | 484 |
| Unrelated orders | 484 | 484, every row hash unchanged |
| Target failed-email logs | 4 | 4, retained |
| Total email logs | 70 | 70, every row hash unchanged |
| Generation jobs | 63 | 63, every row hash unchanged |
| Internal credits / reserved | 3047 / 0 | 3047 / 0 |
| V1 prices | 5/5/5 | 5/5/5; complete model-row hashes unchanged |
| Live prompt versions | v1 / v1-canonical-phase4 | Same; complete row hashes unchanged |
| Lifecycle readiness | 2 | 2 |
| Migration 0049 functionality | Operations and Logo content readable | Readable and unchanged |
| V1 pending / stale / settlement-pending | 0 / 0 / 0 | 0 / 0 / 0 |

Credit transactions, related commerce tables, memberships and notifications were also compared by count and per-row hash and remained unchanged. Migration SQL was not run or modified. These are direct read-only checks, not commerce tests against production.

## PHASE 8A FINAL STATUS

**PASS WITH DOCUMENTED INCIDENT.** The owner accepted preservation of the four logs and closed both Phase 8A.1 and Phase 8A on September 18, 2026. Infrastructure preparation remains technically accepted and the order cleanup is complete. The unknown internal pre-state is a documented limitation, not a proposed rollback or independent deployment blocker. All incident reports and evidence are preserved. The recorded credit state remains 3047 credits / 0 reserved; this documentation-only closeout did not query or mutate production or rerun tests.

## RAILWAY VERDICT

**READY FOR AUTHORIZED RAILWAY DEPLOYMENT VERIFICATION.** This is readiness for a separately authorized Phase 8B, not deployment authorization. No Phase 8B work has begun. The four logs and internal account state remain unchanged, and the documented onboarding, MFA/history and external payment requirements still apply to their respective later stages.
