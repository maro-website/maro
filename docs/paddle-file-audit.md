# Paddle file and commit-hygiene audit — 2026-09-29

All 71 files from the prior review are individually classified below. The additional
files are narrowly required by the user's final provider/copy/configuration decisions.
No file was staged or committed. Baseline: origin/main fa8f78bcfa9e3c0728b0100128f067d96ffa81cd.

## Categories and final counts

- A — REQUIRED FOR PRODUCTION: **35** application/configuration/migration files.
- B — REQUIRED REGRESSION TEST: **7** files. All valuable Paddle tests retained.
- C — USEFUL DOCUMENTATION: **3** files.
- D — DEVELOPMENT / E2E ONLY: **3** reusable tools included; **12** local-only files excluded.
- E — TEMPORARY — REMOVE BEFORE COMMIT: **23** prior files removed.
- F — UNRELATED — MUST NOT COMMIT: **0** found.

**Proposed commit: 48 files total; production category A: 35.**
The proposed commit intentionally includes tests, documentation and three reusable
development tools. Those are not runtime application modules. The two package
manifests include both Paddle runtime SDKs and test-only dependencies.

## Original 71-file review

| File | Class | Final disposition |
| --- | --- | --- |
| `.agents/skills/billing-history/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/catalog-setup/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/checkout-web/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/customer-portal/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/pricing-pages/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/sandbox-testing/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/subscription-cancel/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/subscription-sync/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/subscription-update/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.agents/skills/webhooks/SKILL.md` | D | Excluded; retain ignored local assistant setup |
| `.codex/config.toml` | D | Excluded; retain ignored local assistant setup |
| `.env.example` | A | Keep; application, migration, dependency or configuration change |
| `.gitignore` | A | Keep; application, migration, dependency or configuration change |
| `docs/paddle-audit.md` | E | Remove; durable findings consolidated in review/audit |
| `docs/paddle-checkout-settings.png` | E | Remove; durable findings consolidated in review/audit |
| `docs/paddle-commit-files.txt` | E | Remove; durable findings consolidated in review/audit |
| `docs/paddle-review.md` | C | Keep; current decisions, evidence or runbook |
| `docs/paddle-sandbox-objects.json` | E | Remove; durable findings consolidated in review/audit |
| `docs/paddle-testing.md` | C | Keep; current decisions, evidence or runbook |
| `package.json` | A | Keep; application, migration, dependency or configuration change |
| `pnpm-lock.yaml` | A | Keep; application, migration, dependency or configuration change |
| `security-headers.mjs` | A | Keep; application, migration, dependency or configuration change |
| `src/app/api/payments/cancel-order/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/api/payments/complete-test/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/api/payments/invoice/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/api/payments/order/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/api/payments/paddle/checkout/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/api/payments/paddle/portal/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/api/webhooks/paddle/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/checkout/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/app/pay/paddle/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/components/account/BillingSection.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/components/account/OrdersSection.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/components/account/PaddlePortalButton.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/__tests__/commerce-smoke.integration.test.ts` | B | Keep; automated regression coverage |
| `src/lib/__tests__/paddle-checkout-routing.test.ts` | B | Keep; automated regression coverage |
| `src/lib/__tests__/paddle-database.test.ts` | B | Keep; automated regression coverage |
| `src/lib/__tests__/paddle-routes.test.ts` | B | Keep; automated regression coverage |
| `src/lib/__tests__/paddle-webhooks.test.ts` | B | Keep; automated regression coverage |
| `src/lib/commerce/entitlements.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/commerce/memberships.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/commerce/types.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/payments/checkout-routing.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/payments/orders.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/payments/paddle/checkout.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/payments/paddle/config.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/payments/paddle/webhooks.ts` | A | Keep; application, migration, dependency or configuration change |
| `supabase/migrations/0047_paddle_billing.sql` | A | Keep; application, migration, dependency or configuration change |
| `tools/paddle/check-sandbox.mjs` | D | Keep; reusable guarded Sandbox setup/validation, no runtime import |
| `tools/paddle/configure-webhook.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/create-test-accounts.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/diagnose-credit-fixtures.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/diagnose-test-commerce.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/export-review.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/inspect-checkout.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/inspect-test-db.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/lifecycle-context.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/mcp-sandbox.mjs` | D | Excluded; retain ignored local assistant setup |
| `tools/paddle/migrate-test-db.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/prepare-checkout.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/replay-paid-event.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/restore-test-signup-trigger.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/seed-sandbox.mjs` | D | Keep; reusable guarded Sandbox setup/validation, no runtime import |
| `tools/paddle/seed-test-commerce.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/test-environment.mjs` | D | Keep; reusable guarded Sandbox setup/validation, no runtime import |
| `tools/paddle/verify-isolation.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/verify-lifecycle.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/verify-ownership.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/verify-paid-checkout.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/verify-topups.mjs` | E | Remove; disposable E2E/debug/tunnel helper |
| `tools/paddle/webhook-proxy.mjs` | E | Remove; disposable E2E/debug/tunnel helper |

## Additional files required by final decisions

| File | Class | Final disposition |
| --- | --- | --- |
| `docs/paddle-file-audit.md` | C | Keep; current decisions, evidence or runbook |
| `src/app/api/payments/create-order/route.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/app/legal/privacy/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/app/legal/refund/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/app/legal/terms/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/app/pay/redirect/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/app/pay/test/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/app/pricing/page.tsx` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/__tests__/legacy-payment-gates.test.ts` | B | Keep; automated regression coverage |
| `src/lib/__tests__/paddle-environment.test.ts` | B | Keep; automated regression coverage |
| `src/lib/payments/legacy.ts` | A | Keep; application, migration, dependency or configuration change |
| `src/lib/payments/paddle/environment.ts` | A | Keep; application, migration, dependency or configuration change |

## Cleanup and exclusions

Local assistant skills, MCP config and adapter remain usable but are explicitly
ignored and excluded. The user-provided .env.local remains ignored; its credentials
were not deleted or copied into deliverables. The ignored .paddle-e2e directory
(generated account credentials, sessions, screenshots, simulator payloads, logs,
diagnostic scripts and cloudflared binary) and 17 root diagnostic/review logs were removed after
sanitized evidence was consolidated. The temporary proxy/tunnel/dev processes were
stopped and their Sandbox notification destination disabled. Sandbox payment and
test-account records remain as provider/database audit evidence, not shipped files.

Historical legacy invoice access is retained with ownership checks; legacy purchase,
completion/cancel endpoints and both fake-payment pages are disabled by default.
Underlying provider clients and original legacy SQL routines are preserved. No
unrelated application credit logic changed; the two smoke fixtures now create the
generation_jobs rows required by the supplied test database.
The unused postgres package introduced solely for disposable diagnostics was also
removed from package.json and the lockfile; frozen offline lockfile verification passed.

## Exact proposed file list

- `.env.example`
- `.gitignore`
- `docs/paddle-file-audit.md`
- `docs/paddle-review.md`
- `docs/paddle-testing.md`
- `package.json`
- `pnpm-lock.yaml`
- `security-headers.mjs`
- `src/app/api/payments/cancel-order/route.ts`
- `src/app/api/payments/complete-test/route.ts`
- `src/app/api/payments/create-order/route.ts`
- `src/app/api/payments/invoice/route.ts`
- `src/app/api/payments/order/route.ts`
- `src/app/api/payments/paddle/checkout/route.ts`
- `src/app/api/payments/paddle/portal/route.ts`
- `src/app/api/webhooks/paddle/route.ts`
- `src/app/checkout/page.tsx`
- `src/app/legal/privacy/page.tsx`
- `src/app/legal/refund/page.tsx`
- `src/app/legal/terms/page.tsx`
- `src/app/pay/paddle/page.tsx`
- `src/app/pay/redirect/page.tsx`
- `src/app/pay/test/page.tsx`
- `src/app/pricing/page.tsx`
- `src/components/account/BillingSection.tsx`
- `src/components/account/OrdersSection.tsx`
- `src/components/account/PaddlePortalButton.tsx`
- `src/lib/__tests__/commerce-smoke.integration.test.ts`
- `src/lib/__tests__/legacy-payment-gates.test.ts`
- `src/lib/__tests__/paddle-checkout-routing.test.ts`
- `src/lib/__tests__/paddle-database.test.ts`
- `src/lib/__tests__/paddle-environment.test.ts`
- `src/lib/__tests__/paddle-routes.test.ts`
- `src/lib/__tests__/paddle-webhooks.test.ts`
- `src/lib/commerce/entitlements.ts`
- `src/lib/commerce/memberships.ts`
- `src/lib/commerce/types.ts`
- `src/lib/payments/checkout-routing.ts`
- `src/lib/payments/legacy.ts`
- `src/lib/payments/orders.ts`
- `src/lib/payments/paddle/checkout.ts`
- `src/lib/payments/paddle/config.ts`
- `src/lib/payments/paddle/environment.ts`
- `src/lib/payments/paddle/webhooks.ts`
- `supabase/migrations/0047_paddle_billing.sql`
- `tools/paddle/check-sandbox.mjs`
- `tools/paddle/seed-sandbox.mjs`
- `tools/paddle/test-environment.mjs`
