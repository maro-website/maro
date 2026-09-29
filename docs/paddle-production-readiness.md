# Paddle production readiness

Phase 1 evidence captured on 2026-09-29. This document contains no credentials
and authorizes no production write, deployment, Live transaction, or public
checkout exposure.

## Fixed launch behavior

- Paddle is the primary and default provider. The checkout router accepts only
  `paddle`; provider-less links resolve to Paddle.
- Raiffeisen remains disabled legacy code with `LEGACY_PAYMENTS_ENABLED=false`.
  There is no Paddle-to-Raiffeisen fallback.
- Standard is EUR 9, 100 credits, every 30 days. Pro is EUR 35, 500 credits,
  every 30 days.
- Top-ups are 100/EUR 9, 200/EUR 17, 500/EUR 40, and 1000/EUR 75.
- Trials, discounts, regional prices, alternative currencies, annual plans,
  proration, plan changes, and automatic refund/chargeback credit clawback are
  outside v1.

## Paddle Live audit and write plan

The Live account is authenticated and uses the separate Paddle Live tenant. At
the Phase 1 approval gate, its state was:

- onboarding: 0/3, account setup and verification not started;
- catalog: no active Live products or prices;
- credentials: no Live API key and no Live client-side token;
- website approval: no submitted or approved domain;
- default payment link: blank;
- notification destinations: none;
- tax category: SaaS approved;
- checkout setting for discount-code entry: currently enabled and must be
  disabled before launch because discounted transactions are unsupported.

No Sandbox identifier may be copied into this tenant. After production-write
approval, create the following Live catalog with tax mode `internal`, currency
`EUR`, no trials, no discounts, and no price overrides:

| Product | Unit amount | Credits | Billing cycle |
| --- | ---: | ---: | --- |
| Standard | 900 | 100 | `day`, frequency `30` |
| Pro | 3500 | 500 | `day`, frequency `30` |
| Top-up 100 | 900 | 100 | one-time |
| Top-up 200 | 1700 | 200 | one-time |
| Top-up 500 | 4000 | 500 | one-time |
| Top-up 1000 | 7500 | 1000 | one-time |

The six returned Live price IDs must be recorded only in the production secret
store. Submit `maro.al` for website approval and set the approved default payment
link to `https://maro.al/pay/paddle`. Paddle documents that Live entities and
credentials are separate from Sandbox and that a valid approved default payment
link is required before Live transaction creation:

- <https://developer.paddle.com/build/go-live-checklist/>
- <https://developer.paddle.com/build/transactions/default-payment-link/>
- <https://developer.paddle.com/paddle-js/about/client-side-tokens/>

After the backend is deployed with public checkout still off, create the durable
Live destination `https://maro.al/api/webhooks/paddle` and subscribe only to:

- `transaction.completed`
- `subscription.created`
- `subscription.updated`
- `subscription.activated`
- `subscription.canceled`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`

Keep the destination inactive until its Live signing secret is installed and the
deployed endpoint has passed signature and retry checks. Paddle delivery is
at-least-once, so database receipt and paid-cycle idempotency remain mandatory:
<https://developer.paddle.com/webhooks/about/how-webhooks-work/>.

## Production database read-only audit

Project `pbhzobqpavkuttdipjaq` is healthy in North EU (Stockholm), running
PostgreSQL 17.6. Only metadata, routine definitions, catalog rows, and aggregate
counts were read. No user row, email, identifier, balance, payment payload, or
secret was selected.

The migration ledger contains one consolidated entry:

- version `20260929150544`, name `remote_schema`, 1024 statements;
- it contains the deployed `reserve_credits` and `release_credit_reserve`
  definitions and the later `v1_durable` generation changes;
- it does not preserve the repository's individual `0001` through `0046`
  version history.

The production schema contains the migration 0046 OAuth hook. Its complete
function-definition hash matches `origin/main`. The payment-critical tables,
columns, constraints, indexes, RLS flags, policy names, and service-only RPC
grants required by migrations 0037, 0038, 0040, and 0046 are present. Current
aggregate counts were 11 profiles, 1 membership, 484 credit orders, 184 credit
transactions, 88 generation jobs, 3 plans, and 4 top-ups.

Migration 0047 has not been applied to production: its 14 Paddle columns,
`paddle_webhook_events`, `paddle_paid_cycle_once`, `create_paddle_order`, and
`apply_paddle_event` are all absent.

The canonical production catalog matches the intended amounts, credits, EUR
currency, 30-day plan durations, and active-plan requirement for top-ups.

### Reserve/release provenance

| Routine | Production and test hash | `origin/main` migration hash |
| --- | --- | --- |
| `reserve_credits` | `76643913c8b8c6feb591576c5a026b94` | `1b40868bf4010b5f1eb51d010d455d96` |
| `release_credit_reserve` | `d8f5c39d76f0a5916022f05ba53486c0` | `a8844179733d711d5c68bd0dbc017082` |

Production and the isolated `paddle-sandbox` preview project have identical
routine hashes and the same `remote_schema` migration snapshot. The preview was
created from the production schema, which explains why its behavior is newer
than repository migrations 0011 and 0027. The newer routines require a matching
generation job, validate durable request credit cost, coordinate reservation and
release with the generation state machine, and avoid releasing a persisted or
charged result.

The change is represented in the consolidated Supabase snapshot, but no numbered
repository migration records when the routines first changed. This is migration
history drift, not unexplained current-schema drift. Do not replay migrations 0011
or 0027 against production because doing so would overwrite the newer behavior.

Production's pre-0047 `fulfill_commerce_order` and `cancel_credit_order` complete
definition hashes match the repository migrations exactly:

- `fulfill_commerce_order`: `e85309136acb48eaab6196da2bcb9190`
- `cancel_credit_order`: `902f086152c19b0bdc71cdcd889b2faa`

Migration 0047 does not reference reserve/release. It renames the exact audited
legacy fulfillment and cancellation routines and installs service-only guarded
wrappers. This preserves Raiffeisen behavior behind disabled entry points while
preventing browser/manual fulfillment or cancellation of Paddle orders.

## Migration rehearsal and rollback

Run:

```text
node tools/paddle/rehearse-production-migration.mjs
```

The rehearsal builds an in-memory PostgreSQL-compatible database from the actual
commerce migrations, installs the audited production-equivalent reserve/release
logic, adds representative pre-existing membership and legacy order data,
and applies the actual `0047_paddle_billing.sql` inside a transaction. It verifies:

- all expected columns, table, RLS, indexes, and RPCs appear;
- reserve/release body hashes do not change;
- legacy fulfillment/cancellation bodies move unchanged behind the wrappers;
- a legacy order still fulfills/cancels and a Paddle order cannot use legacy
  fulfillment;
- rollback removes every Paddle artifact, restores the original routine names,
  and restores representative rows and credits.

Result on 2026-09-29: **apply PASS, rollback PASS**. The committed migration also
retains its 29 transactional PGlite tests from the tested Paddle baseline.

## Production migration procedure

Because the remote migration ledger contains a consolidated snapshot rather than
the repository's numbered history, do not run an unreviewed `supabase db push`.
It could try to replay older migrations. Apply only the exact reviewed contents
of `supabase/migrations/0047_paddle_billing.sql` in one transaction, then record
one deployment-history entry for `0047_paddle_billing` using the deployment
procedure selected at write time. Immediately compare the post-migration catalog
to the expected columns, indexes, constraints, RLS, policies, ACLs, and routine
hashes. Confirm all pre-existing aggregate counts and credit sums are unchanged.

## Backup and recovery

Supabase scheduled physical backups are active. The latest audited backup was
`2026-09-29 02:33:42 UTC`; seven prior daily backups were also listed. Point-in-time
recovery is not enabled.

Immediately before migration 0047:

1. Keep `NEXT_PUBLIC_PADDLE_ENABLED=false`, keep Live notifications inactive, and
   confirm no Live transaction can be created.
2. Verify a completed scheduled physical backup in the Supabase dashboard. If it
   is older than the accepted recovery point, wait for the next completed backup
   or create a logical backup before proceeding.
3. Create an encrypted logical backup using a secret production connection URI
   supplied only to the local process. With the official Supabase/PostgreSQL tools:

   ```text
   supabase db dump --db-url <secret-uri> --role-only --file roles.sql
   supabase db dump --db-url <secret-uri> --file schema.sql
   supabase db dump --db-url <secret-uri> --data-only --use-copy --file data.sql -x "storage.buckets_vectors" -x "storage.vector_indexes"
   ```

4. Record file sizes and SHA-256 hashes without printing the URI. Parse the dumps
   and restore them into an isolated database, then compare schema inventory,
   aggregate row counts, aggregate credit sums, and the audited routine hashes.
5. Apply 0047 only after both the physical-backup check and logical-restore check
   pass.

Supabase documents that restores incur downtime and that database backups exclude
Storage objects. No Paddle migration touches Storage:

- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/troubleshooting/download-logical-backups>

If migration verification fails before Live traffic, leave checkout and webhook
delivery off and restore the verified backup (or revert the still-open transaction).
After any real Paddle subscription exists, do not simply remove 0047. Paddle will
continue to own external subscription state and retry events. Disable new checkout
and the Live destination, preserve receipt/idempotency tables, restore or forward-
fix the database, then replay/reconcile provider events before re-enabling delivery.

## Production environment map

No value below belongs in Git or logs.

| Variable | Visibility/category | Required production state |
| --- | --- | --- |
| `PADDLE_ENABLED` | server-only; provider control | `true` for deployed backend/webhook |
| `NEXT_PUBLIC_PADDLE_ENABLED` | browser/public; provider control | `false` for initial deploy; `true` only for controlled purchase/public launch |
| `PADDLE_ENVIRONMENT` | server-only; Paddle Live | `production` |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | browser/public; Paddle Live | `production`; must match server |
| `PADDLE_LIVE_API_KEY` | server-only secret; Paddle Live | Live `pdl_live_...` key |
| `PADDLE_SANDBOX_API_KEY` | server-only secret; Sandbox | absent from production |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | browser/public; Paddle Live | Live `live_...` client token |
| `PADDLE_WEBHOOK_SECRET` | server-only secret; Paddle Live | secret for the Live destination only |
| `PADDLE_CHECKOUT_URL` | server-only; Paddle Live | `https://maro.al/pay/paddle` |
| `PADDLE_PRICE_STANDARD` | server-only; Paddle Live | Live Standard price ID |
| `PADDLE_PRICE_PRO` | server-only; Paddle Live | Live Pro price ID |
| `PADDLE_PRICE_TOPUP_100` | server-only; Paddle Live | Live 100-credit price ID |
| `PADDLE_PRICE_TOPUP_200` | server-only; Paddle Live | Live 200-credit price ID |
| `PADDLE_PRICE_TOPUP_500` | server-only; Paddle Live | Live 500-credit price ID |
| `PADDLE_PRICE_TOPUP_1000` | server-only; Paddle Live | Live 1000-credit price ID |
| `LEGACY_PAYMENTS_ENABLED` | server-only; provider control | `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | browser/public; database | production project HTTPS URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser/public; database | production publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only secret; database | production service-role key |
| production database URI | migration tool only; database | ephemeral local process input; never an app variable |

The code selects exactly one key from the explicit environment, validates API-key
and client-token prefixes, requires server/public environments to match, and
requires a non-local HTTPS checkout URL in production. CSP adds only Live Paddle
hosts when the public environment is `production`; Sandbox hostnames are selected
only for an explicit `sandbox` environment. No runtime provider variable can select
Raiffeisen, and unknown provider values fail closed.

## Production-write sequence after approval

1. Verify and restore-test the backup.
2. Apply only migration 0047 and verify schema/data invariants.
3. Create the Live key, client token, six products/prices, submit/approve `maro.al`,
   set the default payment link, disable discount-code entry, and install the
   production secrets with public checkout off.
4. Deploy backend/configuration with `NEXT_PUBLIC_PADDLE_ENABLED=false` and
   `LEGACY_PAYMENTS_ENABLED=false`.
5. Create/configure the Live webhook destination, install its signing secret,
   deploy that secret, and validate HTTPS/signature/retry behavior.
6. Recheck app health, login, dashboards, aggregate credit/membership integrity,
   Live-only configuration, disabled legacy routes, and absence of client secrets.
7. Stop before any charge and request the controlled real EUR 9 purchase.

## Phase 2 execution record

Production write was explicitly approved on 2026-09-29. The following actions
were completed without exposing credentials or enabling public checkout:

- The latest scheduled Supabase physical backup was confirmed and a fresh
  encrypted logical backup was restored into an isolated PostgreSQL 17.6
  instance. Schema inventory, ACLs, RLS, policies, routines, constraints,
  indexes, row aggregates, and credit totals matched the source.
- Only the reviewed `0047_paddle_billing.sql` migration was applied. Its source
  SHA-256 was `28407e9d82fb3ce10d30a7ee11df87195fe42cfea36650a1f09e6dda346ca707`.
  The production ledger records `0047_paddle_billing`, and post-migration checks
  confirmed all expected Paddle objects with no unrelated data or routine drift.
- The Live catalog was created with Standard and Pro recurring every 30 days and
  the four approved one-time top-ups, all EUR-only, tax-inclusive, and without
  trials, discounts, or regional overrides.
- A rotatable least-privilege Live server API key and a Live Paddle.js token were
  created. Their values exist only in the production deployment secret store.
- `maro.al` was submitted for Paddle website approval and is currently Pending.
- The default payment link is `https://maro.al/pay/paddle`, and checkout discount
  code entry is disabled.
- Railway service `maro` received the production Paddle environment map with
  `PADDLE_ENABLED=true`, `NEXT_PUBLIC_PADDLE_ENABLED=false`, production selected
  on both server and browser, all six Live price IDs, and
  `LEGACY_PAYMENTS_ENABLED=false`. No Sandbox Paddle API key is present.

The code deployment, durable Live webhook destination, post-deploy validation,
and controlled real EUR 9 purchase remain later steps in this execution record.
