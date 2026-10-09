# V1 database history and release boundary

The production migration ledger and the checkout's old sequential filenames describe different histories. Do not run `supabase db reset`, replay 0001–0056, run an unrestricted migration push, or mark historical versions as applied based on their filenames. Existing Paddle/MCP privacy/OAuth/payment state must survive.

`docs/evidence/schema-baseline-20261009.json` captures actual public table shapes, constraints, indexes, RLS, policies, function definitions/permissions, triggers and the production migration ledger through an explicitly read-only transaction. It contains no customer rows or credential values. Storage bucket settings/shapes are included as operational evidence; Supabase-managed Auth/storage objects and their data remain provider-managed.

`v1-baseline-20261009.sql` reconstructs the captured **public schema only**, including the existing pg_trgm extension, on an empty Supabase scratch project with managed schemas already present. It refuses a project with `public.profiles`. It is outside the migration directory and must never be applied over production. Local tests reconstruct 73 tables, 96 functions and seven public triggers, and compare all function bodies and anonymous/authenticated execution privileges. This establishes a reproducible application-schema boundary; it is not a backup of user/Auth/storage data or all managed project configuration.

Generate/check the baseline with `node tools/security/build-schema-baseline.mjs [--check]`. Before a separately authorized production activation, run the restricted local `v1-launch-20261009/capture-schema.py` without `--capture`: it compares the live schema to this pre-release snapshot and exits nonzero on drift. Review drift before applying staged SQL; never refresh the reference to silently approve an unexplained change.

Only the following new migrations belong to this release, in this order:

1. `0057_v1_security_boundaries.sql`: settings/client mutation/MFA boundaries, profile protections, owned workspace-limit RPC and existing bucket limits.
2. `0058_atomic_generation_accounting.sql`: atomic V1 admission using existing concurrency/spend limits and fallback cost estimates, idempotent auxiliary spend/cost recording and aggregate budget totals including in-flight exposure. Historical completed jobs get a legacy marker to avoid recounting existing rollups; financial settlement/ledger history is not rewritten. Estimates reserve exposure; they are not a guarantee about the provider's final invoice.
3. `0059_v1_debug_retention.sql`: bounded debug-prompt cleanup, keeping job/payment/credit evidence. Existing retention periods remain authoritative.

The matching application and these functions form one release. Use a short planned activation window with the existing AI pause setting, preserve the existing payment recovery worker, take the owner's pre-change backup, apply only these reviewed scripts, deploy the validated checkout, verify the role matrix and maintenance, then restore the previous AI pause state. The old admin/workspace client can lose direct-write access after 0057, so do not leave old application code running indefinitely with only part of the release activated. Do not reopen checkouts while payment recovery is unavailable.

Record the actual applied versions/checksums and matching application commit through the established Supabase migration tooling after successful activation. No ledger entry is claimed or synthesized in this task. Take the owner's post-change backup. If activation fails, keep generation paused and payment recovery operating while inspecting the specific failure. Do not restore insecure settings grants as a generic rollback or destroy financial records to recover.

Actual production application, SQL and migration-ledger changes remain unperformed under the user's no-deploy instruction.
