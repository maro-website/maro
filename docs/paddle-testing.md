# Paddle configuration and regression runbook

Paddle is maro v1's only public payment provider. Standard is EUR9/100 credits
every 30 days; Pro is EUR35/500 credits every 30 days. Top-ups are one-time:
100/EUR9, 200/EUR17, 500/EUR40 and 1000/EUR75. Never convert the cadence to a
calendar month. Business remains contact-only.

## Environment configuration

Copy `.env.example` into ignored local configuration. Use a dedicated test
Supabase project, never production, for local tests. `vitest.setup.ts` loads
`.env.local`; the commerce smoke suite creates and removes disposable users in
the configured project. Check the target before running it.

| Setting | Sandbox | Future production configuration |
| --- | --- | --- |
| PADDLE_ENABLED / NEXT_PUBLIC_PADDLE_ENABLED | both true after setup | both true after setup |
| PADDLE_ENVIRONMENT / NEXT_PUBLIC_PADDLE_ENVIRONMENT | both sandbox | both production |
| Server API key | PADDLE_SANDBOX_API_KEY, pdl_sdbx_ prefix | PADDLE_LIVE_API_KEY, pdl_live_ prefix |
| NEXT_PUBLIC_PADDLE_CLIENT_TOKEN | test_ prefix | live_ prefix |
| PADDLE_WEBHOOK_SECRET | Sandbox destination secret | Live destination secret |
| Six PADDLE_PRICE_* settings | Sandbox IDs | Separately created Live IDs |
| PADDLE_CHECKOUT_URL | configured HTTPS payment link | approved public HTTPS /pay/paddle URL |
| LEGACY_PAYMENTS_ENABLED | false | false |

The example keeps enable flags false until credentials/catalog are configured.
Disabled or misconfigured Paddle fails closed; it never selects Raiffeisen.
`NEXT_PUBLIC_*` configuration is compiled into the browser bundle: restart dev or
rebuild when changing it. The server rejects mismatched environment names or API
key prefixes; the browser rejects a token for the wrong environment. SDK lookups
and exact price/currency/tax/cadence checks reject an incorrect catalog. Prefixes
cannot identify the environment of webhook secrets or price IDs; provision them
from the correct account. Use separate application databases for each environment.

The legacy flag only gates preserved historical endpoints and pages. Enabling it
does not add a public provider selector. `PAYMENT_MODE` applies only to the legacy
implementation. It has no effect on Paddle routing or environment selection.

## Development tools

```powershell
node tools/paddle/test-environment.mjs
node tools/paddle/check-sandbox.mjs
node tools/paddle/seed-sandbox.mjs
```

The first checks credential/project mapping without printing values. The second
reads all six configured Sandbox prices. The third is a dry run. Only an explicit
`--apply` provisions missing Sandbox catalog entries, saves configuration locally,
writes an ignored `.paddle-e2e/catalog.json`, and leaves checkout disabled. The
seed uses Paddle's Sandbox MCP. Local assistant MCP configuration/skills are
ignored, optional development aids and are not application deliverables.

The prior temporary notification destination is disabled and tunnel removed.
For another real webhook E2E test, create a fresh webhook-only HTTPS tunnel and
Sandbox destination for POST `/api/webhooks/paddle`. Configure its signing secret
locally and subscribe to transaction.completed and the subscription lifecycle
events handled in `webhooks.ts`. Warm the local Next route before testing; a dev
cold start previously exceeded the disposable proxy's timeout. Do not expose the
whole development app unnecessarily. Disable the destination when done.

## Checkout and fulfillment

`/checkout?item=standard` defaults to Paddle. Public links explicitly include
`provider=paddle`; unknown/legacy provider values are rejected. Authentication
redirects preserve item/provider. The only submit endpoint is
`/api/payments/paddle/checkout`, followed by `/pay/paddle?order=<owned-order-id>`.
The server creates/binds the transaction before Paddle.js opens it. For localhost
Sandbox, transaction creation uses the account's default payment link because
Paddle rejected an explicit localhost override. The app opens the transaction via
its authenticated order route. Configure the approved HTTPS URL for Live.

Only a verified raw-body Paddle webhook may fulfill payment. Browser success,
polling, subscription lifecycle updates, transaction.paid and payment failures
grant no credits. Completion/renewal inserts receipt, paid order, membership and
credit ledger atomically, with event/transaction/period deduplication.

The customer portal endpoint derives the customer from the authenticated user's
paid Paddle order and ignores request-supplied ownership IDs. It creates a new
session on each request and returns Cache-Control: no-store. Do not persist,
cache, log or send portal URLs to analytics. Temporary bearer links are the
accepted product policy; possession of a copied unexpired link carries Paddle's
portal authority. User B cannot mint A's session through maro.

Keep discounts, trials, regional price overrides and self-service plan switching
disabled for v1. Partial/prorated transactions are rejected by fulfillment; do not
enable such commercial features without implementing and testing their semantics.
Refunds/chargebacks require an operational policy; automated credit clawback is
outside this integration. Historical non-Paddle invoice access remains ownership
checked; new purchases and billing management use Paddle.

## Automated verification

```powershell
pnpm test
pnpm exec vitest run src/lib/__tests__/commerce-smoke.integration.test.ts
pnpm exec tsc --noEmit
pnpm lint
pnpm build
git diff --check
```

The full suite includes the ten real Supabase smoke tests when test credentials
are configured and the 29 PGlite tests executing actual SQL migrations. The latter
cover renewal, concurrency/replay, failure/recovery, cancellation, expiry, rollback,
top-ups, RPC permissions and preserved legacy SQL. They complement the actual paid
Sandbox transaction and signed simulation evidence in `paddle-review.md`.

Before production configuration, reconcile migration history (including the newer
test DB reserve/release routines), rehearse 0047 on a representative isolated clone,
configure Live credentials/catalog/domain and a durable webhook destination, then
run separately authorized release verification. No production changes are implied
by this runbook.
