# Phase 0 — Promo attribution (partial fix)

## Implemented in Phase 0

- Checkout accepts optional `promoCode` on `POST /api/payments/create-order`
- Server validates promo via `validatePromoCode()` (`src/lib/payments/promo.ts`)
- Valid codes are stored on `credit_orders.promo_code` at order creation
- `promo_used` product event emitted on checkout create (deduped by order id)
- Pricing page reads `?promo=` from URL and passes to checkout
- Creator stats API can now match paid orders when promo was applied at checkout

## Still Phase 4 (not done)

- Discount amount not applied to `amount_cents` (catalog price unchanged)
- No `creator_commissions` ledger table
- Referral slug on `/pricing?promo=` does not auto-apply discount to displayed price
- Payout workflow remains manual
