# Manual privacy requests for Maro V1

Use the existing support inbox, admin MFA, Supabase dashboard and storage controls. No new service, customer-facing feature or subscription is needed. This document prepares the workflow; no customer's account has been exported, closed or deleted during this release work.

## Intake and identity

1. Record the request and its date in the existing support ticket. Distinguish access/export, closing access and deletion. Record the verified user UUID, scope and assigned operator.
2. Verify control of the account through its current authenticated session or its already verified email. Do not accept a guessed address or a forwarded message as proof. Never ask for the password, MFA code or card details.
3. Check for another person's data, an active dispute, unsettled generation reservations, pending RaiAccept orders or a historical recurring subscription. Finish/reconcile pending financial work before irreversible cleanup. Obtain the owner's/accountant's applicable retention decision for financial records; this runbook does not invent a retention period.

## Export

Run [privacy-export.sql](privacy-export.sql) in the restricted Supabase SQL editor after replacing its single placeholder with the verified UUID. It uses a read-only transaction and refuses an unknown account. Its customer projection includes account, workspaces/Brain, creations, job/credit history and customer-visible support messages. It filters every section to that account and excludes internal prompts, payment-provider responses, internal support notes and operational metadata.

Inspect other account-related tables using the schema inventory before completing the response: credit orders, RaiAccept checkout/order links, memberships, refunds, creator commissions and follows, notification preferences/dismissals, contest/challenge submissions, prompts/likes/reveals, email recipient logs and outbox, signup/security/abuse records, product/prompt/promo events, reports, pricing snapshots and workspace sources. Match by the recorded UUID, its original verified email, owned workspace IDs and the order/ticket/creation IDs, as appropriate. The core export deliberately is not an automatic dump of every internal field. Review additional personal data for disclosure and redact other people's information and security-sensitive material.

Retrieve that user's private generation/reference assets through the existing authenticated download or Supabase storage dashboard, including published copies in `maro-public`. Check ownership and references; folder-prefix guesses alone are insufficient for shared/admin assets. Include a list of unavailable/expired outputs when an original asset no longer exists. Do not send a service key or an internal compiled prompt.

Keep the export outside the repository, public storage and ordinary build/log folders. Deliver only to the verified account through an agreed private channel. Record what was delivered and remove the working export after the request has been completed according to the agreed support policy. Never attach the raw internal-review export to marketing or a public ticket.

## Closing access and deleting content

1. After explicit account-holder confirmation, disable the verified user's sign-in through Supabase Auth's existing ban control and revoke their active sessions. Revoke that user's MCP/OAuth grants through the existing controls. Pause their generation access. Verify with an already signed-in session that authenticated API access is rejected.
2. Complete any user-authorized historical subscription cancellation using the existing payment administration. RaiAccept V1 plans renew manually. Preserve pending-payment reconciliation and the evidence required for an existing refund/dispute.
3. Snapshot counts/IDs for the requested user, financial records and another synthetic/control account. Back up before significant cleanup using the owner's existing backup process.
4. Remove the user's public creations first, then their exclusively owned private outputs/references, workspace sources/Brain and requested creative records. Identify relationships from the captured schema before executing a deletion. Redact redundant personal prompt/debug payloads only after accounting/settlement has completed. Keep the minimum required transaction, job settlement, order, membership, receipt, refund and audit evidence under the retention decision. Restrict access to that evidence.
5. Minimize the remaining public profile (name/avatar/username) and unneeded personal copies in email/support/operational records. Keep retained financial contact/invoice facts only when the recorded retention decision requires them. A disabled account is not a completed deletion request: record any retained data, reason and planned review date.
6. Verify the published URL is unavailable, storage objects are removed, another user's content still works, ledger totals and settled payments are unchanged, and access remains disabled. Record exact affected counts and completion date, and reply to the verified requester with the completed scope and retained-data explanation.

Do not hard-delete `auth.users` as a shortcut. The actual schema has `ON DELETE CASCADE` from Auth users to `credit_transactions`, `generation_jobs` and `memberships`, and a restrictive foreign key from `raiaccept_checkouts`. Blind deletion can erase accounting evidence or fail partway through a manually assembled cleanup. Prepare a reviewed, account-specific transaction after the retention decision; do not reset the database or execute global cleanup for one person's request.

## Practice and release evidence

The core read-only export is exercised with two synthetic accounts against the captured public table shapes. Tests verify that only the selected account is included and internal prompts/notes stay out. Closure/deletion of a real customer, final inbox delivery and the legally appropriate retention decision require an actual request and operator review; they are not claimed as performed. For a practice closure, use a clearly identified disposable account in the existing test project, reconcile its work first, then verify the access/storage/financial/control-account checks above. Do not repeat earlier live tests that triggered broad renewal reminders.

Launch interest/notification consent remains scoped to that purpose. Do not reuse it as unlimited marketing consent. The existing legal contact and support ticket flow remain the V1 request channel.
