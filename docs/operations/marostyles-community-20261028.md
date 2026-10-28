# maroStyles — locally prepared community library

Prepared on 28 October 2026 from production source `f6a49caf089dd41d86b78637de2b28bb5500a3e3` in `maro-hub-live-20261015`. The user authorized publishing this revision only for `erzen@nice.al`. The existing pilot gate is unchanged; opening the feature to the community remains outside this release. Publication and database integrity receipts are kept in `../styles-release-20261028/`. Preparation and UI checks used synthetic provider responses and did not spend image credits.

## Result

- Proposed product name: **maroStyles**. Existing `/moods`, image-composer `moodId`, saves and generation contracts stay compatible.
- After user review, the initial pastel title rows were replaced by a thumbnail gallery matching Maro Presets: the existing typography scale, semantic surface colors, 4:5 image cards, understated author details, standard controls and filter tabs. The catalog has server-side search, pagination and All/Maro/Community/Saved/Mine filters. No uploaded reference badges are reproduced in the UI.
- Creation accepts a required raster thumbnail, a title of 1–40 characters, an original brief of 10–1600 characters, and public/private visibility. The exact original brief is retained separately from the expanded prompt.
- All user submissions, including private submissions, need approval before use. Approved private styles remain visible/usable only to their creator. Admin-created styles publish directly after automated checks with the authenticated account as creator and a separate platform badge.
- The admin panel uses existing `presets.manage` and MFA authorization. It shows thumbnails and original briefs, approves or rejects with a required reason, and can withdraw approval. It shows the exact original brief alongside the read-only generated prompt for each successfully prepared submission, including private styles. Processing/failed revisions show an unavailable message rather than a stale prompt. Creator edits remove approval immediately and require review again.
- Failed preparations can be edited/retried from Mine. Stale processing rows become eligible for owner retry after two minutes. Create request IDs avoid a second OpenAI call after a lost response. Optimistic timestamps prevent stale edits and reviews.

## Storage and API boundaries

Migration `0080_maro_styles_community.sql` is part of the authorized private pilot release. It extends existing tables without replacing prompts, deleting records or changing customer balances. It preserves restrictive RLS and service-role-only grants, assigns existing platform styles to the Erzen account where present, and adds a database constraint preventing activation without approval.

New thumbnails are normalized to WebP, bounded to 24 million input pixels and 1200px output, stripped of source metadata, and moderated before persistence. They remain in the existing private `generations` bucket under `_moods/<authenticated UUID>/<random UUID>.webp`. They cannot be signed through generic user-prefix media endpoints. Authorized library responses issue 120-second signed URLs; list refreshes renew displayed URLs every 90 seconds. Already-issued image capabilities can remain valid until that short expiry after access changes.

No client payload can set the compiled prompt, creator, platform attribution or approval. The generation resolver independently checks approval, activation and private ownership before any credit reservation. Shared API views explicitly allowlist fields and never return compiled prompts in catalog/saved lists, creation/edit responses or errors. Only GET /api/admin/moods adds generated_prompt after the existing pilot, admin permission and MFA checks, with private/no-store caching. It returns the latest successful prompt, not revision history; processing/failed submissions omit the retained prior prompt. The owner and authorized reviewer can see the original brief. Public catalog descriptions are a 180-character excerpt of the author's brief; account emails are not published.

The OpenAI integration requires the dedicated server-only `MARO_STYLES_OPENAI_API_KEY`; there is no fallback to a shared key. The user reported adding this key to Railway; no remote value was read or printed. `MARO_STYLES_OPENAI_MODEL` is configurable (default `gpt-6-luna`, matching the current Marketing text model). Responses are bounded, use `store:false`, and have automatic SDK retries disabled. Input and generated output are moderated. A strict durable rate limit allows 10 preparations and 30 uploads per account per day. Image-generation prices and settlement are unchanged. Token usage records describe the latest successful compilation.

Official OpenAI documentation checked: [text generation](https://developers.openai.com/api/docs/guides/text) and [text/image moderation](https://developers.openai.com/api/reference/typescript/resources/moderations/methods/create).

## Validation

- Full existing + feature regression run: **2,012 passed**, 11 existing skips. Then the seven new AI tests and five new upload tests passed independently: **2,024 passing assertions/tests in aggregate**.
- Six focused style suites cover migration/RLS, exact original input, prompt secrecy, private ownership, all unavailable states, moderation, raster validation, daily limits, duplicate requests, reapproval, stale reviews and safe errors.
- TypeScript, full ESLint, UI audit, token mirror, 96 existing contrast checks and production build passed. All 26 reconciliation tests passed.
- The Windows sandbox initially blocked Vitest's temporary-file rename, Next's `.well-known` output, browser launch and reconciliation loopback networking. Workspace-local temp files resolved the test cache issue; approved normal-permission local build/browser/reconciliation runs resolved the remaining environment restrictions. No application bypass was added.
- Browser QA bundles the actual components against synthetic auth/API responses, without real credentials or provider calls. It checks desktop and 390/320px layouts in both themes, no horizontal overflow, search, saving, saved filtering, use handoff, pending-use blocking, private creation, admin rejection, mobile dialogs and the existing pilot gate. Images and forms were visually inspected. It does not verify an authenticated live admin or real OpenAI output.
- Runtime on this machine is Node 24.15.0; package engine expects Node 22. Build and checks passed with the existing mismatch warning; no runtime/dependency settings were changed.

Local evidence: `C:/Users/nicep/Desktop/maro-al/styles-qa-20261028/`. The preview uses synthetic authors/thumbnails, clearly labeled as local demonstration data. It is separate from the production application and database.

## Design revision after review

Revised evidence is in `C:/Users/nicep/Desktop/maro-al/styles-redesign-20261028/`. This preview bundles the actual `/moods` page, AppShell and AppTopNav against synthetic identity/API responses. Example thumbnail images come from existing local Maro artwork in `maro-hub-concept/public/assets/`; they are fixture data only and do not replace live style covers or seed database content.

The revised gallery, search and standard controls were visually checked in both themes at 1440px, 390px and 320px. Browser checks pass for selection handoff, search, saving, saved filtering, private creation, original input, pending-use restrictions, admin rejection, mobile forms and the unchanged pilot boundary. No page errors or horizontal overflow. TypeScript, focused ESLint, UI audit and the revised production build passed. The 59 focused API/preparation/upload tests passed, including a strengthened assertion that a shared `OPENAI_API_KEY` cannot be used when the dedicated Styles key is absent. No live AI request, migration or publication was performed during this revision.

## Before a community release

The current authorization covers applying migration 0080 and publishing with the existing Erzen-only gate. Obtain separate approval before opening that gate to other accounts. Verify the actual live baseline and database before applying the additive migration. Do not deploy the updated application against the old schema. Preserve existing data, credits and private pilot boundaries for other products.

Release validation found a newly updated [qs advisory](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) in the existing MCP dependency tree. The release pins the patched transitive version 6.16.1; the production audit then reports zero vulnerabilities. The read-only Railway CLI session was unauthorized during release, so key configuration is user-reported unless independently confirmed in subsequent receipts. GitHub's existing Railway connection remains the publication path.

Useful follow-ups after the initial release: report-abuse actions, creator notifications, category tags, an example image for each style, and scheduled cleanup of unused private thumbnail uploads. Style deletion currently deletes the style and cascades saved references; it does not garbage-collect image objects. Newly uploaded covers are private and inaccessible to other accounts without an authorized short-lived capability.
