# Signup abuse protection

The browser's Supabase publishable key is intentionally public. Protect access
with existing RLS and service-only admin functions, and enforce signup policy at
the Auth boundary so scripts cannot bypass the Maro form.

## Native signup policy

Migration `20261101033155_auth_signup_protection.sql` adds
`maro_auth_hooks.before_user_created(jsonb)`. The hook is immutable, runs with
invoker permissions, and does not read or write customer tables. Only
`supabase_auth_admin` receives schema usage and function execution. It denies
anonymous creation, curated disposable domains, their subdomains, and reserved
test/documentation domains. Existing non-email provider flows are preserved.

Configure the Before User Created hook as
`pg-functions://postgres/maro_auth_hooks/before_user_created`. Preserve the
existing Send Email and custom JWT hooks. When changing the domain list, update
`src/lib/security/disposable-domains.json`, create a new migration for the
function, and run the parity/database tests. Do not edit an applied migration.

The existing service-only admin directory now returns authoritative email
confirmation, last sign-in, and ban timestamps from `auth.users`. It retains
its permission checks, pagination, plan and quota behavior.

## CAPTCHA rollout

The compatible default is `SUPABASE_AUTH_CAPTCHA_ENABLED=false`: Maro continues
its existing local Turnstile verification. The updated browser sign-in also
collects a fresh token, while signup, resend and recovery forward their tokens
to Auth. Tokens reset after an attempt and a mode change.

After this code is live, set `SUPABASE_AUTH_CAPTCHA_ENABLED=true` on the same
Railway WEB service and wait for the deployment to succeed. Then enable native
Supabase Auth CAPTCHA with the existing matching Turnstile secret. Do not
enable native CAPTCHA while the server still locally consumes the token: a
Turnstile token can be verified only once. Keep the configuration transition
short and verify signup, sign-in, resend and recovery. Retain existing email
confirmation and application rate limits.

Native mode rejects absent/oversized tokens locally, delegates cryptographic
verification to Supabase, and renders its CAPTCHA rejection safely. Do not
rotate a publishable key merely because it is visible. Never expose service,
provider, email or Turnstile secret keys in client code or evidence reports.

## Safe rollback

Keep this compatible application version while reversing native CAPTCHA: first
disable native CAPTCHA in Supabase, then return the Railway flag to false.
Existing customer data and the directory extension need no rollback. If the
signup hook itself must be disabled, disable only Before User Created; leave
the existing email and JWT hooks enabled. Leave the inert private function in
place rather than removing a schema with dependencies. The previous directory
definition is backed up outside the repository in the release evidence folder.

All database changes use short transaction, lock and statement timeouts. No
database reset, customer-table migration, provider-key rotation, generation,
payment, credit or asset change belongs to this rollout. Reconcile newer
production commits before releasing or reverting; concurrent maroFeed work
must be preserved.
