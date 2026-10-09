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

The downloaded invoice is an actual A4 PDF (`application/pdf`, `.pdf` attachment) generated directly in Node with PDFKit and bundled Manrope fonts, from the frozen order amount. Billing values are plain text. It requires ownership and bank-verified payment for RaiAccept; full/partial refund state is labelled. No browser process or outbound requests are needed to render it. Renderer failures return a retryable 503 without changing payments or falling back to HTML. It is not a credit note or settlement report. Use the bank transaction/CSV report and the merchant contract for exact refund totals, fees, chargebacks and settlement reconciliation.

New receipts use the canonical Maro email shell, an amount/credits/order summary, and buttons to view invoices in the authenticated order history and return to Maro. Already frozen Resend requests retain their original payload and idempotency key. Deploying a template change does not resend successful receipts. Invoice downloads for existing paid orders use the new PDF format immediately.

## Launch and rollback

First deploy with `RAIACCEPT_PUBLIC_RELEASE=false` and a named account. Reconcile one authorized real payment across bank → order → successful transaction → ledger → credits/membership → invoice/email. The card and final payment are completed by the human in the bank checkout. The user chose to proceed to controlled live rollout after API Sandbox probes and local tests, without creating separate Sandbox infrastructure.

On 2026-10-09 the owner completed a real EUR 9 / 100-credit top-up using a Kosovo card and explicitly authorized public release. Independent authenticated bank GETs and read-only database checks reconciled order `d7ef8747-7574-48aa-ab10-732719faad14`: bank `PAID`, one successful production purchase, one verified payment, one 100-credit ledger grant, fulfilled checkout, and receipt sent once. The prior canceled order `30dde609-f63b-411e-bac8-8e0ce6fd465f` remains bank `CANCELED` with no successful purchase, verified payment, credit grant, or receipt. This proves the card top-up and cancellation paths; wallet methods, plan purchase/renewal/upgrade and refunds have local/API coverage but have not all been exercised as real customer transactions.

Open the public gate only after the controlled payment reconciles. Monitor paid orders with pending/manual fulfillment, unknown order/session creation, retries, receipt failures and refunds. Record each phase and evidence in the task's PHASE-LOG.

For rollback, set `RAIACCEPT_CHECKOUT_ENABLED=false` and keep provider/recovery enabled for already initiated payments. Keep the schema and ledger. Do not revert to a web version without RaiAccept recovery while payments remain unresolved. If the local poller stops, invoke the protected recovery endpoint with the cron secret from the server environment; never expose it in browser URLs, logs or chat.
