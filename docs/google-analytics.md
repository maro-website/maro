# Maro web analytics

GA4 account **Maro** (`412154667`), property **maro.al** (`559147940`), web stream **Maro · Web** (`16135183211`). Created separately from existing accounts on 15 October 2026. Public measurement ID: `G-177NLLQ6JX`.

## Deployment

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-177NLLQ6JX` on the existing Railway **maro web** service, at build and runtime. Empty disables loading and removes Google from the CSP. Only `maro.al` and `www.maro.al` load the tag; localhost and preview hosts never send production analytics. No extra package, infrastructure, database migration, API credentials or paid Analytics plan is needed.

The server layout passes the existing request nonce to the client loader. CSP permits only the exact Google tag and collection hosts. Production script protections remain intact.

## Consent and data minimization

- Basic consent mode: no Google script or analytics requests before affirmative consent. Old informational cookie notice dismissals are not consent.
- Accept and refuse are adjacent; preferences reopen from both app/hub footers and the cookies policy. Refusal never prevents using Maro. Withdrawal disables measurement, removes only GA cookies, then reloads to remove the library's timers. Cross-tab changes and consent expiry are honored.
- Do Not Track and Global Privacy Control disable analytics even if an older choice granted it.
- Consent and analytics cookies expire after 180 days. GA cookie lifetime does not renew on activity.
- Only reviewed static routes in `src/lib/analytics/web.ts` are measured. Admin, account, private projects, dynamic user/content links, OAuth, password reset, order and checkout pages are excluded.
- All page locations use canonical `https://maro.al` paths with no query or fragment. Titles are fixed; external referrers contain only the origin. No user/workspace ID, email, name, prompt, image, search, form value, error message or financial identifier is sent.
- Manual SPA `page_view` events avoid duplicate initial/history events. Tag defaults and sanitized page/referrer config are queued before the external script loads. Measurement is disabled before private route content paints.
- No purchase/signup claims are inferred from URLs. Existing first-party operational statistics remain separate.

## Google-side settings

Keep **Enhanced measurement OFF**, including history page views, form interactions, site search, outbound clicks, file downloads and video events. Enabling those can collect raw URLs/content outside the reviewed manual tracker. Google Signals and user-provided data collection remain OFF; ads personalization is disallowed in all regions. Optional account data sharing is OFF. Granular location/device collection is OFF. No Ads integrations were added. Google-side email redaction and 25 sensitive query-key redactions are also enabled as a fallback; the application already strips every query and fragment before sending.

Event and user data retention are 2 months, with reset on new activity OFF. Standard aggregated reporting is not governed by those event/user retention limits. Reporting timezone: Europe/Berlin (same clock as Kosovo); currency EUR. Agreement country Albania was selected by the owner because Google's selector omitted Kosovo; the owner explicitly authorized the terms at the acceptance step.

## Reports and limits

[Open Maro Analytics](https://analytics.google.com/analytics/web/#/a412154667p559147940/reports/intelligenthome). Use Realtime for current visitors/pages, acquisition reports for referral sources, and engagement/pages reports for page popularity. Set the date range for daily visits or comparisons. Users, sessions and views measure different things; several views can come from one visitor.

Reports start with this installation; past visits cannot be reconstructed. Consent refusals, privacy signals and blockers mean this is a consented traffic sample, not a complete access log. Aggregate business metrics in the admin panel still use the existing first-party system. Standard reports may take 24–48 hours to populate.

## Verification and rollback

`src/lib/__tests__/web-analytics.test.ts` covers consent expiry/invalid values, blocked private routes, sanitized URL/referrer payloads, no commands or loading without consent, one page view per route, withdrawal, and nonce/CSP restrictions. Before release run the repository's lint, typecheck, full suite, UI audit, tokens, contrast and build checks; inspect mobile/desktop banner behavior and both themes.

To pause new collection, empty `NEXT_PUBLIC_GA_MEASUREMENT_ID` on the web service and redeploy/rebuild. Do not delete the GA account or existing reports. The pre-analytics source is commit `a16fe3393c7639faa26ad8bb791898e7a686d744`; release evidence and a baseline source archive are stored outside the repository in `analytics-release-20261015`.
