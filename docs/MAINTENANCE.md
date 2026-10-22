# Temporary technical update maintenance

Enabled on 22 October 2026 by the owner's request to take Maro offline and display **Technical update coming soon**.

`MAINTENANCE_ENABLED` in `src/lib/maintenance.ts` is the single switch. The middleware closes pages to all visitors, including signed-in users and admins, before authentication. Pages respond with HTTP 503, the static maintenance message, `Retry-After: 300`, no-store and noindex. User APIs, MCP requests and non-read requests respond with HTTP 503 JSON before invoking their handlers. The API matcher also covers paths with asset extensions.

The response is deliberately self-contained: no app shell, provider, analytics, JavaScript or external requests. It uses the existing Mshelt brand palette and white Maro logo, with responsive typography. This independent page remains available without loading account or workspace state.

Existing cron and webhook handlers retain their own authentication and validation, including the exact Raiffeisen settlement webhook. This lets existing payments and job reconciliation settle while new user work is unavailable. No database, balance, customer asset or provider configuration changes are required.

Railway checks `GET /api/health`, which returns HTTP 200 and the maintenance boolean; public pages correctly remain 503. Keep this health path when reopening.

## Reopen

After reconciling any later production work, change `MAINTENANCE_ENABLED` to `false`, validate and publish to the existing `codex/raiaccept-payment-20261008` branch. Normal application routing resumes. Keep all customer data and previous release backups. Do not redeploy an old snapshot over newer work.

The production parent is `60e693e6308d81838b6ef018f5049a7e9cb6ff61`. Its source backup and validation evidence are in `../maintenance-20261022/`. Deployment uses the existing Railway WEB service only; no infrastructure or database changes.
