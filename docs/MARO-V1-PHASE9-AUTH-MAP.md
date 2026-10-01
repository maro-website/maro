# Phase 9 — auth map before changes

Observed 2026-09-18, before implementation. Signup remains disabled.

| Flow | Existing source and behavior | Gap |
| --- | --- | --- |
| Public signup | `sign-up/page.tsx` → `AuthPanel` → `context/store.tsx` → `/api/auth/signup`; flag, strict IP rate limit, password/disposable-email checks, server Turnstile → service-role `admin.createUser(email_confirm:false)` | No confirmation delivery initiated; raw provider errors returned; UI navigates away from confirmation notice |
| Account bootstrap | Latest `handle_new_user` in migration 0018 creates one profile and default workspace, assigns active workspace | Ordinary users receive 0 credits. Existing owner-email special case grants admin/100000; preserve policy. No signup membership/order/payment creation |
| Login/session/logout | Store uses Supabase SSR browser `signInWithPassword`, auth-state listener/profile refresh, `signOut` | Preserve mechanism; replace raw login errors with safe messages |
| Confirmation | Canonical `/auth/callback` verifies token hash or exchanges PKCE code and writes SSR cookies | Existing redirect sanitizer; malformed combinations and arbitrary logged OTP type need hardening |
| Recovery | `/forgot-password` → rate-limited server route → stateless client `resetPasswordForEmail` | No verifier cookie; CAPTCHA skipped when signup disabled; SDK result ignored |
| Password update | `/reset-password` reads local session, browser `updateUser` | Validate user remotely, handle missing config/failures safely, then return to sign-in |
| Auth email | Signed Standard Webhooks route → `authHook.ts` → existing templates/logging → Resend | Repo intentionally implements hook delivery. Nested callback redirect becomes an invalid second callback. Auth resend idempotency is keyed only by user/action; Resend key is currently put in message headers rather than SDK request options |
| MFA | Existing admin session/layout and permission guards use `assertAdminMfa` | Preserve; owner completed real MFA during Phase 8B |
| Origin | `getAppOrigin`/`buildPublicUrl` prefer APP_ORIGIN; safe internal redirect helper | Canonical production domain is maro.al |

Production presence inspection: missing `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`; all other nine requested auth names present. Signup explicitly disabled; canonical origin matches. Hook secret presence alone does not prove Supabase hook activation. Dashboard configuration still requires inspection; no dashboard mutation authorized yet.

Chosen implementation: existing signed Send Email Hook → Maro → Resend, with Supabase initiating signup/resend/recovery. No second delivery system or automatic SMTP fallback. Preserve cookie-backed PKCE support for the canonical callback instead of assuming browser verifier state.

References: [Supabase signup](https://supabase.com/docs/reference/javascript/auth-signup), [resend](https://supabase.com/docs/reference/javascript/auth-resend), [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), [SSR flow](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [Resend request idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
