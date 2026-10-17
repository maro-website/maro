# Private maroBrain Studio pilot

Enabled only for the existing verified `erzen@nice.al` owner identity. The existing plan and workspace ownership policy still applies. Other accounts keep their existing Brain editor and cannot use `/api/brain/memories`.

The pilot adds the approved sidebar layout, compact brand overview, section-specific copy/paste prompts and manual memory cards. Existing profile autosave, local draft recovery, private logo/reference storage and Fetch Brand are reused.

## Memory persistence and use

Cards use the existing `maro_brain_memories` append-only revisions and conflict-aware `maro_mcp_remember` RPC. No database migration, extra table or infrastructure is required. A versioned `[maro-memory-card:v1]` payload stores plain content and validated title/type/scope/subject/keywords/expiry/archive metadata together, within the existing 4,000-character storage limit. Legacy plain-text memories remain readable. A malformed latest card never resurrects an older revision. Retention reset/deletion continues to use the existing table cleanup. An archive is a reversible new revision; permanent forgetting through the existing authorized MCP tool still deletes all revisions.

The UI and endpoint validate lengths and real calendar dates, require explicit account identity, check owner and paid policy, reject an outdated reset snapshot, and rely on the existing transactional RPC for revision/plan checks. Stale edits return a conflict and retain the draft. RPC retries are idempotent. The existing maximum of 2,000 memory revisions per workspace is unchanged.

Expiry includes the indicated calendar day in Europe/Tirane. Archived/expired entries are excluded from current context. Brand-wide rules apply broadly; scoped memories require a subject/keyword match. Other facts require relevant query terms. Selection is deterministic, capped at 8 entries and 6,000 serialized characters, without models or embeddings. Selected memories are framed as user-entered data, subordinate to current/system instructions. Contradictions are surfaced for clarification, not automatically reconciled as facts.

Pilot memories join only explicitly opted-in canonical Imazh context and the copied section prompts. No change enables Brain for Logo, Web or unreleased Marketing. The pilot MCP search decodes cards and excludes archive/expiry; explicit MCP edits preserve the card metadata. History remains distinct from current context.

## AI handoff and cost

No AI API calls, background agents, new providers, credit deductions or recurring model costs are introduced. Copied prompts exclude signed asset URLs and storage paths, include bounded known profile/memory context, distinguish suggestions and request section-specific JSON. Parsing is local, strict and limited to the chosen section. Existing values are unchecked by default; users review before applying through existing autosave. Copy failure offers selected text for manual copying. Sources get a photo preparation prompt; users still upload their actual images.

The previously requested shared EUR 1/account/month budget remains a prerequisite for any future paid agent feature. This pilot does not implement or invoke one. Existing opted-in image generation remains on its current credit/model flow.

The answer importer accepts a whole JSON block, optionally fenced with Markdown. A bounded local fallback tolerates trailing commas before closing objects/arrays, a reproduced external-AI formatting issue. It skips quoted/escaped strings without changing their contents and still uses JSON.parse; it does not evaluate code, infer missing values or accept other syntax repairs. Both paths keep the same section/version/key/type/enum/length checks, suggestion labels, explicit review and stale-profile protection. Incomplete or otherwise invalid JSON gets copying guidance and remains editable. Prompts explicitly request valid JSON without trailing commas. Regression evidence and the exact reported target answer are in `brain-prompt-import-20261017` and the test fixture.

## Rollout and rollback

### Private refresh, 17 October 2026

Memory type, scope, keywords and expiry are visible in the editor instead of hidden in a disclosure. Brain logo surfaces share a bounded 64×64 pixel contrast calculation and independent light/dark artwork mats, with manual preview choice; the original transparent asset stays unchanged. CORS failures retain a plain image fallback. The dotted identity panel uses the existing semantic tokens; literal white/black mats are a narrow artwork-presentation exception, not application chrome. Social channel cards offer 18 platforms and recognizable utility icons while retaining imported/custom platform values.

Fetch Brand now separates text, visual identity/socials and final review into three steps. Existing selection rules, zero-AI extraction and large-page bounds remain. Ten optional marketing context fields cover offering, mission/values, buying triggers/objections, timeframe, pricing/proof and CTA/examples; old profiles retain their shape until those values are entered. The normal header Save button is replaced by autosave status and an explicit retry on save errors.

Burimet is an image library with folders, multi-upload (20 at once, existing 5 MiB raster limit and quota), search, metadata editing, multi-selection/moves and confirmed deletion. Folders organize the library; reference matching still uses keywords, independently of folder selection. Account-wide storage usage is visible and refreshed after upload/deletion. Photos and logos have always passed the existing upload quota and storage-object trigger. New deletes also remove physical workspace assets instead of deleting only the source row. Failed attachment cleanup protects current references and historical brand logos.

The private library loads up to two metadata pages for the 2,000-source pilot cap. Cards appear in batches of 48, images load lazily, and only displayed private refs are resolved in deduplicated batches within the existing 50-ref API limit. Opening the library does not sign or download its entire collection. A valid admin storage cap of zero is accepted by the shared policy parser, preserving paid text access while the existing upload quota blocks new bytes.

Apply additive migration `0071_private_brain_studio_library.sql` to the existing main database before deploying WEB: it adds scoped folders, a nullable source folder id and service-only, pilot/owner/plan/reset-aware transactional operations. No existing user data is cleared by applying it. Whole-Brain and category-only clears require explicit UI acknowledgement; they invalidate stale drafts with a new reset epoch. A category clear scrubs that category from profile history and preserves unrelated categories/memories. Whole-Brain clearing removes profile/history/memories/folders/references, preserving the workspace and generation outputs. Storage removal uses the existing retry queue; at most 200 objects are removed inline, with larger/failed cleanup continuing under the existing reconciliation schedule. Shared references in other workspaces are protected. No new reconciliation service or paid AI work is introduced.

The new UI and endpoints remain private to the verified pilot account. After a clear, the selected category stays open; a whole reset returns to explicit Brain creation. Validation and release evidence are under `brain-refresh-20261017/` outside the repository. For rollback, revert only the WEB changes normally; retain the additive schema, folders and all user data. Do not drop the new table/column as an automatic rollback.

Deploy only to the existing Railway WEB service after the repository checks and synthetic desktop/mobile/theme tests pass. Do not open the gate publicly as part of this release. Back up the current production commit and record release/live verification in `brain-studio-pilot-20261016` outside the repository.

Rollback is a normal revert of the pilot commit, preserving any later work. Cards remain in the existing history store and become hidden in the old UI. No destructive database rollback or environment change is needed. A later public rollout should migrate the versioned payload into first-class typed metadata if broader filtering/reporting needs it; keep the format adapter backward-compatible.
