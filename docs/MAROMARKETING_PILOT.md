# maroMarketing private pilot

Restricted in client, authenticated APIs and reservation SQL to confirmed `erzen@nice.al`. Public module availability stays parked. `/marketing` is noindex and shows the existing upcoming page to other accounts. Private navigation is in the Hub menu and mobile drawer. Feed and Apps retain their standalone pilots, configuration, billing and cancellation lifecycle.

## Workflow

Select the active Brain, create a 9-post campaign over 14 or 30 days, and optionally run one current web search. The server reads only the owned workspace Brain and relevant memories. A usable brand name/description and existing Brain access are required. Generated text is a draft, with dated research evidence or an explicit non-research mode.

The main screen opens the latest saved campaign and shows its post cards with one image-generation action. Brain selection and creating another campaign stay in the header. Strategy, research and sources are collapsed; socials, usage, exports and standalone pilots are secondary controls. New campaigns require only a focus/offer and language; channels, dates and goals have editable defaults. Explicit offers in the user's focus/title are authoritative without requiring duplicate entry in a separate offer field.

Image generation opens a compact photo picker. It lists owned private image sources from the selected Brain or uses the existing signed-upload flow. Brain context and campaign direction are prepared automatically. Optional app mode takes actual screenshots, their OS and a real capability, then uses the existing Apps pipeline. Completed images are imported into their corresponding posts automatically. Reload restores the latest linked feed; partial jobs resume without buying another order. Approval survives repeated imports of the same image; replacing an image returns only that post to draft. Existing feeds and unlinked feeds cannot be attached accidentally.

Long imported Brains previously failed before image creation: the observed OLIPOP context was 27,768 characters (SQL limit 24,000), and its audience was 789 characters (brief limit 300). A shared compact context prioritizes brand constraints, voice, offering and evidence; image brief fields are bounded separately. The feed stores only its campaign ID and reads the assigned post from the owned campaign at generation time, keeping all nine long posts out of the SQL brief-size budget. The actual saved OLIPOP Brain now passes these boundaries. Regression coverage exercises the create API through real reservation SQL, idempotent charging, the first claim, automatic import and interrupted browser resume. Live provider image output remains separate from these deterministic checks.

Each post retains its hook, caption, CTA, visual direction, metric, channel, date and time. Editing shows the copy first, with further settings collapsed. Copy/calendar changes use revision checks. Approval saves the reviewed version and never publishes automatically. CSV export protects formula-leading cells.

## Provider and cost isolation

- `MARO_MARKETING_OPENAI_API_KEY`: required dedicated OpenAI Project key. Marketing text, research and linked Feed/Apps image edits all use it, with no fallback to the general platform key. Standalone Feed/Apps retain their existing key.
- Text: `gpt-6-luna`, low reasoning, bounded input/output, no SDK retries, no stored Responses conversation. Rate snapshot verified 2026-10-26: $0.10/M input, $0.01/M cached input, $0.50/M output; web search $0.01/call plus content tokens. Actual token counts and search calls are saved even on invalid provider output. These are usage estimates, not provider invoices.
- Reservations: $0.10 per attempt, account-wide $2/day and $10/month for text/research. The SQL guard serializes reservations across Brain boundaries, binds request IDs to input fingerprints and keeps uncertain attempts conservatively reserved. Berlin period boundaries handle DST. Stale generations recover as failed without silently releasing possible spend.
- Image costs: read existing durable job accounting for campaign-linked Feed/Apps only. Existing image budgets and credit prices remain: 50 credits/9 images, 3 successful free regenerations then 5 credits. Text limits do not cap image spend. Missing image costs remain marked unknown. Initial setup credits and cancellation refunds retain the existing ledger; the marketing tracker never modifies balances.

## Socials

`MARO_MARKETING_ZERNIO_API_KEY` is server-only. One provider profile maps to one owned Brain. Profile creation uses a deterministic external ID and idempotency key. OAuth and account selection use Zernio's hosted UI; only posting scopes are requested where supported. Callback query strings are never trusted as proof of a connection; accounts are reread and filtered against the exact stored profile. Social access/refresh tokens remain with Zernio.

Coverage includes Instagram, Facebook, TikTok, LinkedIn, X, Threads, Pinterest, YouTube, Bluesky, Google Business, Telegram, Discord and Slack. Snapchat is beta-restricted and Reddit is currently provider-restricted; connection controls state this. Available account types, permissions and media formats still depend on the network. Instagram uses professional accounts via Instagram Login. Facebook uses Pages. YouTube can connect but publishing requires video, which is outside this image-focused release.

Publishing requires a matching active account, current campaign revision, approved post, owned image and explicit consent. Captions are validated against the network's conservative limit without silent truncation. A publication stores an immutable snapshot and a durable unique campaign/post/account key before contacting the provider. The same provider idempotency key protects dropped responses. Explicit recovery replays only that snapshot, within 23 hours of the provider's 24-hour guarantee; later ambiguous outcomes require manual provider inspection. No automated republishing occurs. Scheduled posts run at Zernio while Maro is closed. Scheduling accepts 5 minutes to 60 days ahead; calendar inputs are interpreted in Europe/Berlin and nonexistent DST times are rejected. Cancellation checks remote scheduled status, never unpublishes an already published post, and revokes its temporary image URL.

TikTok AI photos use Creator Inbox draft delivery. The dialog rereads creator information, requires user-selected privacy and commercial disclosure, respects disabled comments, requires preview/express/music consent and adds no automatic music. The user finishes in TikTok and applies the AI disclosure there; direct AI-photo publication through the provider's Business lane rejects the AI flag. UI distinguishes draft delivery from public publication.

For social delivery, only an explicitly selected generated image becomes accessible through an unguessable 256-bit capability URL. The database stores its hash, expiry and immutable asset identity. The endpoint returns a normalized JPEG, checks owner/path/bucket and expiry, never accepts arbitrary fetch destinations, and expires seven days after the scheduled send. Cancellation expires it immediately. The normal private asset URL and other Brain content are never shared. Provider keys, raw social errors and internal snapshots do not reach the browser.

Social subscription cost is separate from AI. Current Zernio tiers: first 2 connected accounts free team-wide; accounts 3–10 $6 each/month, 11–100 $3, then $1. A five-network pilot costs about $18/month before X pass-through; the in-product calculator shows scale examples. X adds per-operation charges; background analytics/DM polling is not requested. No subscription or payment setup is purchased by deployment. Only the owner can authorize connections in the pilot.

## Release and rollback

Migration `0079_maromarketing_private_pilot.sql` adds three RLS-protected service-only tables and two service-only functions. It does not replace any existing function or alter credits, workspaces, feeds, generations or saved customer content. Validate with local PGlite, a rollback-only production integrity preflight, then apply the same hash. Keep the baseline archive and prior releases. Roll back application source with a normal revert after reconciling newer production work; retain compatible private tables, usage evidence and publication records. Before removing an integration, inspect or cancel its provider schedules; reverting the UI does not cancel already authorized scheduled posts.

Checks: local full test suite, focused authorization/accounting/social tests, lint, TypeScript, UI/tokens/contrast, production build and synthetic actual-component browser cases. Real social accounts and live posting require the owner's OAuth consent; tests never publish to an account or spend image credits. Validate key availability with synthetic content only, without real Brain data. Source/release evidence lives in `../marketing-pilot-20261026`.

The existing production commit's CI failed on nine dependency advisories. Publication also updates Next/eslint-config-next to 15.5.28, Zod to 4.6.7, Puppeteer to 25.16.0 and targeted transitive body-parser/ip-address/fast-uri patches. The new Puppeteer uses Zod 4 without forcing a major-version override onto a Zod 3 consumer. Audit reports zero vulnerabilities; keep these security corrections during application rollback.

The patched Next build exposed a Google Fonts response/URL parsing failure in the existing maroLogo preview fonts. Restore only the same locally bundled font assets and licenses from `03c511f988046607fb5185af4188c653c62b856d`; do not restore its surrounding maintenance mode. This makes builds independent of Google Fonts network responses while preserving the existing font families and weights.

## Official sources checked 2026-10-26

- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://docs.zernio.com/pricing
- https://docs.zernio.com/connect/get-connect-url
- https://docs.zernio.com/profiles/create-profile
- https://docs.zernio.com/accounts/list-accounts
- https://docs.zernio.com/posts/create-post
- https://docs.zernio.com/posts/delete-post
- https://docs.zernio.com/platforms/tiktok/fields
- https://docs.zernio.com/accounts/get-tiktok-creator-info
- https://developers.tiktok.com/docs/en/content-sharing-guidelines
