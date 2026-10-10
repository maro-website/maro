# Maro product and admin refinement — 10 October 2026

Baseline: `c6c25ad8462ad175683a4bf52c0e050589ac025b`. The starting checkout is clean. Use only the existing Maro visual system, services and dependencies. Preserve V1 availability and do not run paid generations or modify real customer accounts during verification.

## Requested scope and acceptance

- [x] Selecting a preset supplies a usable `maro` prompt when no explicit prompt exists. Starting a new chat preserves the selected preset and its draft prompt.
- [x] Explore Remix copies only a public prompt; a preview with a private/missing prompt becomes an image reference with `maro`, without exposing the private prompt.
- [x] Hub and desktop image carousel show the existing three guest presets plus two obscured placeholders with sign-in/sign-up actions. Hidden catalog data must not be fetched for guests.
- [x] Manual plan changes and credit adjustments create durable, deduplicated notifications in the user's existing notification bell.
- [x] Rate-limit responses expose their retry time, and the UI shows a persistent countdown; unavailable provider expiry is identified honestly.
- [x] Fix color editing/focus/validation and improve the existing logo wizard's hierarchy and reference upload zone without changing its layout or palette.
- [x] Upcoming tools retain their navigation destinations with a subdued unavailable treatment; module icons retain existing product colors and text follows the theme.
- [x] User management supports MFA-confirmed deletion and changing an existing plan, with a required private reason for plan changes. Protect privileged/self accounts and preserve financial/audit history.
- [x] Admin can change/reset each user's storage allowance; existing server and database quota enforcement must consume that allowance.
- [x] Admin uses the full product navigation, role beside credits and a wider workspace; remove the redundant back-to-Maro header and organize existing navigation/actions.
- [x] Correct revenue calculations by currency, real payment source and settled status. Clearly distinguish receipts from credits, grants and estimates; reuse the same figures across admin.
- [x] Improve existing overview, analytics and users screens with readable headings, actual buttons, lightweight charts, clear loading/error/empty states and reduced-motion support.

## Validation and release

- [x] Meaningful regression tests for preset/remix transfer, MFA authorization, plan/notification idempotency, storage boundaries and revenue accounting.
- [x] Typecheck, lint, tests, UI/token/contrast checks and production build.
- [x] Browser review of core changed flows in Qelt/Mshelt and desktop/mobile; no test sends to real users.
- [x] Review final diff and migration effects before any live release. Previously authorized production release requires the existing private backup and post-release checks; no actual user deletion during tests.

## Findings before implementation

The new-chat handler creates an empty draft. Explore only transfers a prompt and suppresses Remix when it is private. Color editor keys include the editable hex value, remounting the input. Analytics label every paid `amount_cents` sum as EUR without filtering currency/provider. Existing manual grants refuse an active membership, so changing a plan requires an atomic audited replacement rather than merely changing the modal.

## Implementation and evidence

The product changes use the existing Maro components, tokens, colors, browser draft store, private reference upload flow and notification bell. Charts use small SVGs and the current dependencies. No paid service or recurring background task was added. Upcoming modules retain their information pages; they do not become generation tools.

Live browser review also confirmed the guest carousel against the actual catalog: the inherited four-preset server allowance was reduced to the requested three, including direct-detail protection. Locked cards use compact spacing so both authentication actions fit the existing carousel height.

The admin directory groups each user's actual plan, credit balance and enforced storage quota together. Plan replacement is atomic, checks the membership being replaced, retains the previous membership and creates a private audit record. Its notification contains only the new plan and expiry. Manual credit notifications contain the signed adjustment and balance, with one notification per ledger transaction. Notification refresh occurs when the bell opens or the browser returns to the foreground.

Fresh MFA is verified by Supabase using the authenticated administrator's own verified factor and bearer token. The client cannot select a different actor. Deletion protects administrative/self accounts and checks active generation/payment work. Storage cleanup is paged and batched before deleting Auth. Financial rows and checkout proofs remain with a null user reference. A partial cleanup freezes new uploads, jobs and checkout creation, and requires a deliberate retry from the admin screen.

Active automatic Paddle subscriptions must be resolved through the existing billing workflow before manual replacement or deletion. Lowering a storage allowance does not remove files; the existing upload trigger enforces it. The rate-limit timer uses server retry information when available. Providers that supply no expiry display an explicitly approximate wait, rather than an invented unlock time.

Canonical analytics count settled real orders, exclude test/sandbox/unverified orders, separate currencies and aggregate in SQL beyond the REST row limit. Daily/monthly boundaries use Europe/Tirane, including daylight-saving transitions. EUR receipts are gross before refunds/fees; USD AI estimates are separate, and no profit margin is fabricated. The production dry run returned 2 real EUR orders totaling EUR 18 and 369 excluded paid test orders.

Final local verification passed on 10 October 2026: 125 test files / 1,581 tests, 26 reconciliation checks, typecheck, lint, production build, UI audit, token mirror, 96 contrast pairs, dependency audit (zero reported production advisories), development-patch check and schema-baseline check. Eleven existing tests remain skipped. Database regressions cover notification rollback, owner-only reads, plan replacement/idempotency/stale state, automatic billing protection, storage enforcement, deletion freeze and financial retention, RaiAccept payment proof/renewal ordering, and aggregates above 1,000 records.

Browser QA used isolated dummy accounts and blocked remote mutations. Confirmed preset text and new-chat retention, both Remix paths, guest gates, color typing without losing focus, reference upload/removal, admin plan/free/MFA/delete forms, and Qelt/Mshelt desktop/mobile layouts. This did not create customer payments, delete customer accounts or run paid generations. Local screenshots and release evidence are kept in the adjacent private release workspace, outside this repository.

Migrations 0061–0063 passed a full production-schema transaction followed by ROLLBACK, with existing row counts unchanged, admin RPCs restricted to service_role, and RaiAccept's verified-payment wrapper preserved. Release execution uses a verified fresh backup in the already authorized private folder, a clean application commit, these passing checks, and read-only post-release checks. Backup archives contain database contents and storage metadata; they do not contain the storage object files, and a restore rehearsal was not performed.
