# Private generation quality review

Requested by the platform owner on 15 October 2026 to inspect output quality and diagnose prompt/configuration defects. This feature does not train a model, publish user creations, change engine settings, or create durable copies of images.

## Scope and safeguards

- Existing `/admin/engine/generations` V1 jobs only. Preview only when the deterministic output still belongs to the job owner and is present in its current generation history. Deleted outputs and retained files without history are not reopened.
- New `generations.review` permission belongs only to `super_admin`. Existing administrator/developer/editor permissions remain unchanged. Both the image API and original-view page enforce existing authentication and MFA. The operational database projection returns no prompts, Brain content, paths or signed storage URLs. The 29 October research extension adds separately authorized and audited identity/request enrichment and a private details endpoint; see [generation research](operations/generation-research-20261029.md).
- Thumbnail requests load on visibility, are resized in memory to at most 96×96, and display at 48×48. The original opens in an authenticated admin page with fit and native-size views. Every image request requires authorization; there are no transferable public storage links.
- Strict per-actor rate limit: 120 image requests/minute. Private responses use no-store, authorization variation, same-origin resource policy and noindex headers. Client blobs are revoked on unmount, identity change, retry or navigation. Viewing necessarily uses temporary server/browser memory; this is not a promise that a browser can never save an image.
- Every successful image response requires an `audit_events` insert with actor, job, generation, variant, request ID and purpose `quality_review`. Audit failure blocks image delivery. The log contains no image bytes, prompts, source URLs or credentials.
- No new database schema, bucket, generation/provider operation or billable AI request. Normal users' owner-only asset resolver and existing storage policies remain unchanged.

## Purpose and proportionality record

Quality review aims to identify concrete output defects and improve the service's prompts/configuration. Aggregate success rates cannot reveal visual failures; start with selected operational pages/results and inspect originals only when the thumbnail does not suffice. The owner should avoid unrelated browsing, unnecessary identification, extra retention or reuse for advertising/training. Special-category personal data and business confidentiality require additional care and may require a different basis; this feature does not authorize every possible use of content.

Privacy policy section 4 now explicitly describes limited human quality review, logging, no extra durable image copies, and objection rights. Existing policies already describe legitimate-interest diagnostics/service improvement. This implementation records technical safeguards and intended necessity; it is not a legal guarantee or a substitute for assessing actual use, user expectations, objections and applicable agreements.

## Release and rollback

Baseline: `d3075b39641f26d44272272b0d1095a9e3e3a903`, Railway web deployment `e7899267-09ff-42ac-bce4-b4f55a26ea3f`. Scope backup and check evidence are outside the checkout at `../admin-generation-review-20261015/`. Publish normally to the existing production branch only after validation. Roll back by reverting only this release commit on the current production branch; preserve `HUB01-15OCTOBER-BACKUP`.
