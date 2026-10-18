# maroBrain

The sidebar editor, Fetch Brand, section prompts, memory cards and folder-based source library are available to every authenticated account with an active maroStandard or maroPro plan. No owner ID, email allowlist or client-side rollout override grants access. The existing account policy, workspace ownership, storage quota, rate limits and retention rules remain authoritative.

`0073_brain_studio_public_rollout.sql` replaces only the existing service-only `maro_studio_lock` function. It removes the former account allowlist and retains active-plan, workspace-owner and reset-epoch checks. Its execute privilege remains restricted to `service_role`; neither authenticated clients nor anonymous callers can invoke the library mutation functions directly. Existing profiles, memories, folders, source records and files are preserved. Apply this migration to the existing main database before the WEB rollout.

## Memories and context

Memory cards retain the versioned `[maro-memory-card:v1]` format in the existing append-only memory table. Legacy plain text remains readable. The latest malformed revision never resurrects an older entry. Card edits retain conflict checks, real calendar dates, expiry/archive metadata and the existing 4,000-character payload and 2,000-revision limits.

Archived and expired cards are excluded from current context; history remains separate. Expiry includes its calendar day in Europe/Tirane. Selection is deterministic, bounded to eight relevant entries and 6,000 serialized characters. Rules may apply broadly; scoped entries require relevant subject/keyword matches. Content is user-entered context, subordinate to current/system instructions.

Cards are included in copied section prompts and only in explicitly opted-in Imazh requests. The authorized Brain MCP search decodes cards for every account, excludes archived/expired context and preserves card metadata on explicit edits. No change opts users into Brain automatically or enables it for Logo, Web or unreleased Marketing.

## Fetch Brand and external AI

Fetch Brand reads bounded public website metadata, contact details, candidate logos, colors and social links without a paid AI call or credit deduction. The existing URL/DNS/redirect protections, rasterization limits, account-scoped cache and distributed account rate limits remain. Users review information, visual identity and selected changes before importing. Existing fields are unchecked by default. Transparent artwork retains its original pixels; its display mat provides contrast in either theme.

Fetch opens for a new brand and remembers completed imports through existing autosave. Section prompts work with the user's chosen external AI. They omit signed asset URLs/storage paths, distinguish proposed facts and request bounded section-specific JSON. Parsing is local; a bounded trailing-comma fallback preserves strings and all schema checks. Users review before applying changes.

No new paid agent/model calls, credits, providers, dependencies or recurring AI costs are introduced. The requested shared EUR 1/account/month cap is still required before any future paid agent feature is introduced. Existing Imazh generation retains its current model and credit flow.

## Sources, storage and clears

The library supports folders, search, metadata edits, moves and confirmed deletion, with up to 20 raster uploads per batch and the existing 5 MiB per-file and account-wide storage quota. Upload activity appears immediately; per-file preparing/uploading/saving/completed/error states and the completed-file count remain visible on slow connections. Failed batches distinguish completed and unattempted files.

Source metadata is paged within the existing 2,000-source cap. Cards render in batches of 48; only visible private assets are resolved, in deduplicated batches of up to 50. Folders organize sources; keyword matching selects relevant image references. Logos and sources share the account's storage usage with other files across all workspaces.

Whole-Brain and category-only clears require explicit confirmation. The transactional reset epoch invalidates stale drafts. A category clear preserves other categories and scrubs only its own history. A full clear preserves the workspace and generated outputs. Physical file deletion protects shared references and uses the existing retention retry queue; no new reconciliation service is introduced.

## Release and recovery

Deploy the existing Railway WEB service after plan/ownership/API/database regressions, the repository's release checks and actual-component theme/responsive tests pass. Preserve all previous platform work. A normal WEB revert restores the prior UI gate if needed; retain the compatible database schema and all customer data. Do not drop tables, columns or memory history for a UI rollback.
