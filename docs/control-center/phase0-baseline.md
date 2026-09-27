# Maro Control Center — Phase 0 Migration Baseline

Generated during Phase 0 implementation. Review before applying migration `0021_control_center_foundation.sql`.

## Current migration chain

Applied in order (`supabase/migrations/`):

1. `0001_init.sql` — profiles, app_settings, generations, is_admin bootstrap
2. `0002_fix_rls_recursion.sql`
3. `0003_ai_hub.sql` — tool_prompts
4. `0004_explore_orders.sql` — credit_orders
5. `0005_prompt_events.sql` — analytics events (RLS, no public policies)
6. `0006_creators_promos.sql` — creators, promo_codes, promo_events
7. `0007_sync_favourites.sql`
8. `0008_reports.sql`
9. `0009_marofort.sql` — fort_config
10. `0010_maro_prompts.sql`
11. `0011_abuse_protection.sql` — credit_transactions, generation_jobs, platform_limits
12. `0012_settings_rls.sql`
13. `0013_tool_option_icons.sql`
14. `0014_payments_maro_plan.sql` — fulfill_credit_order, maro_plan
15. `0015_multi_studio.sql`
16. `0016_workspaces.sql`
17. `0017_workspace_scoping.sql`
18. `0018_workspace_signup.sql`
19. `0019_workspace_brand.sql`
20. `0020_workspace_brain.sql`

**Phase 1 adds:** `0021_control_center_foundation.sql` (additive only)

## Production schema assumptions

- Single-row `app_settings` (`id = 1`) holds: `master_prompt`, `tool_prompts`, `pricing`, `fort_config`, `platform_limits`, `tool_option_icons`
- Admin access today: `profiles.is_admin = true` (will gain `access_role` without removing `is_admin`)
- Credits: `profiles.credits` + `credit_transactions` ledger via RPCs
- Payments: `credit_orders` + `fulfill_credit_order`; live Raiffeisen webhook **not implemented**

## app_settings rollback snapshot

Before Phase 1 migrations, export settings from Supabase SQL editor:

```sql
select id, master_prompt, tool_prompts, pricing, fort_config, platform_limits, tool_option_icons, updated_at
from public.app_settings
where id = 1;
```

Store result as JSON in a secure location (not committed to git if it contains sensitive prompt text).

## Phase 1 migration impact

| Change | Risk | Rollback |
|--------|------|----------|
| `profiles.access_role` | Low — backfills from `is_admin` | Set column null; trigger removed in down migration |
| `audit_events` | None — new table | Drop table |
| `feature_flags` | None | Drop table |
| `product_events` | None | Drop table |
| `prompt_events` admin SELECT policy | Low | Drop policy |
| `admin_adjust_credits` RPC | Low | Replace with previous function drop |

## Do not modify

Historical files `0001`–`0020` must not be edited on environments where already applied.
