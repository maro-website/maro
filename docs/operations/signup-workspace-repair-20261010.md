# Signup workspace repair — 10 October 2026

Signup returned `auth_temporarily_unavailable` after the V1 release. Supabase Auth
creates a profile and the first workspace before the new account has a user JWT.
Migration 0057 added an ownership check to the public `resolve_workspace_limit`
RPC, but the existing workspace INSERT trigger still called that public wrapper.
The missing JWT caused `workspace_limit_not_authorized`, rolling back signup
before the confirmation email step.

Migration `0060_signup_workspace_bootstrap.sql` changes the trusted
`enforce_workspace_entitlement` trigger to call
`resolve_workspace_limit_internal`. The public ownership check, function
permissions, plan calculation and workspace count limit remain intact. There is
no UI change, new service or paid operation.

Validation:

- The regression test failed with `workspace_limit_not_authorized` before the fix.
- 39 tests passed across signup bootstrapping, the full public schema baseline,
  V1 SQL boundaries and public authentication routes.
- The local PostgreSQL fixture executes the real signup and workspace triggers
  as `supabase_auth_admin`, with no JWT and with unrelated JWT claims.
- On production, a synthetic insert with empty JWT claims reproduced the same
  failure. After applying 0060, it created the profile, one workspace and the
  active workspace reference; an extra free workspace still failed with
  `WORKSPACE_LIMIT`. All synthetic rows were rolled back.
- Production probes use `postgres`, the SECURITY DEFINER trigger owner. The
  managed `supabase_auth_admin` role cannot be assumed by the SQL connection;
  that exact role is exercised in the isolated local fixture.
- Public/internal calculator bodies and execution permissions were unchanged.
- A verified full database backup was taken in the authorized private release
  folder before the migration. No customer rows or secrets are in this report.

The SQL repair was committed to production at 22:17 UTC on 9 October (00:17
Berlin on 10 October). These probes do not send email or complete a browser
signup; the customer signup and email confirmation still need a human retry.
