# Maro Control Center — Build Progress

**Strategy:** BUILD COMPLETE → FULL PLATFORM AUDIT → E2E VALIDATION → CONTROLLED ACTIVATION

**Status:** **CODE COMPLETE** (2026-08-16) — see `release-candidate-audit.md`

**Production freeze (unchanged):**
- `prompt_compiler_v2 = false`
- All live tools remain **legacy** for provider execution
- maroWeb may remain **shadow** for comparison only
- No Raiffeisen live behavior invented

---

## Completed

| Area | Status | Notes |
|------|--------|-------|
| Migration 0025 | ✅ | Support, commerce extensions, notifications, preset categories, operations |
| Engine provider adapters | ✅ | `src/lib/engine/adapters/*` — gated by `executeGate.ts` |
| Preset reveal | ✅ | API 410; UI guarded by `PRESET_REVEAL_DISABLED` |
| Command Center KPIs | ✅ | `/admin` dashboard |
| Commerce Admin | ✅ | `/admin/commerce/*` + audited APIs |
| Operations | ✅ | Audit, logs, kill switches |
| Support Center | ✅ | Tickets + refund records API |
| Notifications CMS | ✅ | Campaign CRUD |
| Analytics | ✅ | Platform overview aggregates |
| maroPresets categories | ✅ | `/admin/presets/categories` |
| Imazh/Logo shadow prep | ✅ | Feature flags + policy; pipelines legacy |
| Legacy admin decomposition | ✅ Partial | Dedicated routes; legacy `?tab=` retained |
| Release Candidate Audit | ✅ | `release-candidate-audit.md` |
| Tests | ✅ 64 passing | |
| Build | ✅ Passes | |

---

## Not production validated (by design)

- Engine LIVE cutover
- Raiffeisen live payments
- maroWeb shadow evidence from real traffic
- MFA enforcement for admin sessions
- Help articles CMS UI
- Provider cost estimate ingestion
- Checkout pricing snapshot writes

---

Apply **`0025_control_center_build.sql`** before using new Control Center tables.
