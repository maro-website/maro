# Raiffeisen Payment Security Audit — Phase 0

Status as of Phase 0 checkpoint. **Do not implement live webhook without official Raiffeisen documentation.**

## Classification legend

| Status | Meaning |
|--------|---------|
| **Implemented** | Verified in repository code |
| **Partial** | Schema or stub exists; not fully functional |
| **Missing** | Not present in codebase |
| **Blocked** | Cannot proceed without official provider documentation |
| **Cannot Verify** | Referenced in docs/legal but implementation not inspectable |

## Requirements

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Hosted checkout (card data off-site) | **Partial** | Legal copy in `src/app/legal/privacy/page.tsx`, `terms/page.tsx`; redirect UI in `src/app/pay/redirect/page.tsx` always sends users to test simulator |
| Payment webhook / async confirmation | **Missing** | Comment in `0004_explore_orders.sql`; no `/api/payments/webhook` route |
| Webhook signature / HMAC verification | **Blocked** | No Raiffeisen spec in repo — **official signature algorithm required** |
| Callback payload structure | **Blocked** | **Official Raiffeisen callback JSON/form spec required** |
| Verification headers | **Blocked** | **Official header names and values required** |
| Signing key format / rotation | **Blocked** | **Official merchant API security documentation required** |
| Store provider transaction ID | **Partial** | Column `provider_order_id` in `0014_payments_maro_plan.sql`; never written in app code |
| Fulfill only on verified paid status | **Partial** | `fulfill_credit_order` checks `status = 'pending'`; trigger is test endpoint or future webhook |
| Idempotent credit grant | **Implemented** | `fulfill_credit_order` RPC — row lock + idempotency key |
| Server-side price catalog | **Implemented** | `getCheckoutItem()` in `src/lib/credits/money.ts` |
| Amount verification vs provider | **Missing** | Fulfillment trusts order row created at checkout |
| Env live/test separation | **Partial** | `PAYMENT_MODE` in `src/lib/config/features.ts`; live mode blocks `complete-test` but has no live fulfillment path |
| Legal consent before purchase | **Implemented** | `LegalConsentCheckbox` + checkout validation |
| Rate limiting on payment APIs | **Missing** | Generic IP limit on `/api/*` only |
| PCI scope reduction | **Cannot Verify** | Policy stated; actual hosted checkout URL not integrated |

## Phase 0 actions taken

- Hardened test payment gating (`isTestPaymentAllowed()` — see `src/lib/payments/testMode.ts`)
- Documented blockers (this file)
- **Did not** create fake Raiffeisen webhook

## Information required from product owner (BLOCKED items)

To implement live Raiffeisen fulfillment in Phase 4, provide:

1. **Official integration guide** — hosted checkout redirect URL format, required POST/GET parameters
2. **Webhook / IPN specification** — endpoint expectations, HTTP method, content-type
3. **Signature verification** — algorithm (e.g. HMAC-SHA256), secret/key placement, canonical string to sign, header name(s)
4. **Transaction status codes** — mapping from provider status → Maro `paid` / `cancelled` / `failed`
5. **Sandbox credentials** — merchant ID, terminal ID, test signing key (store in env, not repo)
6. **Production credentials process** — how keys are rotated and where they are stored
7. **Refund API** (if applicable) — for monetary refund workflow

Until the above are supplied, live payment completion remains **BLOCKED — OFFICIAL RAIFFEISEN DOCUMENTATION REQUIRED**.
