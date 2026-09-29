# Paddle integration review — 2026-09-29

**Final status: READY FOR PRODUCTION CONFIGURATION.** This is readiness to configure
a separately authorized Live environment, not permission to deploy. No production
access, commit, push or deployment occurred. Worktree: maro-paddle, branch
feat/paddle-gateway; baseline origin/main
`fa8f78bcfa9e3c0728b0100128f067d96ffa81cd`.

## Accepted product decisions

- **30-day recurring billing: ACCEPTED.** Standard EUR9 with 100 credits and Pro
  EUR35 with 500 credits, every 30 days, not calendar months.
- **Paddle as primary/default provider: ACCEPTED.** All public purchases use Paddle.
- **Raiffeisen: disabled legacy/future provider.** Underlying implementation retained.
- **Temporary Paddle customer portal sessions: ACCEPTED.** Bearer-link semantics
  are intentional and are not a production blocker. The former stricter
  non-transferability requirement is superseded by the user's final decision.

## Final architecture and routing

maro checkout -> authenticated Paddle transaction creation -> /pay/paddle ->
official Paddle.js checkout -> verified /api/webhooks/paddle -> atomic paid order,
membership, receipt and credit ledger. Billing, cancellation, invoices and payment
methods use freshly minted Paddle portal sessions. Business remains contact-only.

Provider-less /checkout?item=standard now means Paddle. All pricing/top-up links
also explicitly carry provider=paddle, preserved through sign-in. Unknown/legacy
provider parameters fail closed. The submit handler has no Raiffeisen branch,
selector or fallback. Disabled/unavailable Paddle stops checkout; it cannot enter
the old payment flow. Pricing now sends authentication for top-up eligibility and
sends existing Paddle subscribers to billing management instead of another purchase.

LEGACY_PAYMENTS_ENABLED=false is the intended configuration in both environments.
The legacy create-order/complete-test/cancel-order endpoints and /pay/test and
/pay/redirect return 404 while disabled. The underlying legacy clients, fake-card
component, provider functions and original SQL implementations remain available
for future work. Historical non-Paddle invoices remain ownership checked; Paddle
orders cannot use the legacy invoice generator or legacy fulfillment functions.

Both Paddle enable flags are true in the ignored local Sandbox configuration.
PADDLE_ENVIRONMENT and NEXT_PUBLIC_PADDLE_ENVIRONMENT are sandbox;
LEGACY_PAYMENTS_ENABLED is false. Verified after restarting the correct worktree
on loopback 3006: Paddle unauthenticated checkout returns 401, Sandbox-only Paddle
CSP is present, disabled legacy APIs/pages return 404. Browser verification of a
provider-less top-up checkout shows only “Vazhdo me Paddle (Sandbox)”; all four
top-up purchase buttons are available to the active test subscriber. No additional
payment was submitted during this final audit.

## Commercial configuration

| Item | EUR | Credits | Billing |
| --- | ---: | ---: | --- |
| Standard | 9 | 100 | every 30 days |
| Pro | 35 | 500 | every 30 days |
| topup-100 | 9 | 100 | one-time |
| topup-200 | 17 | 200 | one-time |
| topup-500 | 40 | 500 | one-time |
| topup-1000 | 75 | 1000 | one-time |

All six actual Sandbox price records were reread and verified: active, EUR, internal
tax mode, exact amount, no trial or regional override, and day/frequency 30 for
subscriptions. Pricing, checkout and relevant payment/legal copy now disclose the
same recurring model and Paddle provider.

Server and browser require matching explicit sandbox/production environment
selection. Separate API-key variables and environment-specific token prefixes
prevent silent credential fallback. CSP selects only the configured environment.
Production checkout URLs require a non-local HTTPS address. Live SDK construction
was tested with fixture strings only; no Live network request occurred.

## Payment and webhook evidence

The user completed real Paddle Sandbox Checkout for:
- Transaction: `txn_01m3q3cnpvf02ywhhzvk0a8fbz`, completed.
- Order: `040adbea-c438-46cb-a415-09784aff9d11`, Paddle, paid.
- Subscription: `sub_01m3q3svcmc2z31hvb2ayq0x51`.
- Completed event: `evt_01m3q3swpbfht3qp9jxn6b6771`.
- Delivered notification: `ntf_01m3q3sx54z4sxrm55gbbsww6z`, HTTP 200.

The single receipt and single 100-credit plan_purchase ledger row committed at
2026-09-29T17:36:07.555Z, before Paddle recorded HTTP 200 at 17:36:07.639690Z.
The pre-payment checkpoint had zero credits. The ledger key is
`paddle:txn_01m3q3cnpvf02ywhhzvk0a8fbz`. Final read-only revalidation reconfirmed
completed status, one grant, one receipt and the expected subscription mapping.

Official replay `ntf_01m3q5jrm9ce2yrxp5mbac1sv7` used the same event and left
balances, ledger, orders, memberships and receipt timestamps unchanged.
Browser callbacks only poll order state. Invalid signatures return 400 before
fulfillment; missing server configuration/DB failures remain retryable failures.

All four top-ups passed server-created transaction/catalog ownership checks,
provider-signed payment-failure/completion simulations and duplicate replay:
creation/failure +0; completion +100/+200/+500/+1000; duplicates +0; no membership
change. These were official signed webhook simulations, **not four card payments**.
Their provider transaction records remain draft; do not describe them as completed
Paddle payments. The final test balance is 1900: real Standard 100 plus simulated
top-ups 1800.

Renewal, concurrent delivery, out-of-order cycles, exact period deduplication,
atomic rollback/retry, expiry and paid recovery pass the 29 transactional Paddle
SQL regression cases. These execute actual migrations under PGlite. No second
recurring card charge was made or claimed.

## Lifecycle, portal and isolation

The real Sandbox subscription is active with cancellation scheduled at its paid
period end, 2026-10-29T17:36:05.165236Z. Event
`evt_01m3q5zft9z7rxxggqfypbjb8m`, notification
`ntf_01m3q5zg8nkc5ra5dha0064z2e`, delivered successfully. Credits and access were
preserved; billing shows scheduled cancellation and automatic renewal off.
The eventual date has not arrived; final cancellation/expiry behavior has automated
SQL coverage. Final audit reconfirmed the provider and database scheduled state.

Official failure/recovery simulations synchronized past_due then active while
adding no paid time or credits. They did not perform another real charge.
Refresh, logout and login previously preserved Standard, paid-through and 1900
credits; final browser verification again showed the same balance.

Fresh portal sessions are created server-side from the authenticated user's owned
paid order, not request-supplied customer/user IDs. Responses are no-store. The app
neither persists nor logs portal links and passes them directly to browser navigation,
without analytics calls. Final API verification minted two different sessions,
validated their Sandbox host/expiry/customer subject in memory, and recorded no
URLs or tokens. User B with A's identifiers gets 404; anonymous portal access gets
401. B cannot retrieve A's order/invoice, read/update A's payment/membership rows
through RLS, or call apply_paddle_event. The original RLS/RPC checks and automated
permission tests passed; final API ownership checks passed again.

The standard temporary bearer-link policy is accepted. A copied unexpired URL
carries Paddle's authority; it is not bound to the current maro browser login.
See [Paddle portal documentation](https://developer.paddle.com/build/customers/integrate-customer-portal/).

## Historical defect: first prepared checkout entered Raiffeisen

The first handoff was wrong: /checkout?item=standard defaulted to the existing
provider, and the Paddle selection lived only in React state. A Paddle request
returned 409 before the flow used create-order -> /pay/redirect -> /pay/test.
That old fixed-card UI was not Paddle and never counted as a passed checkout.
The user canceled the legacy order.

Both running Paddle flags were already enabled; evidence did not implicate lost
restart flags or a different worktree. The first correction made provider selection
explicit in the URL and opened the actual owned transaction with Paddle.js. A fresh
tab visibly showed Test Mode, Standard EUR9 every 30 days and an iframe on
sandbox-buy.paddle.com. Paddle rejected an explicit localhost checkout URL override,
so local transaction creation uses the account default payment link. The user then
completed the real Sandbox payment documented above. The final product decision
now makes Paddle the default as well and gates every legacy purchase entry point.

## Verification and hygiene

| Check | Final result |
| --- | --- |
| PostgreSQL authentication | PASS, isolated user-confirmed test project; no secrets printed |
| Full automated suite | PASS — 674 tests across 63 files |
| Real Supabase commerce smoke tests | PASS — all 10, included in full run |
| Transactional Paddle migration tests | PASS — 29, included in full run |
| Typecheck | PASS — tsc --noEmit |
| Lint | PASS — existing cards.tsx:491 hook-dependency warning only |
| Production build | PASS — local Next build, 90 static pages; Sandbox/test config |
| git diff --check / frozen offline lockfile check | PASS |
| Secret scan and ignore checks | PASS; configured private values absent from proposed files |
| Index / commit / push / deploy | Index empty; none performed |

The two formerly failing commerce credit tests omitted generation_jobs rows now
required by the supplied test DB's newer reserve/release routines. A rollback-only
comparison against actual origin/main 0011/0027 bodies reproduced the contract
difference: old routines allowed absent job IDs, current test routines rejected
them; both succeeded with real pending jobs. Only the two test fixtures changed.
Paddle migration 0047 does not modify credit reserve/release logic. Original legacy
fulfillment/cancel routine body hashes matched origin/main; regression tests retain
their behavior behind the disabled entry points.

All original **71 files** were individually audited, with 12 additional files
needed for the final decisions. See [complete file classification](paddle-file-audit.md).
The proposed commit is **48 files: 35 production, 7 regression tests, 3 documentation,
3 reusable development tools**. Twenty-three temporary prior files were removed;
12 local assistant files are ignored/excluded. No unrelated files were found.

Generated E2E credentials, screenshots, simulator payloads, diagnostic scripts,
logs (including 17 root diagnostic/review logs), tunnel binary and the old review
patch were removed. The now-unused diagnostic-only postgres dependency was removed
from both manifests; frozen offline lockfile verification passed. User-provided .env.local
is retained and ignored. Temporary dev/proxy/tunnel processes were stopped; the
temporary Sandbox notification destination was disabled. Provider/database test
records are retained as audit evidence, with no files containing their login
credentials shipped. No valuable automated Paddle tests were removed.

## Remaining configuration work and bounded risks

1. Live credentials/token, six Live catalog entries, an approved HTTPS checkout
   domain, separate production DB configuration, migration rehearsal and a durable
   webhook destination still require explicitly authorized production configuration.
   Nothing was copied from or applied to production.
2. Reconcile the test DB's newer reserve/release migration provenance before a
   production rollout; the fixture fix does not establish production schema parity.
3. Keep discounts, trials, regional overrides and self-service plan changes disabled.
   Proration/discounted transactions are deliberately unsupported. Refund/chargeback
   credit clawback and commercial support handling require an operational policy.
4. Evidence distinguishes the real Standard card payment from signed top-up and
   failure simulations. There was no actual second renewal charge or Pro card
   checkout in this audit. Lint retains its pre-existing unrelated warning.
5. Temporary portal bearer links are an accepted policy, not an unresolved blocker.
   Thirty-day billing and primary Paddle routing are also resolved.

The current implementation is ready for production configuration under these
documented v1 boundaries. See [configuration/runbook](paddle-testing.md).
