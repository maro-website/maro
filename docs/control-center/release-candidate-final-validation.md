# MARO RELEASE CANDIDATE — FINAL VALIDATION REPORT

**Date:** 2026-08-16  
**Scope:** RC gap closure + non-AI validation pass  
**Production freeze:** UNCHANGED

---

## 1. Final code-completion status

All RC gap-closure items from the audit are **implemented in code**. The platform remains **not production validated** for live AI provider traffic or Raiffeisen live payments.

| Area | Code-complete | Notes |
|------|---------------|-------|
| MFA enforcement | ✅ | Server gate in `auth.ts`, `session.ts`, admin layout redirect |
| Budget guards | ✅ | Evaluation + block/warn in orchestrator; Ops UI |
| Help Center CMS | ✅ | `/admin/help` + API |
| Provider cost ingestion | ✅ | `recordProviderCostEstimate` on generation complete |
| Pricing snapshots | ✅ | Order + generation snapshots |
| Data retention | ✅ | Cron route + manual trigger + run log |
| Creator commissions | ✅ | Manual Mark as Paid workflow |
| Support reports | ✅ | `/admin/support/reports` reuses panel |
| Preset reveal cleanup | ✅ | UI removed; API permanent 410 |
| Validation cross-checks | ✅ | `/api/admin/analytics/validation` |

---

## 2. Gaps discovered from previous audit

- MFA documented but not enforced server-side
- `budget_guards` schema only — no runtime evaluation
- `help_articles` schema only — no CMS
- `provider_cost_estimates` / `pricing_snapshots` never written
- Retention policy seeded but no executor
- Creator earnings estimated only — no payout state machine
- Generation reports isolated on legacy tab
- Preset reveal UI still present (disabled by flag)
- Command Center KPIs could not cross-check against DB

---

## 3. Gaps fixed

| Gap | Fix |
|-----|-----|
| MFA | `assertAdminMfa`, `/admin/mfa`, layout redirect, API gate |
| Budget guards | `assertBudgetGuards` in `prepareGeneration`, seed rows in 0026 |
| Help Center | `src/lib/help/articles.ts`, `/admin/help`, RBAC `help.manage` |
| Provider costs | `src/lib/cost/recordEstimate.ts` wired in `completeGeneration` |
| Pricing snapshots | `src/lib/pricing/snapshots.ts` on order create + generation complete |
| Retention | `runGenerationDebugRetention`, `/api/cron/data-retention`, Ops UI |
| Commissions | `creator_commissions` workflow, Mark as Paid + audit |
| Support | `GenerationReportsPanel`, `/admin/support/reports` |
| Reveal | Removed client reveal flow; `preset_reveal_enabled` frozen |
| Analytics | `loadValidationCrossChecks()` helper API |

**Migration added:** `0026_rc_gap_closure.sql`

---

## 4. Bugs found during E2E

| ID | Finding | Severity |
|----|---------|----------|
| E2E-1 | Middleware cannot call `server-only` MFA admin API — MFA enforced in server layout instead | Resolved (by design) |
| E2E-2 | `operations/retention` route corrupted during edit | Fixed |
| E2E-3 | Prompts page `Check` import removed but still used on owned badge | Fixed |
| E2E-4 | `canExecuteEngineProvider` test expected `.ok` property | Fixed |

No P0/P1 security defects found in static review of new routes.

---

## 5. Bugs fixed

All items in section 4 resolved in this session.

---

## 6. Database / migrations

Apply in order:

```
0021 → 0022 → 0023 → 0024 → 0025 → 0026
```

**0026** adds: cost/snapshot columns, `retention_execution_runs`, help `archived`, commission payout fields, budget guard seeds.

---

## 7. RLS matrix (new RC tables)

| Table | Public | User | Admin |
|-------|--------|------|-------|
| `preset_categories` | read active | — | full |
| `support_tickets` | — | own read/insert | full update |
| `refund_records` | — | — | full |
| `creator_commissions` | — | creator read own | admin read |
| `provider_cost_estimates` | — | — | admin read |
| `pricing_snapshots` | — | — | admin read |
| `notification_campaigns` | read active | — | full |
| `help_articles` | read published | — | full |
| `budget_guards` | — | — | full |
| `security_events` | — | — | admin read |
| `retention_execution_runs` | — | — | admin read |
| `data_retention_policies` | — | — | admin read |

Service-role writes used for ingestion paths (cost, snapshots, retention).

---

## 8. RBAC results

| Role | Admin entry | MFA required | Help CMS | Commerce | Engine |
|------|-------------|--------------|----------|----------|--------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Administrator | ✅ | ✅ | ✅ | ✅ | ✅ |
| Developer | ✅ | ✅ | ❌ | partial | ✅ |
| Editor | ✅ | ❌ | ✅ | ❌ | ❌ |

API gate: `requirePermission` + MFA for privileged roles.  
Direct API bypass without Bearer token: **403 forbidden** (verified by gate design).

---

## 9. MFA status

**READY FOR MANUAL E2E**

- Server: `assertAdminMfa` checks verified TOTP factor + JWT `aal2`
- Pages: `/admin/mfa` enroll/challenge via Supabase native MFA
- Editor role: optional (no MFA requirement)
- Browser enrollment/challenge flow requires manual validation with real Supabase project

---

## 10. Credits integrity

**READY FOR MANUAL E2E**

- Ledger remains append-only via RPCs (`reserve_credits`, `finalize_credit_charge`)
- Admin adjust audited via existing routes
- Generation pricing snapshot captured at `completeGeneration`
- Refund records schema + support API for manual recording

---

## 11. Commerce integrity

**READY FOR MANUAL E2E**

- Dedicated Commerce routes + audited promo CRUD
- Order pricing snapshot on `createCreditOrder`
- Test checkout path unchanged; Raiffeisen live **BLOCKED**

---

## 12. Promo / Creator attribution

**READY FOR MANUAL E2E**

- Promo attribution on orders preserved
- `creator_commissions` records with statuses: pending, paid, void
- Manual Mark as Paid — no automated bank transfer

---

## 13. Pricing snapshots

**CODE COMPLETE — READY FOR MANUAL E2E**

- `kind=purchase` on order creation
- `kind=generation` on generation complete
- Snapshot includes pricing config at decision time

---

## 14. Provider cost ingestion

**CODE COMPLETE — READY FOR MANUAL E2E**

Priority chain implemented: provider-reported → usage-calculated → configured fixed → fallback maximum.  
All records marked `reconciliation_status=estimated` unless provider-reported.  
Command Center `aiCostToday` reads `provider_cost_estimates`.

---

## 15. Preset secrecy

**READY FOR MANUAL E2E**

- Public `/api/prompts` excludes `full_prompt`
- Reveal API returns **410 Gone** unconditionally
- Client reveal UI removed
- `preset_reveal_enabled` flag frozen in admin UI
- Presets attach by ID server-side only in generation routes

---

## 16. Support / Help Center

**READY FOR MANUAL E2E**

- Tickets CRUD at `/admin/support`
- Generation reports at `/admin/support/reports`
- Help CMS at `/admin/help`

---

## 17. Notifications

**READY FOR MANUAL E2E**

- Campaign CRUD with audit
- Dismissals schema present; user dismissal flow pre-existing

---

## 18. Analytics accuracy

**READY FOR MANUAL E2E**

- Platform aggregates from real tables
- Cross-check API: `GET /api/admin/analytics/validation`
- Compare `deltas` object — should be 0 when DB populated consistently

---

## 19. Command Center accuracy

**READY FOR MANUAL E2E**

- KPIs use `credit_orders`, `generations`, `provider_cost_estimates`
- Validation helper exposes delta fields for manual verification

---

## 20. Operations / budget guards

**READY FOR MANUAL E2E**

- Guards seeded (disabled by default) with explicit `warn` or `block` actions
- Evaluation uses **estimated** spend from `provider_cost_estimates`
- Block action throws `budget_guard_blocked` in `prepareGeneration`
- Events logged to `security_events`

---

## 21. Retention enforcement

**READY FOR MANUAL E2E**

- Policy-driven `generation_debug` cleanup (metadata strip, not financial purge)
- Cron: `vercel.json` → `/api/cron/data-retention` daily 03:00 UTC
- Manual run from Operations flags page
- Execution logged in `retention_execution_runs`

---

## 22. Engine safety

**READY FOR REAL AI E2E** (infrastructure only validated statically)

- `prompt_compiler_v2=false` frozen
- maroWeb shadow only; Imazh/Logo legacy
- `canExecuteEngineProvider` blocks live provider
- Dry-run, shadow compile, adapter mapping: unit-tested

---

## 23. Security findings

| Severity | Finding | Status |
|----------|---------|--------|
| — | No P0/P1 in new admin routes (static review) | Pass |
| P2 | Legacy admin monolith still has direct browser Supabase in some tabs | Accepted for RC |
| P2 | MFA browser flow needs manual Supabase TOTP E2E | Track in activation |

---

## 24. Performance findings

No regressions identified in build. Static generation: 65 pages. Pre-existing ESLint warnings in `cards.tsx` and `store.tsx` unchanged.

---

## 25. Legacy compatibility

**READY FOR MANUAL E2E**

- Legacy `?tab=` routes retained
- New sidebar favors dedicated routes
- Commerce promos: new audited API (legacy tab may still exist — prefer new route)
- No dual writable source-of-truth for promos on new path

---

## 26. Complete test results

```
npx vitest run
  Test Files  6 passed (6)
  Tests       70 passed (70)

npx next build  ✅ success (65 pages)

npx next lint   ✅ pass (2 pre-existing warnings, 0 errors)
```

Suites: `control-center-foundation`, `rc-gap-closure`, `maro-web-shadow`, `maro-engine`, `engine-adapters`, `engine-hardening`

---

## 27. Real AI E2E still required

Before Engine LIVE or shadow promotion beyond observation:

- [ ] maroWeb Standard + maroBrain + maroFort + attachments
- [ ] Shadow comparison evidence in `engine_shadow_comparisons`
- [ ] maroImazh / maroLogo shadow (flags off, pipeline legacy)
- [ ] Provider cost reconciliation with real usage metadata
- [ ] Canary / rollback drill

---

## 28. Raiffeisen blockers

**BLOCKED — RAIFFEISEN DOCUMENTATION REQUIRED**

- `raiffeisen_live=false` frozen
- No webhooks, HMAC, refund API, or live callback handlers
- Test checkout + internal order architecture only

---

## 29. Final subsystem matrix

| Subsystem | Status |
|-----------|--------|
| RBAC / Access | READY FOR MANUAL E2E |
| MFA | READY FOR MANUAL E2E |
| Command Center | READY FOR MANUAL E2E |
| Commerce Admin | READY FOR MANUAL E2E |
| Creator commissions | READY FOR MANUAL E2E |
| Pricing snapshots | READY FOR MANUAL E2E |
| Provider cost ingestion | READY FOR MANUAL E2E |
| maroPresets / secrecy | READY FOR MANUAL E2E |
| Help Center CMS | READY FOR MANUAL E2E |
| Support Center | READY FOR MANUAL E2E |
| Notifications CMS | READY FOR MANUAL E2E |
| Analytics | READY FOR MANUAL E2E |
| Operations / budget guards | READY FOR MANUAL E2E |
| Data retention | READY FOR MANUAL E2E |
| Maro Engine admin | READY FOR MANUAL E2E |
| Engine LIVE cutover | BLOCKED |
| maroWeb shadow evidence | READY FOR REAL AI E2E |
| Raiffeisen live | BLOCKED |

---

## 30. Exact activation checklist

1. Apply migrations **0021–0026** on staging Supabase
2. Configure `CRON_SECRET` in production; verify Vercel cron invokes `/api/cron/data-retention`
3. Enroll TOTP for all Super Admin / Administrator / Developer accounts
4. Manual E2E: MFA gate, Commerce, Support, Help, Operations guards (disabled → warn test)
5. Run `GET /api/admin/analytics/validation` — confirm deltas ≈ 0 with test data
6. Execute test checkout → verify `pricing_snapshots` + ledger rows
7. Execute mock generation path (test env) → verify cost estimate + generation snapshot rows
8. Collect real maroWeb shadow traffic evidence (no Engine LIVE)
9. Complete Real AI E2E checklist (section 27)
10. Obtain Raiffeisen official integration documentation before any live payment flag change
11. Only then consider controlled activation — **do not set `prompt_compiler_v2=true` without explicit authorization**

---

**STOP — RC gap closure and non-AI validation complete.**

Do not activate Engine LIVE. Do not activate Raiffeisen live.
