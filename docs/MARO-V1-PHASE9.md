# MARO V1 — Phase 9: public auth / onboarding

Status: **PASS — real signup, confirmation, login and password recovery verified**.

Public signup is **DISABLED** at both Maro and Supabase. Final Railway deployment `b30bd725-bad7-4864-aeb7-afdf6590351d` is healthy. No payment or Engine work is included.

## Architecture and implementation

Public form → application signup flag → bounded input, strict IP/recipient limits and server Turnstile → Supabase SSR `signUp` → enabled signed Send Email Hook → Maro email templates → Resend → canonical `https://maro.al/auth/callback` → Supabase token verification/session cookies → confirmation notice/sign-in.

Recovery uses the same signed hook and token-hash callback, then a remotely verified user session, Supabase password update, logout and sign-in. The request also persists the PKCE verifier cookie for supported code-exchange callbacks. There is no automatic SMTP fallback or second auth system.

The old public administrative user-creation call did not initiate confirmation delivery. It has been replaced with the supported signup method. Internal provisioning is unchanged. Resend confirmation uses `auth.resend`, without creating another account. Callback errors, login failures and provider failures use customer-safe messages; redirects reject external and malformed destinations. Auth links are not persisted in evidence/log metadata. Resend request idempotency now deduplicates retries of the same token while allowing newly issued confirmation/recovery messages. Signup email logging avoids a foreign-key wait on the uncommitted auth user. Secure email changes retain both current/new inbox confirmations when Supabase supplies both token pairs.

## Production configuration audit

2026-09-18: all nine requested configuration names are present in Railway; values were not printed. Canonical origin matches maro.al; application signup is false. The owner supplied Turnstile keys and triggered deployment `8fd6f9a8-c2f4-4458-bfb2-a5d354450a56`, which succeeded before the Phase 9 deployment.

Supabase project `maro-website` was inspected through the owner's authenticated dashboard:

- Site URL: `https://maro.al`.
- Email/password provider enabled; secure email change enabled.
- Send Email Hook enabled at `https://maro.al/api/webhooks/supabase/auth-email`. Its secret remained hidden. Existing custom JWT hook was untouched.
- Platform CAPTCHA disabled, deliberately unchanged because existing login clients do not submit its token. Application Turnstile verifies signup/resend/recovery server-side, independently of the signup feature flag.
- Native signup initially enabled and email confirmation initially disabled. Owner explicitly approved turning native signup OFF and confirmation ON on 2026-09-18. Both saved settings were confirmed by navigating back to the provider page.
- Existing three redirect URLs preserved; owner-approved additions were saved and verified after reload:
  - `https://maro.al/auth/callback?type=signup&next=%2Fsign-in%3Fconfirmed%3D1`
  - `https://maro.al/auth/callback?type=recovery&next=%2Freset-password`
- Platform rate limits: signup/signin 30 requests/5 minutes/IP; token verification 30/5 minutes/IP; token refresh 150/5 minutes/IP. Email-rate field was not readable in the text inspection; no rate settings were changed.

Application signup closure is backed by disabled native Supabase signup until the separately approved controlled test. Public-launch abuse policy must account for direct native auth endpoints; application Turnstile alone does not protect requests that bypass Maro.

## Verification completed

- Full isolated regression: **985 passed, 11 skipped; 70 files passed, 1 skipped** (2026-09-18).
- Focused auth cases are included: signup closure, supported confirmation initiation, missing/invalid CAPTCHA, duplicates, resend, callback validity/expiry/reuse/redirects, recovery, password update/logout, MFA policy, signature checks, both secure email-change deliveries, Resend idempotency and real SSR PKCE cookie behavior with mocked fetch.
- TypeScript: PASS (`--noEmit --incremental false`).
- Production build: PASS; 90 static pages generated. Existing unrelated React dependency warning at `src/components/app/cards.tsx:484` remains.
- Credential-isolated local production smoke: `/sign-in`, `/sign-up`, `/confirm-email`, `/forgot-password`, `/reset-password` all HTTP 200. Browser verified confirmation/recovery forms, closed signup and invalid-session reset guidance. Signup POST returns 403; unconfigured callback returns a canonical safe error redirect.
- Ordinary Vitest clears production credentials, never loads `.env.local`, and rejects non-loopback fetch unless explicitly mocked. Tests demonstrate remote Supabase and Resend requests are blocked. No production integration tests were run.

Installed binaries were used directly because the machine's pnpm wrapper attempted an unrelated package-manager reinstall. This runs the same Vitest/Next scripts without changing dependencies.

## Deployment and production verification

Auth deployment initiated: `82652f3d-e450-462d-af14-bd8fb7345582` on Railway service `maro`, production. Accepted prior-phase working-tree changes are preserved. Base commit `2db574a73f28e1d6b32b3c40f9dcb23a911a929d`; deployment manifest digest `04726e589d8fcce3dbc82c3c06ee8b35dc5a72ce3037920c414fd616beb57c84` (1062 source files). The git commit alone does not identify the deployed working tree.

Deployment **SUCCESS**. Production sign-in, signup, confirmation-request and recovery pages return 200. Signup POST returns 403 `signup_disabled`; recovery and resend requests without CAPTCHA return 403 `turnstile_required`, before any email operation. Missing, mixed-token and unsafe-redirect callbacks return canonical safe error redirects. Turnstile visibly renders its human-verification checkbox; it has not been completed by the agent. Existing owner admin/MFA session persists; the Generations page loads both completed and failed/released history with no stale or unsettled jobs. The owner then signed out, signed in and completed MFA, confirming “login verified”; the resulting `/admin` page visibly shows Super Admin and V1 Overview. Normal `/krijimet` history loads 64 owner creations (42 images, 22 logos), with 22 images loaded at the sampled moment and the unchanged 3047-credit balance.

Real controlled signup and recovery: **VERIFIED** for owner-approved `info@maro.al`. The owner completed Turnstile and signup, confirmed the email and signed in, then requested recovery, received its email, changed the password and signed in again. Passwords, links and tokens were never requested or saved. No extra real resend was necessary; supported resend behavior is covered by focused tests.

Safe live evidence:

| Event | UTC time / evidence |
| --- | --- |
| Account created | 2026-09-18 13:42:49; user `7a70230b-cb75-4e40-8a4c-cf3b460af764` |
| Confirmation sent | 13:42:50; Resend message `01a0b4c1-6e3a-779c-ac01-ce517c247007`; application log status `sent` |
| Email confirmed | 13:43:37; Supabase `email_confirmed_at` |
| First login | 13:43:49; Supabase `last_sign_in_at`, corroborated by owner and normal account UI |
| Recovery sent | 13:46:06; Resend message `01a0b4c4-6945-77a7-a650-5bdce79b36ce`; application log status `sent` |
| Password changed and login repeated | Owner confirmed success; subsequent Supabase login 13:46:44 |

The production Resend key is intentionally send-only, so its email-read API rejects delivery-event lookup. It was not broadened. Inbox delivery and link function are established by the owner's completed confirmation/recovery flows; no provider `delivered` event is claimed.

Controlled verification continuation: the owner supplied `info@maro.al` and confirmed continuation. Read-only auth lookup verified it was not registered. Signup-form deployment was prepared with the application flag enabled while native Supabase signup stayed OFF until the verified form was ready. The owner entered all passwords, accepted terms and completed Turnstile. This was not public-launch authorization.

Deployment-source finding during controlled-test preparation: Railway's variable-triggered deployment `e46e53ba-737e-4190-8cda-af2e67864401` used connected Git revision `111991f6b37f95da975a82882aa14e3f61edb6ae` rather than the previously uploaded accepted working tree. The old signup UI exposed the mismatch before native signup was enabled. An explicit upload of the verified Phase 9 working tree was initiated as `26128ec7-e19e-4378-9467-5f27f11b506a`. Subsequent flag changes must use `--skip-deploys` followed by an explicit upload of the accepted source. No controlled account was created through the mismatched revision; native signup remained OFF throughout it.

Deployment `26128ec7-e19e-4378-9467-5f27f11b506a` succeeded and the browser confirmed the correct Phase 9 form. Native signup was then temporarily enabled with confirmation still ON. The owner completed the form. A bounded read-only observation of only the approved mailbox detected creation and ended normally.

The observation detected creation at 13:42:55 UTC. Native signup was switched OFF and saved, then the Railway flag was restored to false using `--skip-deploys`. Explicit closure deployment: `b30bd725-bad7-4864-aeb7-afdf6590351d`. The observation process finished and is no longer running. The new approved account is retained; no deletion was requested.

Final closure verified at **2026-09-18 13:48:56 UTC**: Railway deployment SUCCESS, signup page HTTP 200 with the closed-registration message, signup API HTTP **403 `signup_disabled`**. Native signup remains OFF and email confirmation remains ON. Final runtime source is the same tested Phase 9 source with the signup flag disabled.

## Account bootstrap and preservation

Existing migration 0018 creates one profile, default workspace and active-workspace link. Live verification confirms the controlled user has one profile, **one owned workspace**, a valid active-workspace link, **0 credits, 0 reserved**, no admin access, **0 memberships, 0 orders and 0 credit transactions**. Historical owner-email special policy remains unchanged.

Read-only baseline at 2026-09-18T13:13:05Z: internal credits 3047, reserved 0; jobs 63, generations 125, credit transactions 133, orders 484, email logs 70, memberships 1, notifications 2. Lifecycle 2 and model/prompt/Logo hashes match accepted state. No changes were made to the four retained incident logs or internal membership state.

Post-deployment comparison at 2026-09-18T13:21:37Z: all seven table hashes, internal balance, model settings, prompts and Logo settings remain identical. Comparison against the Phase 8B source manifest confirms changes to existing source files are limited to the listed auth/test files.

Final live-flow comparison at 2026-09-18T13:47:27Z: all pre-existing generation jobs, generations, credit transactions, orders, email logs, memberships and notifications remain hash-identical. Exactly two new auth-email logs are recorded for the controlled flows. The four preserved incident logs are among the unchanged pre-existing logs. Internal balance remains **3047 credits, 0 reserved**; internal membership is unchanged.

## Production mutations

1. Owner configured the two Turnstile variables and triggered a successful redeploy.
2. Owner-approved Supabase settings: require email confirmation, disable new signup, add two canonical callback allowlist entries. All other dashboard settings preserved.
3. Auth-only Railway web deployment completed successfully. Scheduler untouched.
4. Owner-approved temporary signup window: application flag true, then native signup ON with confirmation ON; both restored OFF after account creation and closure verified in the final deployment.
5. Exactly one approved user/profile/default workspace created. Owner confirmed its email, signed in, requested recovery, changed its password and signed in again. Two auth emails and their delivery logs created. No paid generation or payment occurred.

The owner also performed an existing-admin logout, login and MFA challenge. Existing IP/recipient rate-limit bookkeeping was used by real signup/recovery and the negative checks; one empty signup check during closure rebuilding returned `invalid-email` without an auth operation. No existing account passwords, credits, orders, incident logs or internal membership state were changed.

## Files changed in Phase 9

| File | Reason |
| --- | --- |
| `src/app/api/auth/signup/route.ts` | Supported signup/confirmation initiation, safe errors, duplicate-safe signals |
| `src/app/api/auth/resend-confirmation/route.ts` | Rate-limited supported confirmation resend |
| `src/app/api/auth/forgot-password/route.ts` | SSR recovery cookie persistence and checked errors |
| `src/lib/auth/publicAuth.ts` | Shared bounded input, limits, CAPTCHA and safe responses |
| `src/lib/auth/messages.ts` | Customer-safe auth messages |
| `src/lib/auth/passwordReset.ts` | Verified session/password update/logout |
| `src/app/auth/callback/route.ts` | Canonical safe redirects, malformed-input rejection, exception handling |
| `src/lib/auth/safeRedirect.ts` | Reject control-character redirect bypasses |
| `src/lib/auth/callbackErrors.ts` | Restrict logged OTP types |
| `src/lib/security/turnstile.ts` | Explicit required mode, bounded token, timeout, strict success |
| `src/lib/email/authHook.ts` | Correct destinations, token-specific idempotency, signup logging, both secure-change messages |
| `src/lib/email/secureEmailChange.ts` | Resolve both secure-change inbox deliveries |
| `src/lib/email/provider/resend.ts` | Correct SDK request idempotency option |
| `src/context/store.tsx` | Safe signup/login error presentation |
| `src/components/auth/AuthPanel.tsx` | Keep confirmation notice visible, clear password, reset CAPTCHA, resend link |
| `src/components/auth/TurnstileWidget.tsx` | Stable callback refs and challenge lifecycle |
| `src/components/auth/AuthEmailRequest.tsx` | Shared recovery/confirmation request form |
| `src/app/forgot-password/page.tsx` | Use safe request form |
| `src/app/confirm-email/page.tsx` | Confirmation resend page |
| `src/app/sign-in/page.tsx` | Confirmation/reset notices and link-error guidance |
| `src/app/reset-password/page.tsx` | Remote session verification and safe reset flow |
| `src/lib/launch/config.ts` | Allow public confirmation-request page |
| `vitest.setup.ts` | Add external-fetch isolation to credential isolation |
| `src/lib/__tests__/public-auth-phase9.test.ts` | Auth route/callback/reset safety coverage |
| `src/lib/__tests__/auth-ssr-cookies.test.ts` | Real SSR cookie behavior and network guard |
| `src/lib/__tests__/auth-resend-idempotency.test.ts` | Correct provider request options |
| `src/lib/__tests__/auth-recovery-flow.test.ts` | Update obsolete stateless-recovery assumptions |
| `src/lib/__tests__/email-auth-phase1a.test.ts` | Hook destinations, retries, signup FK, secure email change |
| `docs/MARO-V1-PHASE9-AUTH-MAP.md` | Pre-change factual auth map |
| `docs/MARO-V1-PHASE9.md` | Status and safe evidence |

Local ignored support files: `scripts/phase9-isolated-production.mjs` (credential-isolated build/smoke), `scripts/phase9-readonly.mjs` (read-only hashes), `scripts/phase9-production-negative.mjs` (no-send production checks), `scripts/phase9-account-check.mjs` (approved account state), `scripts/phase9-final-check.mjs` (preservation and safe delivery metadata), `scripts/phase9-data/` (safe snapshots, deployment manifest and checks). Earlier dirty files such as `AuthLayout.tsx` were already present and are not Phase 9 edits.

Migrations: **none**.

## Known limitations and final verdict

Additional UI observation: opening `/imazh?open=<saved-id>` directly on a fresh document can show an empty read-only workspace, while normal `/imazh` navigation renders the composer. The existing `ToolComposer.tsx` seeds from `creationsRef.current` before asynchronous history finishes, without re-seeding when creations arrive. Its file hash is identical to the accepted Phase 8B source. This existing history initialization issue was recorded without modifying the Engine or generation UI. Normal library access passed after the owner's fresh login.

Resend event-read permission was unavailable and was not broadened; actual receipt/link use was verified through the owner. Permanent future public signup still requires an explicit launch decision and agreement on protection of direct native auth endpoints. Railway configuration changes must deploy the accepted working tree explicitly until the connected Git source matches it. None of these observations authorizes broader work in this phase.

**PUBLIC AUTH / ONBOARDING VERIFIED**.

Signup final state: **DISABLED**. Payment finalization has not started and must not start automatically.

Primary references: [Supabase signup](https://supabase.com/docs/reference/javascript/auth-signup), [resend](https://supabase.com/docs/reference/javascript/auth-resend), [signed Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), [SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [redirect allowlists](https://supabase.com/docs/guides/auth/redirect-urls), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
