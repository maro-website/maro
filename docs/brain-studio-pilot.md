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

## Rollout and rollback

Deploy only to the existing Railway WEB service after the repository checks and synthetic desktop/mobile/theme tests pass. Do not open the gate publicly as part of this release. Back up the current production commit and record release/live verification in `brain-studio-pilot-20261016` outside the repository.

Rollback is a normal revert of the pilot commit, preserving any later work. Cards remain in the existing history store and become hidden in the old UI. No destructive database rollback or environment change is needed. A later public rollout should migrate the versioned payload into first-class typed metadata if broader filtering/reporting needs it; keep the format adapter backward-compatible.
