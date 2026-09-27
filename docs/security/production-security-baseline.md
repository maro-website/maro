# Maro production security baseline

Operational reference for the Maro application security controls (not legal documentation).

## Auth and privileged access

- Supabase Auth for users; bearer tokens on API routes.
- Admin UI gated by middleware (`/admin`) plus layout MFA for privileged roles.
- Admin APIs require `requirePermission()` with RBAC (`super_admin`, `administrator`, `developer`, `editor`).
- Public signup intentionally disabled in production configuration.
- S1 migrations lock down sensitive RPCs and promo event inserts.

## Environment fail-closed (S2)

- Production denies protected operations without Supabase server config.
- `PAYMENT_MODE=live` disables test payment simulator regardless of other flags.
- Turnstile required only when signup is enabled in production.
- Cron routes require `CRON_SECRET` in production.

## Application attack surface (S3)

- Canonical JSON body limits on all cost-bearing AI routes via `readJsonBody()`.
- Upload validation: PNG/JPEG/WebP magic bytes, size caps, SVG sanitization for admin icons.
- Rate limiting fail-closed for cost-bearing operations in production.
- SSRF checks on outbound image URLs.
- Sharp runtime pinned to `>=0.35.0` for Next image optimization.

## Browser security (S4)

- Production CSP via `security-headers.mjs` / `next.config.mjs`.
- No `unsafe-eval` in production CSP.
- `X-XSS-Protection: 0` (obsolete filter disabled; CSP is canonical).
- AI-generated HTML rendered only in sandboxed iframes (`allow-scripts` only, no `allow-same-origin`).
- Inner preview document receives its own restrictive meta CSP.

## Storage model

- Bucket: `generations` (private by default after migration `0035`).
- Private user assets: `{user_id}/…` — not anonymously readable.
- Public prefixes: `public/…`, `admin-icons/…`, `admin-ads/…`.
- Explore publish copies private assets to `public/explore/{slug}/…`.
- DB stores `storage:generations/…` refs; APIs issue short-lived signed URLs for private assets.

## Payments (pre-integration)

- No card data collected or stored by Maro.
- `/pay/test` and `/api/payments/complete-test` blocked in production.
- Order pricing from server-side catalog only.
- RaiAccept integration is a separate bank-dependent phase.

## Dependency scanning

- GitHub Actions workflow `.github/workflows/security.yml` runs weekly and on PRs:
  `pnpm audit --prod`, lint, test, build.

## Manual infrastructure verification

These cannot be confirmed from repository code alone:

1. Production TLS certificate and HSTS at `https://maro.al`
2. Railway edge DDoS/WAF capabilities
3. Supabase backup/PITR plan settings in dashboard
4. Production environment variable values (secrets)

## Incident basics

- Rotate compromised keys in Supabase, AI providers, CRON_SECRET immediately.
- Disable affected admin accounts via RBAC.
- Review `generations` and audit tables for anomalous access patterns.
