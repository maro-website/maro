# 1. EXECUTIVE VERDICT

**NOT READY**

**Raiffeisen RISK Readiness Score: 45/100**

Audit date: 1 September 2026 (Europe/Berlin). Scope: the exact local working tree on branch `feat/maroweb-visual-editor-phase2` at commit `2db574...`, including the pre-existing modified and untracked launch/login-ad work; the deployed public behavior of `maro.al`; repository history/configuration; application routes; Supabase migrations; storage; authentication; merchant/legal pages; and the available automated checks. No application code, migrations, production data, or payment behavior was changed by this audit.

The application has several strong foundations: HTTPS redirection, a trusted certificate, HSTS and a substantive CSP, server-verified bearer authentication on sensitive APIs, centralized admin RBAC with MFA for the three most privileged roles, fail-closed production test-payment behavior, private-by-default user media, raster magic-byte checks, transactional credit controls, weekly CI security checks, and a clean production dependency audit. The repository and searched git history did not reveal a known committed secret or any storage of PAN, CVV/CVC, card expiry, or other card-authentication data.

Submission is nevertheless premature. The live edge still negotiates TLS 1.0 and 1.1; an authenticated image-generation flow performs insufficiently constrained server-side URL fetches; Explore publication can copy a private object without proving source ownership; two operational database tables are created without RLS or explicit client privilege revocation; all unauthenticated merchant/legal routes are presently rewritten to the coming-soon page; and the legal pages contain unresolved merchant facts and cross-jurisdiction/commerce contradictions.

The score is deliberately conservative. It reflects technical controls that are demonstrably present, but gives no credit for provider settings, production database state, cookie attributes, privileged-account hygiene, or legal facts that could not be independently verified.

# 2. BLOCKERS

| Blocker | Finding | Evidence | Why it blocks submission | Required exit condition |
|---|---|---|---|---|
| B-01 | The live Cloudflare edge accepts TLS 1.0 and TLS 1.1 as well as TLS 1.2/1.3. | Direct TLS negotiation against `maro.al` on 1 September 2026; HTTP does redirect to HTTPS and the certificate is trusted. | Raiffeisen's explicit target is TLS 1.2+. | Set Cloudflare Minimum TLS Version to 1.2 or higher, deploy, and independently retest that TLS 1.0/1.1 fail while TLS 1.2/1.3 succeed. |
| B-02 | Authenticated SSRF and memory-denial risk in workspace image references. A user can persist an arbitrary URL in workspace brain/source data, after which the image API checks only the URL text and buffers the full response without timeout, DNS/private-IP enforcement, byte cap, or raster verification. | `src/lib/workspaces/brainService.ts:75-101`, `src/lib/workspaces/brainService.ts:139-181`, `supabase/migrations/0016_workspaces.sql:15-20`, `supabase/migrations/0020_workspace_brain.sql:20-25`, `src/app/api/ai/image/route.ts:291-330`, `src/lib/security/ssrf.ts:39-75`. | It can reach internal/link-local services through DNS resolution/rebinding and can exhaust server memory with a large response. | Accept only caller-owned canonical storage references, or add DNS-resolved/pinned public-IP enforcement, redirect denial, an abort timeout, streaming byte limit, allowed content type, raster signature validation, and regression tests. |
| B-03 | Explore publication lacks source-object ownership authorization. `publishStoredUrlToExplore` accepts a storage ref/signed URL, downloads with the service role, and copies it to the public bucket without receiving or checking the caller's user ID. | `src/app/api/explore/route.ts:107-149`, `src/lib/storage/assets.ts:132-168`. | An authenticated user who learns another private object path can cause that object to be published publicly; arbitrary external HTTP image URLs are also accepted. | Resolve the source as a private reference owned by the authenticated user, restrict allowed bucket/path prefixes, reject arbitrary external URLs, and test cross-user paths. |
| B-04 | `rate_limit_events` and `platform_spend_rollup` are the only repository-created `public` tables without RLS; the migrations also do not explicitly revoke `anon`/`authenticated` privileges. | `supabase/migrations/0011_abuse_protection.sql:150-175`; repository-wide create-table/RLS comparison. | Under normal Supabase public-schema grants, direct PostgREST access could expose or manipulate abuse counters and spend data, including weakening application rate limits. Actual production grants were not available to disprove this. | Enable RLS with no client policies and explicitly revoke `anon`/`authenticated` table/sequence privileges; apply and verify in the real project. |
| B-05 | Terms, privacy, refund, pricing, contact, and other merchant pages are not publicly usable in the deployed controlled-release configuration. Anonymous requests return 200 only because middleware rewrites every page to `/coming-soon`, with `noindex, nofollow`. | Live responses on 1 September 2026; `src/lib/launch/config.ts:3-33`, `src/middleware.ts:104-120`. | Raiffeisen cannot inspect the merchant, service, price, currency, refund, privacy, or support information at the submitted domain. | Exempt the approved merchant/legal paths from the launch gate or switch the production gate to live, then verify each URL anonymously. |
| B-06 | Merchant/legal content is not ready to attest as accurate: the phone is a placeholder; a Kosovo entity's privacy/refund text cites Albanian law/authority and Albania transfer context; the refund policy describes a recurring maroFort subscription/monthly credits while pricing says one-time 30-day plans without auto-renewal; and legal text presents Raiffeisen hosted checkout as current even though integration is not live. | `src/components/legal/legal-config.ts:1-14`, `src/app/legal/privacy/page.tsx:12-15`, `src/app/legal/privacy/page.tsx:46`, `src/app/legal/privacy/page.tsx:80-103`, `src/app/legal/refund/page.tsx:98-103`, `src/app/legal/refund/page.tsx:126-130`, `src/app/legal/terms/page.tsx:54-83`, `src/app/pricing/page.tsx:116-118`, `src/app/pricing/page.tsx:246-258`. | Inaccurate identity, jurisdiction, payment-flow, and renewal statements are material merchant-onboarding defects. | **OWNER INPUT REQUIRED:** confirm the legal entity facts, phone, applicable Kosovo law/authority, product/renewal model, fulfillment/refund terms, and pre-integration payment wording; obtain counsel/merchant-owner approval and publish the corrected pages. |

No blocker was found for local storage of sensitive card data or for a known critical/high production dependency advisory.

# 3. RAIFFEISEN 10-POINT MATRIX

| ID | Requirement | Status | Evidence | Gap | Action |
|---|---|---|---|---|---|
| RISK-01 | SSL/TLS | **FAIL** | `http://maro.al/` redirects to HTTPS; trusted certificate for `maro.al`; HSTS is live; production app origin requires HTTPS in `src/lib/config/appOrigin.ts`; CSP upgrades insecure requests. | Live TLS 1.0 and 1.1 negotiation succeeds. Auth-cookie flags were not observable without a real login. | Raise edge minimum to TLS 1.2, retest protocols/certificate/redirect, and inspect real auth `Set-Cookie` flags. |
| RISK-02 | Firewall / DoS / DDoS | **PARTIAL** | Live traffic is behind Cloudflare and hosted on Railway (**PROVIDER-MANAGED**); Supabase protects database/auth/storage (**PROVIDER-MANAGED**). Generation and upload routes use database-backed strict limits; signup/reset/waitlist and cron/webhook flows have dedicated controls. | WAF/bot rules, origin shielding, provider plan, and trusted proxy configuration are unknown. The middleware limiter is per-process memory and trusts forwarded IP headers (`src/middleware.ts:153-168`), so it is not a distributed DDoS control. Several JSON/webhook routes lack local size limits. | Verify Cloudflare WAF/bot/DDoS and Railway origin exposure; ensure only trusted proxy headers reach the app; keep DB-backed limits; standardize body caps. |
| RISK-03 | Payment data / PCI boundary | **PASS** | Repository/schema/log/storage search found no accepted or stored PAN, CVV/CVC, expiry, track data, or card-authentication secret. `credit_orders` stores amount, currency, status, provider/reference, billing identity, and provider transaction ID (`supabase/migrations/0004_explore_orders.sql:28-43`, `supabase/migrations/0014_payments_maro_plan.sql:16`, `supabase/migrations/0038_commerce_ledger_and_fulfillment.sql:13-17`). Production test fulfillment is impossible (`src/lib/payments/testMode.ts:10-18`). | The future Raiffeisen implementation does not yet exist and must preserve this boundary. A static test simulator visually displays fake card placeholders, but does not accept/transmit/store card data. | Use only the bank-approved hosted/tokenized flow; never add local card fields or logs; document PCI responsibility with Raiffeisen before go-live. |
| RISK-04 | Software / dependency patching | **PASS** | `pnpm audit --prod --json`: 0 critical, high, moderate, low, or info advisories across 131 production/optional dependencies. Next 15.5.23, React 19.2.7, pnpm 11.0.8; CI targets Node 22. | Audit workstation used Node 24.15.0; production runtime version is unverified. Newer direct packages exist, including major upgrades that need planned compatibility testing. | Pin/verify production Node 22, review security-sensitive patch releases monthly, and plan major upgrades separately. |
| RISK-05 | File upload security / malware | **PARTIAL** | User/admin raster paths authenticate, cap size, verify PNG/JPEG/WebP signatures and claimed MIME, generate names, and constrain storage paths. Private user bucket policies exist. SVG is admin-only and filtered. | No antivirus/malware scanning exists. Audio input trusts only a `data:audio/` prefix. The workspace remote-reference fetch is unsafe. SVG filtering is regex-based rather than parser/re-encode isolation. | Fix the SSRF blocker; validate audio bytes/formats; add malware scanning/quarantine appropriate to risk; harden or eliminate active SVG. |
| RISK-06 | Admin / management email compromise | **PARTIAL** | Central RBAC checks verified bearer tokens and permissions (`src/lib/admin/auth.ts:30-85`). Super admin, administrator, and developer require AAL2 MFA (`src/lib/admin/mfaPolicy.ts:3-10`). Role changes are audited and super-admin assignment is restricted (`src/app/api/admin/users/role/route.ts:11-89`). | Privileged people/accounts and provider-dashboard MFA/breach status are not discoverable. Editor can enter admin and manage presets/notifications/help without mandatory MFA. Migrations contain a hard-coded privileged bootstrap identity. | **MANUAL OPERATIONAL CHECK:** inventory accounts, require MFA everywhere, check authorized emails with HIBP, remove stale access, replace hard-coded bootstrap with controlled provisioning. |
| RISK-07 | Monthly vulnerability scanning | **PASS** | `.github/workflows/security.yml:3-26` runs weekly and on PR/main changes: frozen install, production dependency audit, lint, tests, build. Weekly exceeds the monthly cadence. | No repository evidence of Dependabot/Renovate, CodeQL/SAST, secret scanning enforcement, external DAST, or an owner who reviews failed scheduled runs. | Confirm scheduled Actions are enabled/monitored; add Dependabot and CodeQL or equivalent; run a small authenticated/external scan before submission and at least monthly. |
| RISK-08 | HTTP security headers | **PARTIAL** | Live and configured: HSTS, CSP, `nosniff`, strict referrer policy, restrictive permissions policy, frame blocking, and `X-XSS-Protection: 0` (`security-headers.mjs:20-79`). | CSP permits `script-src 'unsafe-inline'`; COOP and CORP are absent. Provider behavior must be checked on every response class. | Move executable inline script to nonce/hash, add compatible COOP/CORP, retain modern CSP/frame controls, and do not enable obsolete `X-XSS-Protection: 1`. |
| RISK-09 | CSRF | **PARTIAL** | Sensitive custom APIs use caller-supplied Authorization bearer tokens and server-side identity/ownership checks, so browsers do not attach the credential cross-site automatically. No wildcard CORS or permissive credentialed CORS was found. | Real Supabase cookie `Secure`/`HttpOnly`/`SameSite` attributes were not observed; there is no systematic Origin/Referer enforcement for any future cookie-authenticated mutation. | Verify cookie attributes in production. Keep mutations bearer-only, or add Origin/Referer plus CSRF tokens before introducing cookie-authenticated state changes. |
| RISK-10 | User input validation | **FAIL** | Good controls exist for request caps on high-cost AI/upload routes, manual bounding, query-builder database access, safe redirect helpers, owner filters, thumbnail network interception, and centralized RBAC. No raw SQL/command execution injection was found in application inputs. | B-02 SSRF/unbounded fetch; B-03 storage IDOR; unescaped billing data in invoice HTML; inconsistent JSON size limits; weak audio validation; `resolve_workspace_limit` can be called for another user's ID; no consistent schema library. | Fix B-02/B-03 before submission; escape invoice output; restrict RPC; apply bounded schema validation and authorization at every trust boundary. |

# 4. PUBLIC WEBSITE / MERCHANT READINESS

The repository contains merchant pages, but public usability was tested against the deployed anonymous experience. On 1 September 2026, each tested merchant URL returned the coming-soon document through an internal middleware rewrite, not the requested content. A 200 status therefore does not constitute availability.

| # | Requirement | Status | Repository/deployed evidence | Gap or owner action |
|---|---|---|---|---|
| 1 | Terms & Conditions | **FAIL** | Content exists at `src/app/legal/terms/page.tsx`; anonymous `/legal/terms` is rewritten. | Publish it and correct pre-integration checkout wording. |
| 2 | Privacy Policy | **FAIL** | Content exists at `src/app/legal/privacy/page.tsx`; anonymous `/legal/privacy` is rewritten. | Publish; replace Albania-specific law/authority/transfer language with owner/counsel-confirmed Kosovo wording. |
| 3 | Refund / Cancellation Policy | **FAIL** | Content exists at `src/app/legal/refund/page.tsx`; anonymous `/legal/refund` is rewritten. | Publish; reconcile maroFort subscription/monthly-credit statements with the actual one-time model and applicable jurisdiction. |
| 4 | Pricing information | **FAIL** | `src/app/pricing/page.tsx` shows EUR and one-time 30-day plans in source; anonymous `/pricing` is rewritten. | Publish the exact saleable catalog before bank review. |
| 5 | Contact information | **FAIL** | Contact emails/address exist, but `LEGAL_ENTITY.phone` is a placeholder and anonymous `/contact` is rewritten. | **OWNER INPUT REQUIRED:** supply and verify a working business phone and publish the page. |
| 6 | Business / merchant identity | **PARTIAL** | Legal name, NUI/NRB and Kosovo address are configured in `src/components/legal/legal-config.ts:1-14`. | Not publicly reachable in the deployed gate; independent registry accuracy not verified. **OWNER INPUT REQUIRED.** |
| 7 | Description of services | **FAIL** | Terms and marketing source describe AI generation services. | The public domain exposes only coming-soon, so a reviewer cannot understand the purchased service. |
| 8 | Currency displayed clearly | **FAIL** | Repository pricing and order schema use EUR. | Currency is not visible anonymously on the deployed site. |
| 9 | Subscription terms | **PARTIAL** | Pricing/terms say one-time 30-day plans and no mandatory monthly subscription. | Refund text separately describes a maroFort subscription; identify which model is true. |
| 10 | Renewal terms | **PARTIAL** | Pricing says no automatic renewal and explains a manual renewal window (`src/app/pricing/page.tsx:246-258`). | Hidden in production and contradicted by refund cancellation language. |
| 11 | Cancellation mechanism / explanation | **PARTIAL** | If all paid plans are one-time with no auto-renewal, recurring cancellation is not required. | State this consistently; remove or implement any claimed recurring cancellation flow. |
| 12 | Refund eligibility explanation | **PARTIAL** | Refund categories and contact flow exist in source. | Policy is hidden and contains jurisdiction/product contradictions. |
| 13 | Digital delivery / fulfilment | **PARTIAL** | Terms describe credit-based access and AI outputs; server fulfillment is transactional/idempotent. | Publish a plain statement of when credits/access and generated digital content are delivered. |
| 14 | Customer support channel | **FAIL** | Support/contact emails are configured. | Pages are hidden; verify mailbox ownership, response process, and phone. |
| 15 | Required NICE/merchant information | **PARTIAL** | Repository has legal identity, NUI/NRB and address fields. | Bank form facts, registry accuracy, authorized signatory, transaction profile, phone, tax/VAT treatment, and relationship between maro and NICE are **OWNER INPUT REQUIRED**. |

Additional inconsistencies:

- The privacy page says an account can be deleted through account options (`src/app/legal/privacy/page.tsx:107-110`), but the account UI only instructs the user to email support (`src/app/account/page.tsx:408-425`).
- The legal pages describe Raiffeisen hosted checkout as an existing processor even though this is a pre-integration audit. Until integration is approved and enabled, the wording must describe an intended future flow or say payments are unavailable.
- Legal review is outside this technical audit; no jurisdictional fact should be submitted merely because it appears in source code.

# 5. AUTHENTICATION & AUTHORIZATION

**Model observed.** Supabase Auth manages registration/login/recovery/session refresh. Client code obtains the Supabase access token and sends it as an `Authorization: Bearer` value to custom state-changing APIs. Server routes derive identity from the verified token rather than accepting `user_id` from the body. Supabase cookies support server-rendered page sessions; the service-role client is imported through server-only modules.

**Positive controls**

- Registration is server-mediated, size-bounded, rate-limited, Turnstile-protected, and creates an unconfirmed account (`src/app/api/auth/signup/route.ts:35-68`). Generation rechecks `email_confirmed_at` server-side (`src/lib/generation/orchestrator.ts:149-191`).
- Login uses Supabase `signInWithPassword` (`src/context/store.tsx:314-321`). Password verification, session issuance, refresh-token behavior, credential storage, and base login throttling are therefore **PROVIDER-MANAGED**; the dashboard settings were not available.
- Forgot-password replies are generic and rate-limited, reducing enumeration (`src/app/api/auth/forgot-password/route.ts:14-43`). Reset uses Supabase's recovery session. Safe application-origin construction prevents production HTTP/local origin fallback in `src/lib/config/appOrigin.ts`.
- Generation authorization verifies identity, profile status, email verification, budget/circuit controls, prompt/attachment limits, strict per-user/per-IP limits, concurrency, and transactional credit reservation (`src/lib/generation/orchestrator.ts:160-240` and following credit/job controls).
- Admin API authorization is not UI-only: every reviewed admin mutation uses `requirePermission`, which verifies the token, resolves a stored role, checks MFA policy, and checks a specific permission (`src/lib/admin/auth.ts:57-85`; `src/lib/admin/permissions.ts:13-126`). Admin pages are also gated by middleware/layout.
- Payment order creation, lookup, cancellation and invoice access require bearer identity and filter by the authenticated user's ID (`src/lib/payments/auth.ts:4-12`, `src/app/api/payments/create-order/route.ts`, `src/lib/payments/orders.ts`). Test completion is blocked in all production modes.

**Findings**

- **P0 / IDOR:** Explore publication does not authorize the source storage object; see B-03.
- **P1 / recovery protection:** forgot-password verifies Turnstile only when it is both required *and* configured (`src/app/api/auth/forgot-password/route.ts:45-50`). If production requires Turnstile but the secret is missing, the route skips the check instead of failing closed. It also uses unbounded `req.json()` at lines 32-36.
- **P1 / MFA scope:** editor is an admin-entry role with content/notification privileges but is excluded from `PRIVILEGED_MFA_ROLES` (`src/lib/admin/mfaPolicy.ts:3-10`, `src/lib/admin/permissions.ts:91-97`). Require MFA for every admin role.
- **P1 / bootstrap privilege:** multiple migrations' new-user trigger contains a hard-coded administrative identity and grants exceptional credits/admin status (for example `supabase/migrations/0001_init.sql:110-126`; later trigger replacements preserve the behavior). Do not publish the identity in audit output. Replace email-based bootstrap with an explicit, audited provisioning process after verifying current privileged accounts.
- **P1 / account deletion:** there is no self-service deletion API. The UI asks the user to contact support (`src/app/account/page.tsx:408-425`). This may be acceptable operationally only if documented, authenticated, timely, and reconciled with retention/legal obligations.
- **P1 / error disclosure:** some routes return internal provider/database messages, including `src/app/api/admin/users/role/route.ts:67-75`, `src/app/api/ai/edit/route.ts:91-104`, `src/app/api/ai/edit-html/route.ts:148-166`, and `src/app/api/workspaces/route.ts`. Map these to generic user errors and retain sanitized details only in restricted logs.
- **Manual check:** inspect live auth cookies for `Secure`, `HttpOnly` where applicable, and an appropriate `SameSite`; verify refresh-token rotation/reuse detection, password policy, login rate limits, email-confirmation lifetime, session timeout, logout revocation, and MFA recovery in the actual Supabase project.

No reviewed API was found to authorize a sensitive action solely from a client-supplied `user_id`, and no service-role secret was found in client-exposed environment names or browser code.

# 6. DATABASE / RLS

**Coverage and ownership**

- Most user-sensitive tables explicitly enable RLS and use `auth.uid()` ownership or admin predicates. Examples include workspaces (`supabase/migrations/0016_workspaces.sql:15-20`), workspace sources (`supabase/migrations/0020_workspace_brain.sql:20-25`), credit orders (`supabase/migrations/0004_explore_orders.sql:28-43`), storage usage (`supabase/migrations/0011_abuse_protection.sql:178-190`), and control-center/security tables (`supabase/migrations/0025_control_center_build.sql`). Foreign keys generally bind owner/user rows to `auth.users` and define cascade/set-null behavior.
- The private `generations` storage bucket is explicitly set non-public; authenticated read policy requires the first path segment to equal `auth.uid()`; there are no client write policies (`supabase/migrations/0035_storage_access_model.sql:4-33`). The `maro-public` bucket is intentionally public for published/catalog assets (`supabase/migrations/0042_platform_notifications_and_media.sql:41-47`).
- Payment/credit functions are designed for service-role use and idempotent fulfillment. Repository tests verify RPC privilege lockdown (`src/lib/__tests__/rpc-privilege-lockdown.test.ts`), and migrations `0032_lock_down_sensitive_rpc_privileges.sql` / `0033_minimize_trigger_function_privileges.sql` harden many functions. The provided verification SQL still must be run against production.

**Findings**

- **P0:** `rate_limit_events` and `platform_spend_rollup` lack RLS and explicit client privilege revocation; see B-04. A repository-wide comparison of every `create table public.*` against every `enable row level security` statement found exactly these two exceptions.
- **P1:** `public.resolve_workspace_limit(p_user_id)` is `SECURITY DEFINER` and executable by `authenticated` without requiring `p_user_id = auth.uid()` (`supabase/migrations/0041_workspace_entitlement.sql:3-55`, `:88-90`). This exposes another user's effective workspace limit/plan signal. Restrict it to service role or enforce caller identity.
- **P1:** workspace owner policies permit owners to set arbitrary `brain_profile`, `brand_logo_url`, and `workspace_sources.file_url` values (`supabase/migrations/0016_workspaces.sql:15-20`, `supabase/migrations/0020_workspace_brain.sql:20-25`). That becomes a server trust-boundary failure when the image API fetches those values. Database checks should constrain them to owned storage references, in addition to the server fix.
- **P1 / privacy:** generation logging stores user email, raw user prompt, and a final-prompt field (`src/lib/supabase/server.ts:479-503`). Debug metadata has a 90-day cleanup policy (`src/lib/operations/retention.ts:37-103`), but the audit did not find equivalent automatic minimization of the main `generations.prompt` content. Establish purpose, access, retention, export, and deletion rules for private prompts/outputs.
- **Manual:** repository migrations are assumptions, not proof of the live schema. Compare migration history to the actual project; inspect table/sequence/function grants to `anon` and `authenticated`; run the RPC privilege verification; test RLS as anonymous, user A, user B, admin, and service role; inspect backups/PITR; and verify storage bucket policies directly.

# 7. FILE UPLOAD SECURITY

Shared raster validation is materially good: it restricts data URLs to PNG/JPEG/WebP, decodes base64, enforces decoded byte limits, verifies magic bytes against claimed MIME, derives the extension from detected bytes, sanitizes prefixes/user components, and creates time/randomized names (`src/lib/security/uploadValidation.ts:3-19`, `:34-63`, `:97-136`). No traditional user filename is used as a storage path. There is no repository evidence of antivirus, sandbox detonation, or an external malware scanner.

| Upload/input surface | Auth & authorization | Type/size/path/storage controls | Classification | Gap/action |
|---|---|---|---|---|
| Avatar: `POST /api/avatar` | Bearer user; per-user/IP rate limit. | Bounded JSON; raster signature/MIME; 5 MiB; generated name; intentional public avatar prefix (`src/app/api/avatar/route.ts:23-60`). | **PARTIAL** | No malware scan or pixel/dimension/decompression limit; public exposure is intentional and must be documented. |
| Workspace/business assets: `POST /api/workspaces/assets` | Bearer user plus workspace owner query. | Bounded body; 5 MiB raster validation; owner-prefixed private path (`src/app/api/workspaces/assets/route.ts:22-59`). | **PARTIAL** | No malware scan/image re-encode. Do not later trust associated free-form URLs. |
| Project/maroWeb assets and image references: `POST /api/projects/assets` | Bearer user; per-user/IP limit; caller prefix. | Prepare/finalize signed upload; 5 MiB normal or 25 MiB reference; MIME allowlist; generated path; actual object size; server download/magic validation; invalid oversized objects removed; 500 MiB quota (`src/app/api/projects/assets/route.ts:32-168`). | **PARTIAL** | No malware scan/dimension limit. A private unvalidated object can exist between prepare/finalize; add orphan cleanup/quarantine and never consume before finalize. |
| Inline image references: `POST /api/ai/image` | Generation bearer/entitlement controls. | Inline images and owned `storage:generations/...` references are bounded/validated (`src/app/api/ai/image/route.ts:270-289`). | **FAIL** | Workspace/matched-source remote URLs use the unsafe fetch in B-02; fix before submission. |
| Workspace source records / brand logo URLs | Direct Supabase browser writes allowed to the owning row. | RLS enforces owner ID but not URL form (`src/lib/workspaces/brainService.ts:75-101`, `:139-181`). | **FAIL** | Permit only canonical caller-owned storage refs; do not treat an RLS-authorized string as a safe fetch target. |
| User audio input: `POST /api/ai/audio` | Generation preparation authenticates and enforces credits/rate limits. | JSON body cap exists; client UI limits file size. Server only checks that the string starts `data:audio/` (`src/app/api/ai/audio/route.ts:54-79`). | **FAIL** | Decode on server, cap decoded bytes, allow exact formats, verify signatures/container, reject polyglots, and scan or isolate before forwarding. |
| Admin banners/login ads: `POST /api/admin/ad-upload` | `notifications.manage`; MFA where role policy requires it. | Bounded JSON; 8 MiB raster signature/MIME; generated public `admin-ads` name (`src/app/api/admin/ad-upload/route.ts:13-40`). | **PARTIAL** | No malware scan/re-encode; require MFA for editor if that role holds this permission. |
| Admin preset previews: `POST /api/admin/presets/upload` | `presets.manage`; MFA only for roles in MFA policy. | Bounded JSON; 8 MiB raster signature/MIME; generated intentional public name (`src/app/api/admin/presets/upload/route.ts:10-29`). | **PARTIAL** | No malware scan/re-encode; public catalog exposure is intentional. |
| Admin option icons: `POST /api/admin/icon-upload` | `engine.manage`; central admin check. | 512 KiB; generated name; blocks scripts, foreign objects, embeds, event handlers, external hrefs and active schemes (`src/app/api/admin/icon-upload/route.ts:10-36`, `src/lib/security/uploadValidation.ts:187-262`). | **PARTIAL** | Regex sanitization is weaker than a maintained SVG parser/sanitizer. Prefer a fixed icon library or rasterize/re-encode before public delivery; serve with safe MIME/CSP/nosniff. |
| AI-provider generated image/audio output | Server provider response, not direct user upload. | Generated image magic/size checked; generated audio has size/minimum-length only (`src/lib/security/uploadValidation.ts:164-184`). | **PARTIAL** | Add real audio container/signature validation and provider-output dimension/decompression checks. |

Storage overwrite/path traversal is generally controlled through generated names, canonical user prefixes, and `..` rejection on finalize. Public media cannot execute as server code in object storage, but SVG/HTML-like content can remain browser-active if served with an unsafe content type; keep `nosniff`, restrictive CSP, and a non-executable allowlist.

# 8. SECURITY HEADERS

The live responses tested for `/`, legal pages, pricing, and contact included HSTS, CSP, `X-Content-Type-Options`, referrer policy, permissions policy, and frame denial. These results were Cloudflare-fronted coming-soon responses; retest all normal pages, APIs, auth callbacks, public storage, and preview runtime after the launch gate changes.

| Header/control | Current evidence | Recommended state | Assessment |
|---|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` in source and live (`security-headers.mjs:62-64`). | Retain after confirming every subdomain is HTTPS and fixing minimum TLS. | Present; TLS protocol blocker remains. |
| `Content-Security-Policy` | Strong baseline: `default-src 'self'`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, scoped connect/media/frame, production upgrade (`security-headers.mjs:20-38`). Production script policy still includes `'unsafe-inline'` (`:13-18`). | Remove executable inline allowance using nonces/hashes; keep development-only `unsafe-eval` out of production; add CSP reporting after privacy review. | Partial. |
| `X-Content-Type-Options` | `nosniff` in source/live (`security-headers.mjs:68-70`). | Retain on app and storage responses. | Present. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` in source/live. | Retain, or choose stricter `no-referrer` if product analytics allow. | Present. |
| `Permissions-Policy` | Camera, microphone, geolocation, payment, USB, sensors and other capabilities disabled (`security-headers.mjs:41-54`). | Retain; explicitly open only a feature that is genuinely needed. | Present. Note that future hosted checkout may need a narrowly scoped payment/frame review. |
| Frame protection | CSP `frame-ancestors 'none'` plus `X-Frame-Options: DENY`. Preview runtime has a separate sandboxed design. | Retain; CSP is authoritative modern protection. | Present. |
| `Cross-Origin-Opener-Policy` | Not configured. | Add `same-origin` where compatible; test OAuth/payment popups and preview/editor behavior. | Missing. |
| `Cross-Origin-Resource-Policy` | Not configured. | Add an appropriate `same-origin`/`same-site` policy to app documents/assets; intentionally public object responses may require `cross-origin`. | Missing. |
| XSS protection | `X-XSS-Protection: 0`. | Keep disabled. The legacy filter is obsolete and has had security problems; modern CSP, output encoding, MIME correctness, and input handling are the correct controls. | Raiffeisen intent is partially met by modern controls, but CSP inline script and invoice output gaps remain. |
| Cache control | Sensitive prefixes and launch-gated content are configured `private, no-store`. | Verify auth/payment/admin/API responses; do not cache tokens or private JSON at Cloudflare. | Good source evidence; live edge rules need manual verification. |

# 9. CSRF ANALYSIS

Traditional synchronizer CSRF tokens are not automatically required for maro's principal custom API model. State-changing payment, generation, upload, user, and admin calls send an explicit Supabase access token in the `Authorization` header. A cross-site form cannot set that header, and cross-origin JavaScript cannot read the token; an `Authorization` request also triggers CORS preflight. No wildcard origin or credentialed permissive CORS response was found. The server still verifies the token and derives the user before mutation.

Supabase session cookies are used for server-rendered navigation/auth callback behavior, but reviewed sensitive mutations do not rely solely on ambient cookies. Admin page middleware/layout checks are defense in depth; admin API mutations independently require a bearer token and RBAC. The auth callback handles a one-time provider code/token and constrains redirects rather than accepting an arbitrary state-changing form.

Residual requirements:

- Inspect a real production login/refresh/logout response. Confirm auth cookies are `Secure`, appropriately `HttpOnly`, and `SameSite=Lax` or stricter unless a documented cross-site flow needs `None; Secure`.
- Preserve same-origin CORS defaults. If an allowed-origin list is introduced, never combine reflected arbitrary origins with credentials.
- If any future route mutates account, credits, orders, subscriptions, admin data, or generation state based only on cookies, require a trusted `Origin` (with carefully handled `Referer` fallback) and a CSRF token. Payment webhooks require signatures and replay/idempotency controls, not browser CSRF tokens.
- Add automated negative tests that submit cookie-only cross-site-style mutations to critical routes and confirm rejection.

No presently exploitable CSRF affecting account, credits, admin, generation, or payment order state was demonstrated. The status remains PARTIAL because the actual cookie attributes/provider configuration were not observable and there is no centralized future-proof origin policy.

# 10. DEPENDENCY SECURITY

**Runtime and package inventory**

- Audit workstation: Node `v24.15.0`; CI declaration: Node `22`; package manager: pnpm `11.0.8`.
- Framework/runtime libraries: Next `15.5.23`, React/React DOM `19.2.7`.
- Security-sensitive direct libraries include `@supabase/ssr 0.12.3`, `@supabase/supabase-js 2.110.6`, `@anthropic-ai/sdk 0.111.0`, `openai 6.47.0`, `puppeteer-core 25.8.0`, `sharp 0.35.3`, `resend 6.20.0`, and `standardwebhooks 1.0.0`.

| Command/check | Result |
|---|---|
| `pnpm audit --prod --json` | **PASS:** 0 info, low, moderate, high, or critical advisories; 131 production/optional dependencies audited. |
| `pnpm outdated --format json` | Newer releases exist. Security-sensitive patch/minor candidates include Supabase, Puppeteer, Resend, Standard Webhooks, Anthropic and Sharp. Major lines are available for Next, OpenAI, Framer Motion, Tailwind and others; no blind upgrade was made. Exit code 1 is the command's normal “outdated packages found” result. |
| `node_modules/.bin/tsc.CMD --noEmit` | **PASS.** The first `pnpm exec tsc --noEmit` attempt did not resolve `tsc` despite the local binary being installed; the direct local binary completed cleanly. Add a stable `typecheck` package script. |
| `pnpm lint` | **PASS with one warning:** `src/components/app/cards.tsx:491` has missing `useEffect` dependencies. `next lint` is deprecated and must be migrated before Next 16. |
| `pnpm test` | **NOT CLEAN:** 51/52 files passed; 546/547 tests passed. The DB-trigger workspace entitlement integration test received `JWT issued at future` from the external auth service instead of reaching the expected `WORKSPACE_LIMIT` assertion (`src/lib/__tests__/workspace-entitlement.test.ts:81`). Initial sandbox run also could not spawn esbuild; the approved unrestricted run produced the stated result. |
| `pnpm build` | **PASS:** Next production compilation, type/lint stage, 86 static pages, and route build completed. It repeats the one hook warning. Initial restricted run failed only because compiler worker spawn was blocked; the approved run succeeded. |

The dependency audit is clean, but patching maturity is PARTIAL operationally until production runtime pinning, scheduled-run ownership, automated update PRs, SAST, and an external monthly scan are confirmed.

# 11. SECRETS / ENVIRONMENT

No secret values are reproduced here.

**Evidence and result**

- `.gitignore:8-16` ignores local environment variants and `.env*`; `.env.example` is intentionally tracked and contains names/placeholders only. `.env.local` exists locally but is untracked and was not disclosed.
- Pattern-based scans of the current tracked tree and all git-visible revisions found no recognizable OpenAI/Anthropic key, Supabase/JWT token, GitHub token, AWS access key, private-key block, credential-bearing database URL, or committed payment/Raiffeisen credential.
- The Supabase service-role environment name appears only in server configuration; server clients use `server-only`. Client code uses the public Supabase URL/anonymous key as intended.
- No Raiffeisen live merchant keys, card secrets, webhook secrets, email credentials, or production tokens were found in tracked configuration.

| Secret class | Result | Rotation recommendation |
|---|---|---|
| AI/provider API keys | No committed value detected. | No evidence-based emergency rotation; rotate if repository access/history outside this local clone is broader than known or dashboard logs show exposure. |
| Supabase service/database/JWT secrets | No committed value detected. | Verify server-only placement in Railway and least-privilege access; rotate on staff/access change or any suspected leak. |
| Webhook/cron/email secrets | Names only; no committed value detected. | Verify separate strong production values and documented rotation; never reuse across environments. |
| Raiffeisen/payment secrets | None detected; integration not present. | Provision only after approval through restricted provider secret storage, with dual control and environment separation. |

Limitations: a pattern scan cannot prove a random unlabelled value is harmless, and this audit had no access to GitHub secret-scanning alerts, deleted remote refs, provider logs, Railway environment variables, or Supabase Vault. Enable platform secret scanning and inspect those systems manually.

# 12. PRODUCTION CONFIGURATION

**Observed deployment (1 September 2026)**

- `maro.al` is served through Cloudflare; response metadata indicates a Railway origin. CDN/network DDoS functions are **PROVIDER-MANAGED**. Exact Cloudflare plan, WAF managed rules, bot mode, rate limiting, cache rules, origin lock-down, and log retention are unknown.
- Supabase supplies authentication, Postgres, PostgREST/RLS, and object storage; these availability and perimeter layers are **PROVIDER-MANAGED**, while policies/grants and correct key usage remain maro's responsibility.
- Port 80 redirects to HTTPS. The certificate is trusted for `maro.al` and was valid through 1 November 2026 at audit time. HSTS is present. TLS 1.0/1.1 remain enabled and are B-01.
- Anonymous `/`, `/legal/terms`, `/legal/privacy`, `/legal/refund`, `/pricing`, and `/contact` all returned the coming-soon content through middleware rewrite and `X-Robots-Tag: noindex, nofollow`. The app is verifiably in controlled release, but that configuration prevents merchant review.

**Application controls and assumptions**

- `src/lib/config/appOrigin.ts` requires HTTPS and rejects local/internal production origins. CSP has `upgrade-insecure-requests`; no live mixed-content failure was observed on the coming-soon document. Retest the full app once public.
- The middleware's 600 requests/hour IP map is local to a process and should be treated only as best-effort application protection. High-risk routes use database-backed strict limits that fail closed in production (`src/lib/security/rateLimit.ts`). Forwarded IP trust requires Cloudflare/Railway canonicalization.
- Webhook authenticity is verified for the Supabase auth-email hook; cron endpoints require a bearer secret and fail closed when missing (`src/app/api/webhooks/supabase/auth-email/route.ts`, `src/lib/security/cronAuth.ts`). The webhook raw body currently has no explicit local byte cap.
- No custom permissive CORS headers or wildcard origins were found. Same-origin browser behavior is the effective policy; document any future cross-origin API clients explicitly.
- Payment architecture is pre-integration and fails closed: production never enables the test completion path (`src/lib/payments/testMode.ts:10-18`), and invalid production payment configuration is not treated as test (`src/lib/config/serverEnv.ts:20-36`). Do not interpret placeholder order infrastructure as a live gateway.
- Provider/generation failures release reservations and map many errors safely, but some routes expose provider/database messages and should be normalized. Error boundaries/build health exist; there is no independently verified uptime monitor, health endpoint, incident response plan, restore test, RTO, or RPO.

# 13. MANUAL OWNER CHECKS

These are required before the submission decision can change; repository evidence cannot substitute for them.

- [ ] Set Cloudflare minimum TLS to 1.2+; retest TLS 1.0/1.1 rejection from an independent scanner. Confirm certificate chain, hostname, automatic renewal, HSTS preload intent, DNSSEC decision, and all subdomains.
- [ ] Verify Cloudflare WAF managed rules, bot protection, L3/L4/L7 DDoS coverage, rate-limit rules, cache exclusions for auth/admin/API/payment, security logging/alerts, and that the Railway origin cannot bypass Cloudflare except from approved sources.
- [ ] Confirm Railway production Node version (prefer the CI-supported Node 22 line), environment separation, least-privilege members, deploy approvals, rollback, backups, logging, alerting, and secret access.
- [ ] In Supabase, compare applied migrations to repository; inspect `anon`/`authenticated` grants; verify RLS/table/function/sequence/storage policies; run RPC privilege verification; enable backup/PITR as appropriate; perform an actual restore test; verify auth cookie/session/password/MFA/rate-limit/email settings.
- [ ] Inventory privileged accounts without publishing their addresses: GitHub/organization, Cloudflare, Railway, Supabase, maro admin, domain registrar/DNS, email/Resend, OpenAI, Anthropic, ElevenLabs, and future Raiffeisen portal/payment configuration.
- [ ] Require MFA for every privileged/provider account and every maro admin role; remove dormant/shared accounts; use least privilege; verify recovery methods and emergency access; record quarterly access reviews.
- [ ] With each authorized person's consent, check privileged email addresses against a recognized breach database such as Have I Been Pwned; reset unique passwords and revoke sessions/tokens where exposure is found. Do not upload passwords.
- [ ] Confirm GitHub branch protection, required reviews/checks, secret scanning/push protection, Actions permissions, Dependabot, CodeQL/SAST, scheduled job notifications, and a named owner who remediates findings.
- [ ] Run an external vulnerability scan of the public/full application after blockers are fixed, plus an authenticated test for user A/user B/admin boundaries; retain a dated report for Raiffeisen. Confirm at least monthly recurrence.
- [ ] Confirm the real legal entity name, relationship to NICE/maro, NUI/NRB, registry status, address, phone, tax/VAT treatment, governing law, privacy authority, consumer authority, support mailbox ownership, authorized signatory, and all form fields requested by Raiffeisen. **OWNER INPUT REQUIRED.**
- [ ] Confirm the actual commercial model: one-time 30-day access versus recurring subscription, renewal window, maroFort status, credit expiry, refund eligibility, cancellation path, digital delivery timing, service availability, complaints process, and account deletion process. Obtain legal review.
- [ ] Confirm the bank application transaction profile: expected monthly volume/value, maximum transaction, currencies, products, MCC/business description, countries served, refund/chargeback contacts, settlement account, and approved URLs. **OWNER INPUT REQUIRED.**
- [ ] Before any payment launch, agree with Raiffeisen on hosted/tokenized flow, webhook/callback authentication and replay window, idempotency, order-state transitions, amount/currency binding, refund roles, audit retention, test-to-live key separation, and PCI responsibility. Do not collect local card details.
- [ ] Establish malware/file-monitoring ownership, logging/PII retention, incident response contacts, breach notification process, provider outage procedure, RTO/RPO, and periodic restore/access-review evidence.
- [ ] Correct the external-auth clock problem and rerun all 547 tests cleanly; verify the workspace entitlement test actually reaches and exercises the database trigger.

# 14. FIX PLAN

## P0 — MUST FIX BEFORE RAIFFEISEN SUBMISSION

| Issue | Risk | Exact files/systems affected | Minimal recommended solution | Estimated scope |
|---|---|---|---|---|
| Disable TLS 1.0/1.1 | Direct noncompliance with TLS 1.2+ target. | Cloudflare zone for `maro.al`; deployment documentation. | Set minimum TLS 1.2; retest with protocol-specific client and external scanner; record evidence. | 0.5 day including verification. |
| Constrain workspace reference fetching | Authenticated SSRF, internal metadata access, memory DoS, unsafe provider input. | `src/app/api/ai/image/route.ts:291-330`; `src/lib/security/ssrf.ts`; `src/lib/workspaces/brainService.ts`; workspace migrations/policies; security tests. | Prefer only caller-owned `storage:generations/...` refs. If remote URLs remain, resolve and pin public IP, deny redirects, add timeout, stream to a hard byte cap, allow exact MIME, validate raster bytes/dimensions, and test private/link-local/DNS-rebinding/oversize cases. | 1-2 engineering days. |
| Authorize Explore source objects | Cross-user private media disclosure/IDOR. | `src/app/api/explore/route.ts:107-149`; `src/lib/storage/assets.ts:132-168`; Explore/storage tests. | Pass authenticated user ID to publication; accept only private-bucket paths beginning with that canonical user ID and associated with an owned generation; reject arbitrary HTTP URLs; copy only validated raster bytes. | 0.5-1 day. |
| Close operational-table RLS/grants | Anonymous/authenticated read/write of rate counters/spend can disclose data or weaken abuse controls. | `supabase/migrations/0011_abuse_protection.sql:150-175`; new forward migration; production Supabase grants. | Enable RLS with no client policies; revoke all table/sequence access from `anon`/`authenticated`; grant only service role/required definer functions; verify via PostgREST tests. | 0.5 day plus production verification. |
| Make merchant/legal pages publicly reviewable | Bank cannot validate merchant identity, pricing, policies, or support. | `src/lib/launch/config.ts`; `src/middleware.ts`; Cloudflare cache; legal/pricing/contact routes. | Allow an explicit anonymous list for `/legal/*`, `/pricing`, `/contact` and service/merchant description, or move production to live. Preserve no-store where needed and retest every URL without a session. | 0.5 day plus deploy/QA. |
| Correct and approve merchant/legal facts | Misrepresentation of jurisdiction, payment processor state, renewal/subscription model, phone and customer rights. | `src/components/legal/legal-config.ts`; `src/app/legal/{terms,privacy,refund}/page.tsx`; `src/app/pricing/page.tsx`; `src/app/contact/page.tsx`; account deletion wording. | Owner supplies verified facts; counsel/authorized owner reconciles Kosovo law, product terms and pre-integration language; replace placeholder phone; approve dated published text. | 0.5-2 days, dependent on owner/legal input. |

## P1 — SHOULD FIX BEFORE SUBMISSION

| Issue | Risk | Exact files affected | Minimal recommended solution | Estimated scope |
|---|---|---|---|---|
| Harden audio and all upload handling; define malware control | Polyglot/malformed content, provider exposure, active SVG risk. | `src/app/api/ai/audio/route.ts`; `src/lib/security/uploadValidation.ts`; all upload routes in section 7; storage delivery config. | Exact audio allowlist/signature/container checks, decoded limits, dimension/decompression limits, image re-encode where feasible, quarantine/scanner or documented compensating monitoring; parser-grade SVG sanitation/rasterization. | 1-3 days depending scanner. |
| Fail closed on forgot-password Turnstile and cap all bodies | Bot abuse and memory/CPU exhaustion. | `src/app/api/auth/forgot-password/route.ts`; state-changing routes still using raw `req.json()`; webhook route; `src/lib/security/requestLimits.ts`. | Always call the fail-closed verifier when required; use shared bounded readers; set explicit webhook raw-body cap; validate schemas and reject unknown/excess fields. | 0.5-1.5 days. |
| Escape invoice HTML and sanitize client-visible errors | Stored HTML/script injection in downloaded invoices; internal detail leakage. | `src/lib/payments/invoiceHtml.ts:13-109`; `src/app/api/payments/invoice/route.ts`; representative error routes in section 5. | HTML-escape every dynamic value or use a safe template renderer; keep attachment/nosniff/sandbox behavior; map provider/DB errors to stable public codes. Add injection tests. | 0.5 day. |
| Restrict workspace entitlement RPC | Cross-user plan/limit inference. | `supabase/migrations/0041_workspace_entitlement.sql:3-55`, `:88-90`; forward migration/tests. | Remove authenticated execute or enforce `p_user_id = auth.uid()`; keep trigger/service-role use. | 0.25 day. |
| Strengthen privileged access | Admin compromise and undocumented privilege path. | `src/lib/admin/mfaPolicy.ts`; `src/lib/admin/permissions.ts`; new-user trigger migrations; admin provisioning runbook. | Require AAL2 for editor too; remove hard-coded identity path through a forward migration; provision/administer roles through audited, MFA-gated operations; complete owner checks. | 0.5-1 day plus operations. |
| Remove production CSP inline script allowance; add isolation headers | XSS impact and cross-origin isolation gaps. | `security-headers.mjs`; `next.config.mjs`; root layout/theme initialization; preview compatibility tests. | Use a nonce/hash for the theme script; test Cloudflare Turnstile; add compatible COOP/CORP; retest auth, preview and future hosted payment navigation. | 1-2 days. |
| Rerun a clean deterministic test suite | One security-relevant DB trigger test is unproven in this audit. | `src/lib/__tests__/workspace-entitlement.test.ts`; CI clock/auth test setup. | Correct time synchronization or token timing tolerance in the test environment; ensure cleanup; rerun 547/547 and archive CI result. | 0.25-0.5 day. |
| Verify prompt/output privacy and retention | Excess private user content/PII retention. | `src/lib/supabase/server.ts:479-503`; `src/lib/operations/retention.ts`; generations schema; privacy policy. | Minimize raw/final prompts, restrict admin access, define retention/deletion/export, redact logs, and align public notice. | 0.5-1 day plus owner policy. |

## P2 — POST-APPROVAL HARDENING

| Issue | Risk | Exact files/systems affected | Minimal recommended solution | Estimated scope |
|---|---|---|---|---|
| Expand recurring scanning | New code/dependency/config defects may escape weekly audit-only CI. | `.github/workflows/security.yml`; GitHub settings; external scanner. | Add Dependabot/Renovate, CodeQL/SAST, secret scanning/push protection, monthly authenticated/external DAST, and ticket/owner/SLA. | 0.5-1 day setup, ongoing triage. |
| Plan dependency/runtime maintenance | Unsupported or stale versions accumulate risk. | `package.json`, lockfile, Railway runtime, lint configuration. | Pin production Node 22; take compatible patch/minor updates; separately test Next 16/OpenAI 7/etc.; migrate from `next lint` to ESLint CLI. | 1-3 days across planned releases. |
| Improve distributed abuse observability | Local middleware limits and provider defaults do not provide a full abuse picture. | Cloudflare, Railway, Supabase, `src/middleware.ts`, DB rate-limit/security events. | Edge rate rules, canonical IP handling, dashboards/alerts, anomaly thresholds, retention, and periodic load/abuse tests. | 1-2 days plus operations. |
| Formalize continuity and security operations | Recovery/incident response cannot be evidenced to a bank. | Provider settings and operating runbooks. | Document incident response, on-call/escalation, RTO/RPO, backup restore drills, key rotation, access reviews, vendor contacts, and evidence retention. | 1-2 days initial; quarterly exercises. |
| Add secure development regression tests | Future changes may reintroduce IDOR/SSRF/CSRF/header/upload flaws. | `src/lib/__tests__`, API integration suite, staging scan. | Add user A/user B authorization matrix, SSRF corpus, upload polyglots, invoice XSS, cookie-CSRF negatives, headers/TLS smoke, and storage policy integration tests. | 1-2 days. |

# 15. FINAL SUBMISSION DECISION

**Can maro.al be sent to Raiffeisen RISK today? NO.**

- The live endpoint violates the explicit TLS 1.2+ requirement by accepting TLS 1.0/1.1.
- Two exploitable application trust-boundary defects remain: workspace-reference SSRF/unbounded fetch and cross-user Explore publication.
- Two operational tables lack repository-defined RLS/client privilege revocation, so production data/control isolation is not demonstrable.
- The deployed launch gate hides every merchant/legal page from an anonymous bank reviewer.
- Merchant identity/legal/payment/renewal wording contains placeholder and contradictory facts that require owner/counsel correction and approval.
