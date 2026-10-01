# MARO V1 — PHASE 8A

## PHASE 8A STATUS

**PASS WITH DOCUMENTED INCIDENT — closed by owner decision on September 18, 2026.** Railway source preparation and local verification are complete. The original no-production-mutation condition was violated by an accidental legacy integration-test run and that history remains recorded. Phase 8A.1 removed all 17 proven synthetic orders under owner authorization. The owner explicitly directed retention of the four failed-email logs unchanged as incident evidence because their origin is not conclusively attributable to the run, and accepted the unknown internal pre-state as a documented limitation. See `MARO-V1-PHASE8A1.md` for closure details and `MARO-V1-PHASE8A-INCIDENT.md` for the preserved incident history.

No deployment, Railway settings/secret-store change, Supabase migration/auth/bucket configuration change, public signup enablement, paid image generation or payment implementation change occurred. Existing V1 architecture, model configuration and prompt semantics remain unchanged. However, the initial regression run did mutate synthetic commerce data and the internal account's renewal status/notification; it cannot be described as a wholly read-only phase.

## RAILWAY WEB SERVICE

Prepared web service uses Railpack, repository-pinned pnpm, frozen-lockfile installation, `pnpm build`, and `pnpm start`. The existing `railway.toml` retains health check `/` and `ON_FAILURE` restart behavior. No scheduler was added to the web process.

Fixed one source-level binding issue: `start.mjs` now listens on `0.0.0.0` rather than trusting the container's `HOSTNAME`. Railway supplies `PORT`; the existing local fallback remains. A real local production-server check passed with an intentionally invalid container hostname and an assigned port.

The setup guide documents explicit effective service settings, including Railway's current legacy Config as Code transition. Existing TOML is retained; new services must not assume it is adopted. [Railway configuration documentation](https://docs.railway.com/config-as-code).

## RAILWAY RECONCILIATION TASK

Repository-root command: **`pnpm reconcile:stale`**.

Separate service root: **`/tools/reconciliation`**. Its dependency-free Dockerfile runs **`node run.mjs`** and exits. Set the Railway schedule to every ten minutes, no health check and restart policy `NEVER`. No Docker daemon was started and no container image was built locally; image build and effective Railway settings remain Phase 8B checks.

Required environment: `APP_ORIGIN`, `CRON_SECRET`. Optional: `RECONCILE_TIMEOUT_MS`. Production requires an explicit HTTPS origin. No alias/hostname fallback is used by the runner. The server's existing alias compatibility remains unchanged.

The runner makes one bearer-authenticated POST to the accepted endpoint, refuses redirects, bounds duration and response size, and logs fixed operational codes only. Exit 0 requires HTTP 200 and the endpoint's two true acknowledgement fields. Configuration, unauthorized response, network, timeout and invalid acknowledgement failures exit 1. The endpoint and accepted SQL algorithm were not modified. No retry, loop, provider call or settlement logic exists in the runner. Actual schedule delivery remains unverified until authorized deployment. [Railway cron documentation](https://docs.railway.com/cron-jobs).

## SCHEDULER TESTS

**26/26 passed** using only fake local endpoints and fake credentials, including actual child-process exit status:

- Missing secret and missing explicit origin fail closed; aliases cannot silently select a target.
- One successful authenticated POST exits zero.
- HTTP 401/403/500/503 exit non-zero, with no retries or response-body logging.
- Redirect destination receives no request.
- HTML, malformed JSON, false/missing acknowledgement and oversized response fail.
- Timeout before headers and during body consumption exits non-zero.
- Unsafe origins, production HTTP, invalid timeout and network failures are rejected.
- Every child-process result is checked for secret leakage.

Evidence: `scripts/phase8a-scheduler.log`. No production reconciliation was triggered.

## PRODUCTION ENVIRONMENT CONTRACT

Variable names and classifications only; actual Railway values remain uninspected. Full service/exposure requirements are in `MARO-V1-RAILWAY-SETUP.md`.

| Variable name | Classification |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required now |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required now |
| `SUPABASE_SERVICE_ROLE_KEY` | Required now; secret |
| `OPENAI_API_KEY` | Required now; secret |
| `CRON_SECRET` | Required now; secret shared by web and task |
| `APP_ORIGIN` | Required now |
| `NODE_ENV` | Required now |
| `PORT` | Required now; Railway supplied |
| `NEXT_PUBLIC_SIGNUP_ENABLED` | Required now; disabled onboarding policy |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Required for public onboarding |
| `TURNSTILE_SECRET_KEY` | Required for public onboarding; secret |
| `RESEND_API_KEY` | Required for public onboarding/custom-hook recovery; secret |
| `SUPABASE_AUTH_HOOK_SECRET` | Required for public onboarding/custom-hook recovery; secret |
| `NEXT_PUBLIC_APP_URL` | Optional |
| `APP_URL` | Optional |
| `NEXT_PUBLIC_SITE_URL` | Optional |
| `PUBLIC_LAUNCH_MODE` | Optional; separate landing-page policy |
| `OPENAI_TIMEOUT_MS` | Optional |
| `RECONCILE_TIMEOUT_MS` | Optional |
| `ANTHROPIC_API_KEY` | V1.5/V2 only; secret |
| `ANTHROPIC_MODEL` | V1.5/V2 only |
| `ANTHROPIC_EFFORT` | V1.5/V2 only |
| `ANTHROPIC_MAX_TOKENS` | V1.5/V2 only |
| `ANTHROPIC_TIMEOUT_MS` | V1.5/V2 only |
| `ANTHROPIC_CHAT_API_KEY` | V1.5/V2 only; secret |
| `ANTHROPIC_CHAT_MODEL` | V1.5/V2 only |
| `ANTHROPIC_CHAT_MAX_TOKENS` | V1.5/V2 only |
| `ELEVENLABS_API_KEY` | V1.5/V2 only; secret |
| `ELEVEN_VOICE_FEMALE` | V1.5/V2 only |
| `ELEVEN_VOICE_MALE` | V1.5/V2 only |
| `THUMBNAIL_SIGNING_SECRET` | V1.5/V2 only; secret |
| `PAYMENT_MODE` | Payment only; frozen |
| `OPENAI_IMAGE_MODEL` | Obsolete |
| `HOSTNAME` | Obsolete as application configuration; container metadata only |
| `VERCEL_OIDC_TOKEN` | Obsolete for Railway V1 |

`.env.example` now includes the V1 origin/cron/onboarding contract and explicitly disabled signup. `OPENAI_IMAGE_MODEL` remains absent; no new Railway setup instruction requests it. Existing local secrets were untouched. No new payment variables were introduced. `VITEST_LOCAL_INTEGRATION` is local testing only, never a Railway variable.

## ONBOARDING READINESS

Public signup stays disabled. Before enabling it, resolve the actual source gap: `/api/auth/signup` creates an unconfirmed account through the administrative API but does not send/resend confirmation mail. The caller also has no send step. Administrative creation does not send confirmation email; a configured hook alone cannot repair the missing operation. [Supabase documentation](https://supabase.com/docs/reference/python/auth-admin-createuser).

This is a public-onboarding blocker, not a reason to reopen V1 generation or enable signup now. It requires a separately authorized narrow auth fix and end-to-end verification. The setup guide also records Turnstile keys/domain authorization, Supabase public signup policy, email/password and email confirmation settings, callback allowlisting, rate-limit dependencies and the public-variable rebuild requirement.

## EMAIL / AUTH READINESS

Source paths inspected: signup API/caller, Supabase password login, forgot-password API, auth callback, reset-password flow, Turnstile validation, signed Send Email Hook, email template resolution and Resend provider.

Owner/platform actions remaining: verify Supabase Site URL and callback redirects; inspect email confirmation/new-user/secure-email-change policy; verify Resend sender-domain DNS and sender/reply-to; configure the signed hook endpoint and matching signing secret; verify custom-hook recovery and existing-user login with an owner-approved mailbox/session. Current recovery cannot assume the default mailer solves its missing browser PKCE-verifier path. The current login path sends no Supabase CAPTCHA token; do not add a platform CAPTCHA requirement without compatibility verification.

Live DB email settings are present, provider is Resend, and sender/reply-to fields are configured. Resend access/domain verification, actual Supabase hook settings and delivery were not verified. Four accidental integration email attempts logged `CONFIG_MISSING`; no successful email delivery was observed. No intended live email test was conducted.

## SUPABASE READINESS

Final read-only verification at 2026-09-17 14:24:39 UTC passed:

- Lifecycle readiness **2**; generation/history tables reachable; migration **0049** Logo content and operations functions available.
- Imazh Flare enabled/default, Sunburst enabled/non-default, Logo Flare enabled/default/sole returned Logo model; all prices **5**.
- Accepted live prompts unchanged: Imazh `v1` (`a8cde7e4-b3c4-4f08-9ea4-6ce9f5970ac1`), Logo `v1-canonical-phase4` (`d5869284-7e7a-4b07-ae37-8bed138d97c8`).
- Operations: two historical jobs, one failed, zero pending/stale/settlement-pending; no in-flight generation rows. The released original failure is historical and not eligible for reconciliation.

Evidence: `scripts/phase8a-data/remote-readiness.json`. This script itself performs no mutation. It does not establish that the entire phase was read-only; the regression incident is reported separately. No migrations were rerun and no storage output was generated.

## STORAGE READINESS

Live bucket metadata confirms private **`generations`** and public **`maro-public`**. Custom size/MIME bucket limits are unset. Source/schema ownership and explicit public-prefix policies remain accepted and unchanged. Phase 8B must verify the existing owned result through authenticated history and its signed private URL; no new paid generation is needed.

## PRODUCTION BUILD

**PASS**, exit 0: `pnpm build`, all **89/89** static-page generation steps completed. Provider, email and privileged server credentials were explicitly cleared for the build; signup was disabled. The existing nonblocking `cards.tsx:484` effect-dependency warning remains as reported in Phase 7.

TypeScript: **PASS**, exit 0, `tsc --noEmit --incremental false` after the test-isolation fix. No generated application source was changed after the successful build.

## TEST RESULTS

| Verification | Result |
| --- | --- |
| Safe full regression | **946 passed, 11 integration tests skipped**, 67 files passed / 1 skipped |
| Scheduler subprocess/local HTTP tests | **26/26 passed** |
| Credential-isolation subprocess tests | **4/4 passed** |
| Built production web smoke | **3/3 passed**: binding/health, disabled signup, fail-closed cron |
| Production build | PASS |
| TypeScript | PASS |
| Whitespace check | PASS; existing line-ending warnings only |

The initial unisolated regression was **955 passed / 2 failed**, because it unintentionally ran all 11 remote commerce integration tests. This is retained in `scripts/phase8a-tests.log`; it is not concealed by the safe rerun. Its two failing legacy reservation assertions were not modified. The repository now strips inherited credentials and refuses remote integration targets before tests.

Additional evidence: `scripts/phase8a-tests-final.log`, `phase8a-build.log`, `phase8a-typescript.log`, `phase8a-test-isolation.log`, and `phase8a-data/web-smoke.json`. Local smoke processes were stopped. No Docker daemon was started. The cron Dockerfile is prepared but its image/platform execution is unverified until Phase 8B.

## FILES CHANGED

Changes made specifically in Phase 8A; pre-existing dirty files and earlier phase work were preserved.

| File | Reason |
| --- | --- |
| `.env.example` | V1 origin/cron/onboarding contract; signup disabled; correct image-tool labels |
| `package.json` | Add run-once reconciliation and scheduler-test commands |
| `start.mjs` | Bind Next to all interfaces despite container HOSTNAME |
| `vitest.setup.ts` | Prevent unintended production credentials and remote mutation in regression |
| `tools/reconciliation/run.mjs` | Bounded authenticated run-once endpoint client |
| `tools/reconciliation/run.test.mjs` | 26 local failure/success/security/exit checks |
| `tools/reconciliation/Dockerfile` | Isolated, unprivileged, dependency-free scheduled service |
| `tools/reconciliation/.dockerignore` | Restrict build context to runner and Dockerfile |
| `tools/phase8a/inspect-remote.mjs` | Read-only V1 configuration/storage/readiness evidence |
| `tools/phase8a/inspect-regression-impact.mjs` | Read-only assessment of the accidental regression run |
| `tools/phase8a/test-isolation.test.mjs` | Verify production credentials cannot activate tests |
| `tools/phase8a/web-smoke.mjs` | Credential-free local production startup checks and process cleanup |
| `docs/MARO-V1-RAILWAY-SETUP.md` | Actionable two-service setup, environment/auth contract and deployment checklist |
| `docs/MARO-V1-PHASE8A-INCIDENT.md` | Transparent incident details, retained record IDs and review requirements |
| `docs/MARO-V1-PHASE8A.md` | This report |

No V1 engine, provider model routing, pricing, Brain, Logo generation, settlement RPC or persistence implementation changed. `railway.toml`, `vercel.json`, payment implementation/schema, lockfile and workspace dependency settings were not changed by Phase 8A. Evidence files under ignored `scripts/` are local audit outputs.

## DEPLOYMENT CHECKLIST

The complete ordered checklist with exact settings and verification behavior is in `MARO-V1-RAILWAY-SETUP.md`. Sequence:

1. Preserve the accepted incident disposition and obtain separate Phase 8B authorization; verify source, Railway root/effective settings and web environment.
2. Securely set/reference the shared cron secret.
3. Set canonical production origin and build/runtime environment; keep signup disabled and payment frozen.
4. Prepare the isolated scheduled service and ten-minute schedule without premature activation.
5. Deploy the authorized web revision.
6. Verify health.
7. Verify production domain/TLS/origin.
8. Verify unauthenticated cron requests fail.
9. Activate/run the scheduled service and observe a genuine scheduled success/exit.
10. Verify no duplicate credit/settlement transition.
11. Owner signs in and completes real admin MFA, then read V1 configuration and run canonical preview without provider calls or changes.
12. Owner opens the existing owned result in Creations; verify private asset and job/generation linkage.
13. Confirm signup remains disabled.
14. Confirm parked modules remain blocked.
15. Record evidence; no paid generation, email testing or payment work without its own authorization.

## OWNER ACTIONS REQUIRED

Incident disposition is complete: all 17 proven synthetic orders were removed, and on September 18, 2026 the owner directed preservation of the four failed-email logs unchanged. No further incident cleanup or account rollback is authorized or required for this closeout. The prior membership status remains unknown and must not be guessed. The account remains unchanged, with the recorded balance of 3047 credits and 0 reserved.

For later Phase 8B, provide authorized Railway/domain access and validate secret presence without sharing values in chat. Supply an existing admin browser session and personally complete MFA; provide the existing result owner's signed-in session for history verification. No MFA bypass or new generation is required. Approve auth/email work separately before any public signup opening.

## REMAINING BLOCKERS

| Category | Remaining requirement |
| --- | --- |
| Phase acceptance / incident | Closed: PASS WITH DOCUMENTED INCIDENT; proven orders removed, four logs retained unchanged by explicit owner decision, unknown internal pre-state documented |
| Deployment configuration | Actual Railway environment, effective service configuration, Docker image build, domain/TLS and scheduler delivery await authorized Phase 8B |
| Onboarding verification | Confirmation-email send gap plus Turnstile, sender-domain, hook, redirect and recovery verification; signup stays disabled |
| MFA/history verification | Real owner/admin sessions and personally completed MFA; no generation needed |
| External payment blocker | Raiffeisen approval/integration remains separate and frozen |

## FINAL VERDICT

**READY FOR AUTHORIZED RAILWAY DEPLOYMENT VERIFICATION.** The owner closed Phase 8A and Phase 8A.1 as PASS WITH DOCUMENTED INCIDENT on September 18, 2026. Source preparation, isolation verification, authorized order cleanup and explicit email-log preservation disposition are complete. The original no-mutation violation remains part of the record. This documentation-only closeout made no production changes, and no deployment or Phase 8B activity was started. Phase 8B still requires separate authorization.
