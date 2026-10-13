# maroMood private live beta

Base: Railway WEB deployment `42fc607e-ebbc-4ba7-83ce-f86dd4c76575`, commit `413aac82b51068f030fd9210c9b574bc5b862576`. The implementation checkout was created directly from this commit. No local prototype or uncommitted source was copied.

Only `erzen@nice.al` can view/use the feature. Client navigation uses the same eligibility rule as the API; generation verifies the authoritative Supabase Auth account independently before resolving a mood or reserving credits. Admin management additionally retains `presets.manage` and the existing MFA gate. Other accounts cannot list/save/upload/administer moods or apply one by manually submitting its ID.

Admin: `/admin/engine/moods`. Catalog: `/moods`. Saved moods: `/krijimet?category=moods`. The maroImazh composer has a square selector to the left on desktop and above on mobile. Its popup starts with saved moods, with a separate “Gjej moods” catalog. Selection automatically saves the mood, keeps the existing prompt/preset/references, and can be removed or replaced. The selected ID persists per account/workspace/conversation in the current browser session.

The server resolves the active mood once, freezes its content hash with the request and appends the theme after the complete canonical prompt. It adds an explicit product, brand and label preservation instruction. Prompt-length validation still runs against the final provider payload before financial admission. Private mood instructions never appear in the catalog or owner-readable job metadata. Requests without a mood retain the same canonical prompt and provenance. Prices, providers, models, attachments and credit settlement are unchanged.

Migration `0067` adds only `maro_moods` and `maro_mood_saves`, with service-role-only access and RLS enabled. It seeds Halloween and 28 Nëntori. Cover uploads are validated raster files under the intentionally public `public/moods/` prefix of `maro-public`; user references continue to use private storage.

Validation: access/API/compiler tests; disposable PostgreSQL migration, permissions and save-cascade checks; full regression suite (the existing Windows SQL fixture needed line-ending normalization for its hash check, with no source content change); typecheck; lint; Node 22.23.3 production build using live Railway variables held only in process memory. Live-schema migration preflight was fully rolled back and verified unchanged existing row counts. Actual new components were checked on desktop and 390px mobile using a disposable fixture outside the checkout, including save/select/reopen and admin creation.

Product/label fidelity is a model instruction and must be evaluated on actual product generations during this private beta. No paid generation is required to deploy or check API access. Public rollout requires an explicit follow-up decision; do not expand `canUseMoods` as part of unrelated work.

Rollback: redeploy the recorded base WEB commit. The two additive mood tables can remain dormant; do not remove saved mood data or reset existing database/storage. The reconciliation service is not a deployment target.
