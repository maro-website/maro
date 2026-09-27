# Maro V1 Railway setup

Preparation only. Phase 8A and Phase 8A.1 were closed by owner decision on September 18, 2026 as **PASS WITH DOCUMENTED INCIDENT**. Verdict: **READY FOR AUTHORIZED RAILWAY DEPLOYMENT VERIFICATION**. Preserve the accepted incident disposition in `MARO-V1-PHASE8A1.md`: four failed-email logs retained unchanged and no speculative account rollback. Phase 8B still requires separate authorization; this closeout does not authorize deployment or signup enablement.

## Persistent web service

Use the repository directory containing `package.json`, `pnpm-lock.yaml`, `start.mjs` and `railway.toml` as the service root.

| Setting | Required setup |
| --- | --- |
| Builder | Railpack |
| Package manager | Repository pin: pnpm 11.0.8; use the committed lockfile |
| Install | `pnpm install --frozen-lockfile` (Railpack dependency installation) |
| Build | `pnpm build` |
| Start | `pnpm start` → `node start.mjs` → Next production server |
| Binding | `0.0.0.0`; `PORT` supplied by Railway; fallback 3000 only outside Railway |
| Health check | `/`; expect HTTP 200. This checks web availability, not database or provider readiness. |
| Restart | `ON_FAILURE`; preserve existing retry settings |
| Schedule | None; persistent web process |
| Domain | `maro.al`; configure Railway-provided DNS records and confirm TLS |

Set `APP_ORIGIN` to `https://maro.al`. It is the canonical server origin for auth links and the required runner origin. The web helper retains existing aliases in this order: `NEXT_PUBLIC_APP_URL`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`. They can be omitted on maro.al. If configured, make them agree with the canonical origin. Email asset helpers still use those aliases and otherwise fall back to maro.al; no origin helper was redesigned.

Set public Supabase variables before the build; Next embeds public variables in its client bundle. Supply server secrets at runtime. Keep `NEXT_PUBLIC_SIGNUP_ENABLED` explicitly disabled for both build and runtime. Verify `NODE_ENV` is production. Do not set a fixed Railway port or use a container hostname as a URL.

`railway.toml` remains the accepted web configuration. For a new service, enter the above settings explicitly and inspect the effective build/start settings before execution. Railway currently documents legacy Config as Code as deprecated, with existing-service support ending December 1, 2026 and new services unable to opt in. Do not assume a new service adopts this file. Use dashboard settings for this preparation, and review any existing file-to-dashboard migration before the deadline. [Railway configuration documentation](https://docs.railway.com/config-as-code).

## Separate scheduled reconciliation service

Use the same reviewed source revision, with service root **`/tools/reconciliation`**. This directory has its own Dockerfile and no app dependencies. It copies only `run.mjs`, runs as the unprivileged Node user, and starts no web server.

| Setting | Required setup |
| --- | --- |
| Build | Dockerfile in the selected service root; no Next build or package install |
| Start | `node run.mjs` (the Dockerfile CMD) |
| Equivalent repository-root command | `pnpm reconcile:stale` |
| Cron schedule | `*/10 * * * *` — every ten minutes, UTC |
| Restart policy | `NEVER`; next schedule supplies the next attempt |
| Health check | None; this service exits |
| Network | Outbound HTTPS to the canonical web origin; no public domain/port needed |
| Required environment | `APP_ORIGIN`, `CRON_SECRET` |
| Optional environment | `RECONCILE_TIMEOUT_MS` |
| Runtime | Dockerfile sets production mode; Node 22 |

Do not attach the root web `railway.toml` to this service. Verify its effective root, Dockerfile, command, schedule, no health check, and restart policy before deploying it. `vercel.json` is retained for alternative hosting and supplies no Railway schedule.

Railway starts the service on its schedule and expects it to terminate. A still-running previous job can cause the next invocation to be skipped. [Railway cron documentation](https://docs.railway.com/cron-jobs). Railway recognizes a Dockerfile in the service source directory; use the isolated service root as the build context. [Dockerfile documentation](https://docs.railway.com/builds/dockerfiles).

The command sends exactly one POST to `/api/cron/reconcile-stale-jobs` using `Authorization: Bearer` with the shared `CRON_SECRET`. Generate/store that secret securely in Phase 8B and reference the same value in both services. Never put it in a URL, command argument, public variable, or log. The task does not need Supabase or OpenAI keys.

The runner requires an explicit origin, uses HTTPS in production, refuses URL credentials/path/query/fragment and does not follow redirects. Timeout defaults to 60 seconds and is configurable between 100 and 120,000 milliseconds. It covers headers and response-body reading. Success requires HTTP 200 and JSON with both `ok` and `staleJobsReconciled` equal to true. Logs contain only fixed event/reason names, HTTP status and elapsed time. Response bodies are bounded to 4 KiB and never logged.

Exit 0 means the endpoint acknowledged completion. Exit 1 means configuration, HTTP, response, network or timeout failure. No retries, loop, provider call, database connection or settlement implementation exists in the runner. A client timeout does not prove the server stopped; inspect operations before intervening. Accepted database settlement remains authoritative and idempotent.

Do not activate a schedule until the web deployment is reachable. After authorization, configure the task with automatic deployment disabled, verify the web service first, then activate the task. Check first-run and subsequent scheduled-run logs; alert on non-zero exits or missing expected invocations.

## Environment contract

Names only in this inventory. No secret values belong in documentation.

| Variable name | Classification | Exposure / use |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required now | Public; web build and runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required now | Public client credential; RLS remains required |
| `SUPABASE_SERVICE_ROLE_KEY` | Required now | Secret; web server only |
| `OPENAI_API_KEY` | Required now | Secret; web server only, no test generation authorized |
| `CRON_SECRET` | Required now | Secret; web and scheduled service |
| `APP_ORIGIN` | Required now | Server configuration; web and scheduled service |
| `NODE_ENV` | Required now | Runtime configuration; production |
| `PORT` | Required now | Railway supplies web listening port |
| `NEXT_PUBLIC_SIGNUP_ENABLED` | Required now | Public build/runtime policy; keep disabled; later enabling requires approval |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Required for public onboarding | Public; web build/runtime |
| `TURNSTILE_SECRET_KEY` | Required for public onboarding | Secret; web only |
| `RESEND_API_KEY` | Required for public onboarding | Secret; also needed to verify existing-user recovery through the custom hook |
| `SUPABASE_AUTH_HOOK_SECRET` | Required for public onboarding | Secret; exact signing secret from Supabase Send Email Hook |
| `NEXT_PUBLIC_APP_URL` | Optional | Compatibility origin; email assets and existing billing links |
| `APP_URL` | Optional | Compatibility origin |
| `NEXT_PUBLIC_SITE_URL` | Optional | Compatibility origin |
| `PUBLIC_LAUNCH_MODE` | Optional | Public landing-page gate, independent of signup; owner verifies intended policy |
| `OPENAI_TIMEOUT_MS` | Optional | Existing image timeout; preserve accepted default |
| `RECONCILE_TIMEOUT_MS` | Optional | Bounded scheduled-request timeout |
| `ANTHROPIC_API_KEY` | V1.5/V2 only | Secret; parked Web |
| `ANTHROPIC_MODEL` | V1.5/V2 only | Parked Web |
| `ANTHROPIC_EFFORT` | V1.5/V2 only | Parked Web |
| `ANTHROPIC_MAX_TOKENS` | V1.5/V2 only | Parked Web |
| `ANTHROPIC_TIMEOUT_MS` | V1.5/V2 only | Parked Web |
| `ANTHROPIC_CHAT_API_KEY` | V1.5/V2 only | Secret; future standalone Chat |
| `ANTHROPIC_CHAT_MODEL` | V1.5/V2 only | Future standalone Chat |
| `ANTHROPIC_CHAT_MAX_TOKENS` | V1.5/V2 only | Future standalone Chat |
| `ELEVENLABS_API_KEY` | V1.5/V2 only | Secret; parked Audio |
| `ELEVEN_VOICE_FEMALE` | V1.5/V2 only | Parked Audio |
| `ELEVEN_VOICE_MALE` | V1.5/V2 only | Parked Audio |
| `THUMBNAIL_SIGNING_SECRET` | V1.5/V2 only | Secret; parked Web thumbnail flow |
| `PAYMENT_MODE` | Payment only | Frozen; do not add, enable or change |
| `OPENAI_IMAGE_MODEL` | Obsolete | No V1 runtime consumer; do not configure |
| `HOSTNAME` | Obsolete as app configuration | Container metadata only; start command no longer uses it for binding |
| `VERCEL_OIDC_TOKEN` | Obsolete for Railway V1 | No current app consumer; do not copy from local environment |

`VITEST_LOCAL_INTEGRATION` is a local test-only opt-in, never a production variable. Ordinary `pnpm test` does not load `.env.local`, strips real service/provider keys, and skips the 11 database integration cases. Opt-in tests require explicitly supplied loopback Supabase credentials for a disposable local instance. Never point tests at production.

Do not copy all local environment variables into Railway. The current Railway secret store was not inspected or modified. Local presence does not verify production presence. Leave any existing payment/Raiffeisen variables unchanged; no Raiffeisen-specific runtime variable was found in the current app.

## Onboarding and email prerequisites

1. Keep application signup disabled. In Phase 8B inspect Supabase's public new-user setting so direct public API signup is consistent with that policy; do not silently enable it.
2. Resolve the existing signup confirmation-email gap before any public opening: `/api/auth/signup` calls `auth.admin.createUser` with an unconfirmed email, then returns success. Neither that route nor its caller sends/resends a confirmation message. Configuring a hook alone does not add a send operation. Supabase documents that administrative user creation does not send confirmation mail. [Supabase create-user documentation](https://supabase.com/docs/reference/python/auth-admin-createuser). Plan a separately authorized, narrow auth fix and its email test; do not bypass verification or mark accounts confirmed to hide the gap.
3. In Supabase Auth, keep email/password enabled for existing users, require email confirmation for onboarding, and verify the intended secure-email-change policy. Set Site URL to the production origin. Allow the exact production `/auth/callback` destination, including the recovery flow's query parameters, using the platform's redirect matching rules. Avoid broad unrelated redirect hosts.
4. Verify Turnstile widget hostname authorization for `maro.al` (and `www` only if actually served). Match its public site key and server secret. Signup validates Turnstile and production fails closed when signup is enabled without its secret. Recovery verifies it when signup is enabled and the secret is configured. The current login path uses Supabase email/password directly and does not pass a CAPTCHA token; do not enable a separate Supabase-wide CAPTCHA requirement without verifying compatibility.
5. Verify Resend sender-domain DNS and sending authorization for the configured sender. Existing DB `email_settings` stores sender, reply-to and provider; these are not additional environment variables. Verify sender/reply-to, and inspect auth template previews. Built-in template fallbacks exist; auth sends bypass the product-email kill switch.
6. After separate authorization, configure Supabase Send Email Hook to `https://maro.al/api/webhooks/supabase/auth-email`, install its matching signing secret in the web service, and provide Resend access. The hook verifies the signature and supports signup, recovery and email-change actions. Do not assume invite/magic-link actions are implemented. It has no automatic SMTP fallback on a send failure.
7. Test recovery with an owner-approved mailbox only in an explicitly authorized email verification step. Flow: forgot-password → Supabase recovery → signed hook → Resend message → `/auth/callback` token hash verification → `/reset-password` → update password. The callback also supports authorization-code exchange, but the current recovery route does not persist a browser PKCE verifier; do not assume switching to the default mailer proves recovery works.
8. Verify login, callback redirects, confirmation, expiry/reuse errors and recovery. Enable public signup only under a later explicit instruction, after the send gap and dependencies are resolved, and rebuild for the public flag/site-key changes. No live emails were sent by the intended Phase 8A verification.

## Supabase and storage

Before deployment verification, confirm lifecycle readiness version 2, migration 0049 content/operations functionality, the accepted live Imazh and Logo prompts, and Flare/Sunburst/Logo prices of 5/5/5. No migration rerun is required by this phase. Review generation operations for pending/stale work before and after the first scheduled request.

`generations` must remain private. Migration 0035 restricts ordinary asset reads to owner paths and retains explicit public/admin prefixes. Uploads run through the server; history resolves private assets with short-lived signed URLs. `maro-public` must remain public for existing published/admin media (migration 0042). Neither bucket currently has a custom size/MIME restriction in its live bucket metadata; preserve app validation and review platform limits without changing privacy. Do not recreate or make `generations` public.

## Ordered Phase 8B deployment checklist

Execute only after separate owner authorization for Phase 8B. Incident review and disposition are complete; preserve that decision and all evidence.

1. Review the exact source revision and local checks; verify Railway project, web-service root, install/build/start settings, environment and disabled autodeploy while preparing changes. Inspect effective settings for legacy-file overrides.
2. Generate/store `CRON_SECRET` securely and share it between the web and scheduled service using secret references.
3. Set the canonical production origin, public build-time configuration, server runtime secrets and disabled signup policy. Keep payment settings frozen.
4. Prepare the separate reconciliation service using `/tools/reconciliation`, its Dockerfile, run-once command, no health check and no restart. Stage its ten-minute cadence without activating it before web readiness.
5. Deploy only the authorized web revision. This step is not authorized by Phase 8A.
6. Verify web health `/` returns 200 and the app listens on Railway's assigned port.
7. Verify `maro.al` DNS/TLS and production-origin redirects; do not accept a redirect in place of the cron endpoint.
8. Verify the production cron endpoint rejects missing/wrong bearer authentication with 401. A 503 indicates missing server configuration and blocks task activation.
9. Activate/deploy the scheduled task under the same authorization; execute an authenticated run, confirm its success acknowledgement and exit 0, then observe a real scheduled invocation. Confirm no provider request occurs.
10. Compare operations, history links, reserved credits and final charges before/after execution. Repeat a no-op invocation to verify no duplicate financial transition. Preserve reconciliation evidence without exposing secrets.
11. Owner signs into the app as an existing authorized admin and personally completes MFA in the browser. Inspect V1 prices/defaults, live prompt versions, Logo content and operations; open canonical preview. Preview only: no save/publish/price change/provider generation. Keep the session open for verification; never provide MFA secrets to the assistant.
12. Owner signs into the account owning the existing accepted result, opens Creations (`/krijimet`), opens that result and confirms its signed private asset loads. Correlate history, generation and job link with the completed five-credit job; verify the original failed job stays released and uncharged. Do not create a replacement generation.
13. Verify signup remains unavailable in UI and its API returns the controlled disabled response. Review the separate onboarding prerequisites above; do not enable signup in this checklist.
14. Verify Web, Filma, Audio/Zo, Marketing, Fort and standalone Chat remain parked/blocked. Recheck visible Imazh and Logo choices/prices without submitting a generation.
15. Record deployment evidence and outstanding auth/email items. No paid OpenAI call, real email, payment configuration or Raiffeisen work without separate scope and authorization.

## Do not configure yet

Payment and Raiffeisen remain frozen pending approval. Do not modify checkout, payment schema, providers or live payment mode. Deployment verification does not authorize payment integration or public signup.
