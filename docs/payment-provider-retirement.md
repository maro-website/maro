# Payment provider retirement — 2026-10-16

New purchases, bank verification, receipts and recovery use Raiffeisen/RaiAccept.
The rejected provider's SDKs, routes, webhook, checkout helpers, CSP hosts and
public privacy disclosure have been removed. Stale external enable flags cannot
restore those entry points. Production Railway configuration is cleaned separately.

Migration `0070_retire_unused_provider.sql` removes the unused provider table,
RPCs and nullable metadata columns only after proving that they contain no history.
It preserves all profiles, orders, credit transactions, memberships, bank checkout
records and function permissions. It renames the existing restricted manual-order
accounting helpers; RaiAccept's verified settlement and bank safety guards remain.
Reporting retains the existing production-bank proof and sandbox exclusion.

Previously applied migrations and the archived database lineage remain immutable.
Local PostgreSQL/WASM tests execute that lineage followed by the retirement, and
verify both bank behavior and refusal to remove historical data. No paid bank
transaction or AI request is needed for verification.

Production database: `pbhzobqpavkuttdipjaq`. The old isolated test database
`bpvaatqlbmaokilsyihf` is not the production database. Deleting its Supabase
branch is an independent hosting operation; it does not require changing the
production Supabase URL or Raiffeisen credentials.

Before rollout, the migration was exercised against production in a transaction
that was rolled back. Row fingerprints and function ACLs matched. A baseline
source archive and relevant database catalogs are preserved outside this repository
in `paddle-retirement-20261016`. Restore through a reviewed forward migration or
disable bank checkout temporarily if rollback is necessary; reverting old provider
code alone after retiring its columns is insufficient.
