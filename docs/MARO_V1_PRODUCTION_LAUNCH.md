# Maro V1 production launch — 1 October 2026

The user explicitly replaced staging verification with production rollout. No staging project was contacted after that instruction.

**DEPLOYED; LEFT LIVE.** Production web deployment `394f9fdf-ff98-4f4c-b902-a9ea473298a3` is SUCCESS and running commit `3b086a668e440a9bd04651262e6895cb45697933`, branch `recovery/maro-v1-20260930`. Railway is connected to that branch. The reviewed source's 1,170 file hashes matched before publication; no application source changed and the full suite was not rerun.

**SIGNUP LIVE.** Web build/runtime `NEXT_PUBLIC_SIGNUP_ENABLED=true`, `PUBLIC_LAUNCH_MODE=live`; production Supabase `pbhzobqpavkuttdipjaq` reports signup enabled and email confirmation required. The browser displays the signup form. Missing CAPTCHA returns `403 turnstile_required`, demonstrating the enabled endpoint with its protection intact. A real accepted signup with a valid Turnstile token is awaiting the requested human browser check; acceptance and email delivery are not claimed as verified.

| Fast production check | Evidence/result |
| --- | --- |
| Exact candidate | Railway deployment metadata contains the exact approved commit; `/ui-release.json` serves `v1-recovery-20260930`. Its frozen descriptive registration field predates the live environment flags. |
| Homepage, login, signup | `/`, `/sign-in`, `/sign-up`: HTTP 200; signup form visibly enabled by configuration. |
| Security headers | CSP, HSTS, nosniff, DENY framing, Referrer-Policy and Permissions-Policy present on checked routes. |
| Core routes | `/imazh`, `/marologo`, `/brain`: HTTP 200. No production provider generation or financial test performed. |
| Purchase quarantine | `/api/payments/paddle/checkout`: HTTP 404 `purchases_unavailable`; public Paddle flag false. Existing billing/backend secrets retained. No Paddle transaction or API action. |
| Reconciliation | Deployment `dfe2d4e0-5852-4ec1-bd1d-cf2aa30a1596`: SUCCESS, stopped after execution. Effective builder DOCKERFILE, root is the uploaded runner directory, Dockerfile `Dockerfile`, start `node run.mjs`, schedule `*/10 * * * *`, restart NEVER, no healthcheck/predeploy. `APP_ORIGIN=https://maro.al`; runner/web CRON_SECRET present and equal. Runtime logged `reconcile_succeeded`, HTTP 200, 1,344ms at `2026-09-30T22:42:19.399269043Z`; runner source requires the expected JSON acknowledgement before this log. No manual repair request was sent. |

Runner upload came from `git archive` of the approved commit's `tools/reconciliation`; contents match the committed source and reviewed worktree (Windows CRLF conversion only). Application migrations, production schema and maro-labs were not changed.

**Critical failures observed: none. Immediate attention: complete the requested real production signup browser check.** No signup flag was disabled and no rollback was performed.

Evidence is saved in `C:/Users/nicep/Desktop/maro-al/production-launch-20261001/`: `current-deployment.json`, `public-smoke.json`, `production-config-before.json`, `production-config-after.json`, `runner-runtime.txt`, `runner-source-proof.json`, `signup-http-proof.json`. Secret values are excluded from these evidence files; private variable backups remain in the local temporary directory.

## Subsequent requested Qelt / Mshelt update

The user's later instruction added a theme switch as the first item in the profile dropdown. Mshelt (dark) is the default; explicit Qelt/Mshelt choices persist per account in this browser, survive refresh, and are isolated when switching accounts. The old forced Qelt value is ignored. Semantic colors cover the app, dropdown and mobile composer/result.

Production deployment `30dafcaf-fbe7-44a0-928c-c2e3bb871169` is SUCCESS and running commit `fdb52d737ba7a2ab91a46fc61d7cb2509601bba2`. Production homepage is HTTP 200 with SSR Mshelt, saved-preference bootstrap, dark CSS palette and CSP. Six focused tests, typecheck, lint (three existing warnings) and production build passed; the actual menu/provider were checked in a local fixture for first-item placement, both themes, refresh, account isolation and 390px mobile layout. Signup/live flags, billing, reconciliation, schema and staging were not changed during this theme update. Evidence: `docs/evidence/theme-switch/verification.json` and `production-launch-20261001/theme-deployment.json`, `theme-public-proof.json`, `theme-build.txt`.
