# Phase 0 + Phase 1 Checkpoint Report

**Status:** COMPLETE — stopped before Phase 2 (Maro Engine).  
**Date:** 2026-08-16

---

## A. What Was Implemented

### Phase 0 — Safety & Critical Fixes

| Task | Status |
|------|--------|
| Migration baseline documentation | Done — `docs/control-center/phase0-baseline.md` |
| Raiffeisen audit (no fake webhook) | Done — `docs/control-center/raiffeisen-audit.md` |
| Creator approval UI bug fix | Done — status-aware actions + server API |
| Analytics admin access hotfix | Done — RLS policy + `/api/admin/analytics/prompt-events` |
| Test payment isolation hardened | Done — `isTestPaymentAllowed()` |
| Promo attribution (localized) | Partial — `promo_code` stored at checkout; see `docs/control-center/promo-phase0.md` |

### Phase 1 — Foundation

| Task | Status |
|------|--------|
| RBAC (`access_role` + permission matrix) | Done |
| `requirePermission()` centralized auth | Done |
| Server-side `/admin/*` protection (layout + middleware) | Done |
| Control Center shell (sidebar groups, role-aware nav) | Done |
| `audit_events` + writeAuditEvent | Done |
| Admin credit adjustments via ledger RPC | Done — `/api/admin/credits/adjust` |
| Creator approve/reject via admin API | Done — `/api/admin/creators` |
| Product events foundation | Done — `product_events` + emitter |
| Feature flags foundation | Done — `feature_flags` + `prompt_compiler_v2=false` |
| Admin APIs migrated to RBAC | Done — orders, reports, security, prompts, uploads |
| Placeholder routes | Done — `/admin/access`, `/admin/engine`, `/admin/support` |

---

## B. Critical Bugs Fixed

1. **Creator Approve always visible** — buttons now reflect `pending` / `approved` / `rejected`
2. **Analytics empty** — admin SELECT policy on `prompt_events` + protected API route
3. **Admin credits bypass ledger** — direct `profiles.credits` update removed; uses `admin_adjust_credits` RPC
4. **Promo not stored on orders** — checkout passes validated `promoCode`; stored in `credit_orders.promo_code`
5. **Test payment in production** — blocked when `PAYMENT_MODE=live` or `NODE_ENV=production` without `ALLOW_TEST_PAYMENTS=true`

---

## C. Security Changes

- **RBAC:** `profiles.access_role` with Super Admin / Administrator / Developer / Editor
- **Backwards compat:** `is_admin` synced via DB trigger; legacy admins backfilled to `super_admin`
- **Route guards:** Server layout (`getAdminSession`) + middleware on `/admin/:path*`
- **API guards:** All touched `/api/admin/*` routes use `requirePermission()`
- **Audit trail:** Sensitive mutations write to `audit_events`
- **Test payments:** Hardened gating in `complete-test`

---

## D. Database Migrations

**New file:** `supabase/migrations/0021_control_center_foundation.sql`

| Change | Purpose |
|--------|---------|
| `profiles.access_role` | RBAC role column |
| Backfill `is_admin` → `super_admin` | No admin lockout |
| `sync_profile_admin_flags` trigger | Keeps `is_admin` ↔ `access_role` in sync |
| `has_admin_access()` | RLS helper |
| `audit_events` table | Admin audit log |
| `feature_flags` table | Gradual rollout (`prompt_compiler_v2`) |
| `product_events` table | Analytics foundation |
| `prompt_events_admin_select` policy | Analytics hotfix |
| `admin_adjust_credits()` RPC | Ledger-safe manual adjustments |

**Apply on Supabase:** Run migration `0021` in SQL editor or via CLI before using new admin credit/audit features in production.

---

## E. Files Changed

### Created

- `supabase/migrations/0021_control_center_foundation.sql`
- `docs/control-center/*.md` (baseline, Raiffeisen audit, promo, this checkpoint)
- `src/lib/admin/{permissions,auth,audit,session}.ts`
- `src/lib/events/productEvents.ts`
- `src/lib/features/flags.ts`
- `src/lib/payments/{testMode,promo}.ts`
- `src/lib/credits/adminAdjust.ts`
- `src/components/admin/{AdminShell,AdminSidebar,AdminPageHeader}.tsx`
- `src/app/admin/{layout.tsx,AdminShellClient.tsx,access,engine,support}/page.tsx`
- `src/app/api/admin/{credits/adjust,creators,analytics/prompt-events,users/role}/route.ts`
- `src/lib/__tests__/control-center-foundation.test.ts`
- `vitest.config.ts`

### Modified

- `src/app/admin/page.tsx` — shell integration, creator/credits/analytics fixes
- `src/middleware.ts` — admin route protection
- `src/context/store.tsx` — `accessRole` exposed
- `src/lib/supabase/types.ts` — `access_role` on Profile
- `src/lib/supabase/server.ts` — `getProfileCredits` includes `access_role`
- `src/lib/payments/orders.ts` — `promo_code` on create
- `src/app/api/payments/{create-order,complete-test}/route.ts`
- `src/app/checkout/page.tsx`, `src/app/pricing/page.tsx` — promo wiring
- All existing `/api/admin/*` routes — RBAC + audit where applicable
- `package.json` — vitest scripts

### Removed

- None (monolith preserved at `/admin` with tab query params)

---

## F. Tests

| Suite | Result |
|-------|--------|
| `src/lib/__tests__/control-center-foundation.test.ts` | **9/9 passed** |
| `next build` | **Passed** (pre-existing ESLint warnings only) |

**Not covered (manual / integration required):**

- Live Supabase RPC `admin_adjust_credits` against production DB
- End-to-end admin UI flows in browser
- Payment fulfillment with real Raiffeisen (blocked)

Run locally: `pnpm test` and `pnpm build`

---

## G. Production Compatibility

**Unchanged user flows:**

- Signup, login, generation (web/image/logo), maroFort, maroBrain
- Plans display, top-up eligibility rule
- Creator portal, promo browsing
- Existing admin tabs (now inside Control Center shell)

**No generation pipeline changes.** No maroPresets rename. No prompt reveal removal.

---

## H. Data Migration Result

- Existing `is_admin=true` users → `access_role='super_admin'` (migration SQL)
- `is_admin` remains `true` for all privileged roles via trigger
- No data deleted; no table renames

---

## I. Raiffeisen Status

See full detail in `docs/control-center/raiffeisen-audit.md`.

| Item | Status |
|------|--------|
| Idempotent credit grant | **Complete** |
| Server-side price catalog | **Complete** |
| Legal consent | **Complete** |
| Hosted checkout | **Partial** (UI copy only) |
| Webhook / signature | **BLOCKED** — official docs required |
| Live fulfillment | **BLOCKED** |

### Information still required from you

1. Official Raiffeisen hosted checkout integration guide (redirect URL, parameters)
2. Webhook/IPN specification (method, payload, headers)
3. Signature verification algorithm and key format
4. Transaction status code mapping
5. Sandbox merchant credentials and test signing key
6. Refund API documentation (if applicable)

---

## J. Known Issues (Intentionally Left)

- Legacy admin monolith still at `/admin?tab=*` (not fully decomposed)
- Roles UI at `/admin/access` is placeholder; role changes via API only
- Promo discount not applied to price (attribution only)
- `creator_commissions` ledger not built (Phase 4)
- Dashboard KPIs not rebuilt (Phase 6)
- MFA not implemented (Phase 7)
- Some admin reads still use browser Supabase client (RLS-backed; mutations for credits/creators moved to API)

---

## K. Technical Debt Introduced

- Dual admin navigation (Control Center sidebar + legacy tab nav on dashboard)
- `is_admin` + `access_role` dual field until all checks migrated
- Product event dedupe uses metadata JSON contains (may need dedicated column at scale)

---

## L. Phase 2 Readiness

**Foundation is ready** for Maro Engine work pending:

1. **Apply migration `0021`** on production/staging Supabase
2. **Export `app_settings` snapshot** before Phase 2 prompt migrations
3. **Supply Raiffeisen docs** before live payment work (Phase 4, not blocking Engine)

**No blockers** for Phase 2 Maro Engine approval from a security/RBAC perspective.

---

## STOP — Awaiting explicit approval for Phase 2 (Maro Engine)
