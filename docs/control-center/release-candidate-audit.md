# Maro Control Center — Release Candidate Audit

**Date:** 2026-08-16  
**Scope:** Full approved Control Center build (post Phase 2A.5 / 2B.1)  
**Verdict:** **CODE COMPLETE** — not production validated  
**Next gate:** Apply migrations → E2E validation → controlled activation

---

## Executive summary

The approved Control Center build scope is **code-complete**. All priority modules have dedicated routes, audited APIs, and RBAC. Production execution gates remain frozen exactly as defined. Raiffeisen live commerce remains **BLOCKED**. Engine LIVE cutover remains **forbidden**.

| Gate | Status |
|------|--------|
| `prompt_compiler_v2` | **false** (UI frozen from enabling) |
| maroWeb pipeline | **shadow** (comparison only) |
| maroImazh / maroLogo pipeline | **legacy** |
| Engine provider execution | **blocked** (`executeGate.ts`) |
| Raiffeisen live | **BLOCKED — DOCUMENTATION REQUIRED** |
| Tests | **64 passing** (`npx vitest run`) |
| Build | **passes** (`npx next build`) |

---

## Production freeze compliance

| Rule | Status | Evidence |
|------|--------|----------|
| No Engine LIVE for users | ✅ | `wouldUseEngineProvider` + `canExecuteEngineProvider()` |
| Shadow does not call providers | ✅ | `shadowCompile.ts` compile-only |
| maroWeb shadow only in 2B.1 phase policy | ✅ | `engineIntegrationPolicy.ts` phase `2b1` |
| Imazh/Logo shadow prep gated by flags | ✅ | `engine_shadow_imazh`, `engine_shadow_logo` default false |
| Preset reveal disabled | ✅ | `PRESET_REVEAL_DISABLED`, `/api/prompts/reveal` → 410 |
| No Raiffeisen webhooks/HMAC invented | ✅ | `raiffeisen_live` flag frozen; test checkout only |
| No destructive migrations | ✅ | 0021–0025 additive only |

---

## Subsystem audit (sections 1–33)

### 1. Command Center dashboard
**Status:** READY FOR RELEASE (data-dependent)  
- `/admin` — `CommandCenterDashboard.tsx` + `/api/admin/command-center/kpis`  
- Requires migrations applied for full KPI accuracy

### 2. RBAC & access
**Status:** READY FOR RELEASE  
- `permissions.ts`, `/admin/access`, `/api/admin/users/role`  
- Legacy `is_admin` maps to `super_admin`

### 3. Commerce — Plans & credits
**Status:** READY FOR RELEASE  
- `/admin/commerce/plans` — EUR catalog read-only from `money.ts`; generation pricing snapshot  
- Legacy editor link preserved at `/admin?tab=pricing`

### 4. Commerce — Payments
**Status:** READY BUT REQUIRES REAL E2E VALIDATION  
- `/admin/commerce/payments` — reads `/api/admin/orders`  
- Live Raiffeisen fulfillment **BLOCKED**

### 5. Commerce — Promo codes
**Status:** READY FOR RELEASE  
- `/admin/commerce/promos` + audited `/api/admin/commerce/promos`

### 6. Commerce — Creator earnings
**Status:** READY FOR RELEASE (estimated)  
- `/admin/commerce/creators` + `/api/admin/commerce/earnings`  
- `creator_commissions` ledger table exists; payout workflow not live

### 7. Commerce — Credit ledger
**Status:** READY FOR RELEASE  
- `/admin/commerce/ledger` + `/api/admin/commerce/ledger`

### 8. Raiffeisen integration
**Status:** **BLOCKED — RAIFFEISEN DOCUMENTATION REQUIRED**  
- No live webhooks, HMAC, refund API, or callback handlers  
- Test mode checkout remains independent architecture

### 9. Support Center
**Status:** READY BUT REQUIRES REAL E2E VALIDATION  
- `/admin/support` + `/api/admin/support/tickets`  
- Tables: `support_tickets`, `support_ticket_messages`, `refund_records`  
- Generation reports still on legacy tab

### 10. Notifications CMS
**Status:** READY FOR RELEASE  
- `/admin/notifications` + `/api/admin/notifications/campaigns`  
- `notification_campaigns`, `notification_dismissals`

### 11. Analytics — Platform overview
**Status:** READY BUT REQUIRES REAL E2E VALIDATION  
- `/admin/analytics` + `/api/admin/analytics/overview`  
- Real aggregates from `profiles`, `generations`, `credit_orders`

### 12. Analytics — maroPresets
**Status:** READY FOR RELEASE  
- Legacy tab + `/api/admin/analytics/prompt-events`  
- Historical reveal data preserved for analytics

### 13. Operations — Audit log
**Status:** READY FOR RELEASE  
- `/admin/operations/audit` + `audit_events` via `/api/admin/operations/logs?kind=audit`

### 14. Operations — System logs
**Status:** READY FOR RELEASE  
- `/admin/operations/logs` — generations + `security_events`

### 15. Operations — Kill switches & flags
**Status:** READY FOR RELEASE  
- `/admin/operations/flags` — toggles non-frozen flags; freezes `prompt_compiler_v2`, `raiffeisen_live`

### 16. Operations — Budget guards
**Status:** READY BUT REQUIRES REAL E2E VALIDATION  
- Schema + API read via flags endpoint; enforcement wiring partial

### 17. Security & costs (legacy page)
**Status:** READY FOR RELEASE  
- `/admin/security` — circuit breaker, module pause, spend monitoring (existing)

### 18. MFA / privileged security
**Status:** READY BUT REQUIRES REAL E2E VALIDATION  
- Policy documented on kill switches page  
- Automated MFA enforcement for admin roles not wired in session gate

### 19. Maro Engine — Admin workspace
**Status:** READY FOR RELEASE  
- `/admin/engine`, tool workspace, dry-run compile, inputs CMS

### 20. Maro Engine — Shadow mode (maroWeb)
**Status:** READY BUT REQUIRES REAL E2E VALIDATION  
- Infrastructure complete; real traffic shadow evidence still required before LIVE

### 21. Maro Engine — Provider adapters
**Status:** CODE COMPLETE — **NOT PRODUCTION VALIDATED**  
- `claudeWeb.ts`, `openaiImage.ts`, `executeGate.ts` — mock-tested only

### 22. Imazh shadow preparation
**Status:** CODE COMPLETE — pipeline **legacy**  
- `engine_shadow_imazh` flag + `shouldRunShadowCompilation` build phase  
- `maybeScheduleImageShadow` reads flags; default off

### 23. Logo shadow preparation
**Status:** CODE COMPLETE — pipeline **legacy**  
- Same as Imazh via `engine_shadow_logo`

### 24. maroPresets CMS
**Status:** READY FOR RELEASE  
- `/admin/prompts` editor; reveal UX hidden when disabled  
- `/admin/presets/categories` + `/api/admin/presets/categories`

### 25. Preset reveal retirement
**Status:** READY FOR RELEASE  
- API 410; UI toast on attempt; historical `prompt_reveals` retained

### 26. Legacy admin decomposition
**Status:** PARTIAL — acceptable for RC  
- Dedicated routes for Commerce, Operations, Support, Analytics, Notifications  
- Legacy monolith `/admin?page.tsx` retained for: users, creators, pricing editor, promos fallback, reports, log, reklamat, fort, master prompts

### 27. Engine execution gate
**Status:** READY FOR RELEASE  
- `canExecuteEngineProvider()` requires `pipeline=engine` AND `prompt_compiler_v2=true`

### 28. Source of truth matrix
**Status:** READY FOR RELEASE  
- `sourceOfTruth.ts`, `configHealth.ts`

### 29. Migrations
**Status:** NEEDS FIX if not applied  
- Apply in order: `0021` → `0022` → `0023` → `0024` → `0025`  
- **0025 required** for Support, Notifications, preset categories, operations tables

### 30. Data retention policies
**Status:** READY FOR RELEASE (schema)  
- `data_retention_policies` seeded in 0025; cron enforcement not verified

### 31. Help Center CMS
**Status:** SCHEMA ONLY  
- `help_articles` table exists; no admin UI in this build

### 32. Provider cost estimates
**Status:** SCHEMA ONLY  
- `provider_cost_estimates` table; ingestion not wired to generation pipeline

### 33. Pricing snapshots
**Status:** SCHEMA ONLY  
- `pricing_snapshots` table; checkout snapshot write not verified

---

## Grep classification

| Pattern | Finding | Classification |
|---------|---------|----------------|
| `TODO` / `FIXME` in `src/` | **0 matches** | Clean |
| `promptReveal` / reveal UX | Active in `/prompts` page behind `PRESET_REVEAL_DISABLED` guard | **Intentional legacy UI — disabled** |
| `maroPrompt` | Generation attach by ID (not reveal) | **Production feature — OK** |
| `is_admin` | Legacy fallback + migration path to `access_role` | **Intentional compat** |
| `raiffeisen` | Test checkout provider label + frozen flag | **BLOCKED for live** |
| `prompt_compiler_v2` | Policy + frozen admin toggle | **Frozen false** |
| `legacy` admin tabs | Still present at `?tab=` | **Decomposition partial** |

---

## Test & build evidence

```
npx vitest run  → 64 tests passed (5 files)
npx next build  → success (62 static pages + dynamic admin routes)
```

New routes confirmed in build output:
- `/admin/commerce/*`, `/admin/operations/*`, `/admin/support`, `/admin/notifications`, `/admin/analytics`, `/admin/presets/categories`

---

## Activation checklist (post-audit — human gates)

1. Apply migrations 0021–0025 on staging/production Supabase
2. Smoke test each admin route with real admin session + RBAC roles
3. Verify KPI endpoints return data (not 503)
4. Run maroWeb shadow on staging with real traffic; review `engine_shadow_comparisons`
5. Confirm `prompt_compiler_v2` remains false in DB
6. Raiffeisen: obtain official docs before any live flag change
7. Enroll MFA for super_admin accounts before public Control Center launch
8. E2E: checkout test mode → credit ledger → generation debit

---

## Stop condition met

**Full Release Candidate Audit complete.**  
Build scope is **code-complete**. Do not declare **production validated** until E2E checklist passes.

---

## Related docs

- `docs/control-center/phase2a5-checkpoint.md`
- `docs/control-center/phase2b1-checkpoint.md`
- `docs/control-center/build-progress.md`
- `docs/control-center/raiffeisen-audit.md`
