# RaiAccept operations

Built from the verified live commit `9b97e5e63095a212934734c022021f2846dc9cb3`. Implemented migrations: 0054, 0055, 0056 only. The unrelated OAuth migration 0053 must not be applied as part of payments.

New purchases require `RAIACCEPT_ENABLED`, `RAIACCEPT_RECOVERY_ENABLED`, `RAIACCEPT_CHECKOUT_ENABLED`, a configured `CRON_SECRET`, and either an allowlisted account in `RAIACCEPT_CHECKOUT_USER_IDS` or `RAIACCEPT_PUBLIC_RELEASE=true`. Production is bound to `https://maro.al` and Supabase project `pbhzobqpavkuttdipjaq`. Sandbox cannot connect to that database or origin.

The checkout freezes price, credits, plan duration, billing, current membership and renewal cycle before contacting the bank. API POSTs are never retried automatically after an uncertain result. Reuse the original order/request key; do not create a replacement payment while the result is unknown. Provider prefixes do not determine the environment: the authenticated Boolean `isProduction` must match.

Notifications at `/api/payments/raiaccept/webhook` only enqueue known references. The inbox is committed before ACK. No documented HMAC is assumed. Authenticated order/transaction detail reads determine the financial result. The final order is read again after details. Financial verification and fulfillment are separate: a paid order can require manual review without losing the payment record.

`pnpm start` runs the web app and a sequential local poller in the same container. It calls authenticated `POST /api/cron/raiaccept-reconcile` every two minutes. PostgreSQL leases protect deploy overlap and replicas. It does not change the separate AI reconciliation service. The owner can also request verification of their specific order from the return page. Bank reads and SQL application are awaited.

Credits, membership, ledger entry and receipt job are committed atomically. The receipt freezes its exact Resend request before sending and uses one key per order. Automatic retries stop after ten attempts or before 23 hours from the first attempt, because [Resend retains idempotency keys for 24 hours](https://resend.com/changelog/idempotency-keys). Review delayed/ambiguous deliveries in the receipt jobs and provider dashboard before resending. Email failure does not undo financial fulfillment.

## Refund and manual review

Identify the Maro order, bank order and transaction in Commerce → Orders. Reconcile merchant/environment/reference, original EUR amount, successful purchase, ledger, plan and current credit balance against the RaiAccept portal. Review duplicate successful purchases, changed/expired memberships, overflow, missing identity and bank state regressions. Never force an ordinary fulfillment RPC or change an order to pending to retry a paid grant.

Perform monetary refunds through the RaiAccept portal with an authorized operator. Choose the original successful purchase and the allowed remaining amount. Record the exact refund amount/ID, timestamp and reason in the incident record; retain the portal evidence. Verify the result through the gateway API and Maro's payment state. The integration detects full/partial refund states and marks them for review. It does not automatically subtract spent credits, cancel membership time or refund AI-generation credits. Resolve these business effects explicitly and record the decision before any audited adjustment.

The downloaded HTML invoice uses the frozen order amount and escapes billing values. It requires ownership and bank-verified payment for RaiAccept; full/partial refund state is labelled. It is not a credit note or settlement report. Use the bank transaction/CSV report and the merchant contract for exact refund totals, fees, chargebacks and settlement reconciliation.

## Launch and rollback

First deploy with `RAIACCEPT_PUBLIC_RELEASE=false` and a named account. Reconcile one authorized real payment across bank → order → successful transaction → ledger → credits/membership → invoice/email. The card and final payment are completed by the human in the bank checkout. The user chose to proceed to controlled live rollout after API Sandbox probes and local tests, without creating separate Sandbox infrastructure. Complete bank-required checks and verify any wallet exposed to customers before public release.

Open the public gate only after the controlled payment reconciles. Monitor paid orders with pending/manual fulfillment, unknown order/session creation, retries, receipt failures and refunds. Record each phase and evidence in the task's PHASE-LOG.

For rollback, set `RAIACCEPT_CHECKOUT_ENABLED=false` and keep provider/recovery enabled for already initiated payments. Keep the schema and ledger. Do not revert to a web version without RaiAccept recovery while payments remain unresolved. If the local poller stops, invoke the protected recovery endpoint with the cron secret from the server environment; never expose it in browser URLs, logs or chat.
