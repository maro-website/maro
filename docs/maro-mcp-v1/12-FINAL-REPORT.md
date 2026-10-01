# maroMCP v1 implementation report

## A. Real private ChatGPT E2E

- OAuth authorization and consent: PASS.
- MCP connection: PASS.
- `get_maro_account`: PASS; resolved Erzen and Fleet & Miles.
- `generate_maro_image` execution: PASS.
- HTTPS image rendering inside ChatGPT: PASS.
- Initial brand-context fidelity: FAIL; the image showed an unrelated SADOER
  consumer product.
- Canonical brand-context correction and regression coverage: PASS.
- Railway production deployment `6055614648`: PASS.
- Post-deploy PRM/OAuth/MCP/CORS/consent smoke suite: PASS.
- Final post-fix visual retest: pending one owner-visible ChatGPT generation.

## B. Root cause

Fleet & Miles' canonical workspace, maroBrain profile, workspace brand colors,
logo and sources are correctly owned, populated and free of SADOER data. The
only SADOER occurrence found in repository/database scope is a separate Beauty
catalog preset (`MP-MMATFV`). MCP does not send a `maroPrompt` id, so that
preset was not selected by the MCP adapter.

The real defect was in shared maroImazh reference semantics: an automatic
maroBrain workspace logo was sent to the image provider through the same
reference/text-preservation semantics used for a user-supplied product image.
That semantic path explicitly discussed products, labels and packaging. For a
generic “my active brand” request it allowed the image provider to reinterpret
an identity asset as an unrelated consumer-product campaign instead of treating
the workspace context as authoritative.

## C. Fix

- Canonical request-local brand resolution now selects real maroBrain first and
  falls back to the owned workspace brand only when Brain is unconfigured.
- maroBrain and workspace brand/color briefs are merged instead of dropping
  workspace colors when Brain exists.
- Automatic workspace identity/assets and user-supplied product references now
  have distinct prompt semantics.
- A transport-independent brand-fidelity assertion makes the active workspace
  brand, category, audience, offering and restrictions authoritative.
- Engine image persistence records the exact provider request prompt, not an
  earlier debug preview.
- Safe job telemetry records only hashed workspace/brand/context fingerprints,
  context source, compiler path and reference role; it never stores context or
  compiled prompt in MCP output.

## D. Fleet & Miles canonical context

Production data confirms Fleet & Miles as the owned active workspace with a
configured Automotive maroBrain profile, detailed B2B fleet/reservation
management description, rent-a-car target audience, goals, positioning,
content rules, workspace colors, valid identity asset, and owned reference
sources. No SADOER/hair-care terms occur in its Brain, brand or sources.

## E. Compiler and parity

Production is configured as maroImazh `shadow` with
`prompt_compiler_v2=false`; provider execution therefore uses the legacy
compiler while Engine compiles in shadow. Website UI and MCP both enter the
same `executeMaroImageApplication` boundary and now resolve identical canonical
brand/reference semantics before provider invocation.

## F. Isolation and privacy

Regression tests cover owner/workspace isolation, active workspace switching,
generic active-brand grounding, absence of stale request context, UI/MCP
provider-input parity, automatic-brand-asset semantics and telemetry privacy.
Compiled prompts remain service-role-only and are never returned through MCP.

## G. Credits

The pre-fix E2E account balance was confirmed, but no matching new MCP job,
generation row or storage object was present in the queried production records;
therefore an exact-once charge cannot be truthfully attributed to that visible
ChatGPT image from database evidence. The existing ledger invariants still
enforce one charge per job. The post-fix retest will be audited by its new MCP
idempotency key, job, generation and single charge row.

## H. Automated verification

- Targeted brand/MCP/image suite: 72 passed.
- Full suite: 562 passed, 11 skipped, 573 total; 55 files passed and one
  integration file skipped.
- TypeScript: passed.
- Production build: passed. The only warning is the pre-existing React hook
  dependency warning in `src/components/app/cards.tsx:491`.

## I. ChatGPT status

`PRIVATE E2E NEEDS ONE FINAL VISUAL RETEST`

See `11-MANUAL-ACTIONS.md` for the single post-deploy visual retest.
