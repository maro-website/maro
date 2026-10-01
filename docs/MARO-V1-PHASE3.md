# MARO V1 — Phase 3 provider verification

## PHASE 3 STATUS

**PASS for the requested internal provider verification.** On 17 September 2026, nine live image requests completed through the real image route, trusted Phase 2 snapshot, OpenAI SDK, credit ledger, private storage and generation history. Two local controlled rejection checks exercised the real reserve/release lifecycle without contacting OpenAI. No deployment or Phase 4 work was performed.

This is a small sample at one approved format: one image, high quality, 1024 × 1024 (`fb-post`; Logo uses its existing square mapping). It is not evidence about every aspect ratio, production traffic, invoice reconciliation, or the unresolved durability failure case. The route was invoked directly in an isolated integration harness, using the existing internal operations account and its owned workspace. Browser interaction and the Next.js background shadow hook were not part of this live test.

## PROVIDER WIRING

| Product selection | Trusted provider ID | Actual SDK operation |
| --- | --- | --- |
| Imazh Flare | `gpt-image-2.5-flare` | `generateImages` → `images.generate`; `editImages` → `images.edit` |
| Imazh Sunburst | `gpt-image-2.5-sunburst` | `generateImages` → `images.generate`; `editImages` → `images.edit` |
| Logo Flare | `gpt-image-2.5-flare` | `generateImages` → `images.generate` |

Each wire request was independently captured immediately before the HTTP call and matched against the immutable snapshot, job, history, provider-cost row and pricing snapshot. Exactly one provider request occurred per live case. SDK retries are explicitly disabled. Neither the environment's old image model nor another model was substituted. The API did not echo a response `model` field; the recorded `requestedModel` is the observed outgoing ID, while `reportedModel` is correctly null.

## LIVE TEST MATRIX

All nine results below passed execution, history and download verification. Latency covers the provider wrapper, excluding subsequent storage and settlement. Usage is provider-reported **text input / image input / image output tokens**; text output was zero in every response.

| Test | Model | Operation | Result | Latency | Usage | Stored | Credits |
| --- | --- | --- | --- | ---: | --- | --- | ---: |
| A — bottle photograph | Flare | Generate | PASS | 19.994 s | 539 / 0 / 1756 | Yes | 1 |
| A — same prompt | Sunburst | Generate | PASS | 29.484 s | 539 / 0 / 1756 | Yes | 1 |
| B — coffee advertisement | Flare | Generate | PASS | 18.874 s | 571 / 0 / 1756 | Yes | 1 |
| B — same prompt/text | Sunburst | Generate | PASS | 33.268 s | 571 / 0 / 1756 | Yes | 1 |
| C — five-object composition | Flare | Generate | PASS | 19.167 s | 586 / 0 / 1756 | Yes | 1 |
| C — same prompt | Sunburst | Generate | PASS | 31.371 s | 586 / 0 / 1756 | Yes | 1 |
| D — recolor owned reference | Flare | Edit | PASS | 17.017 s | 630 / 1024 / 1756 | Yes | 1 |
| D — same reference/instruction | Sunburst | Edit | PASS | 31.754 s | 630 / 1024 / 1756 | Yes | 1 |
| E — NORTHLINE Logo Wizard | Flare | Generate | PASS | 20.781 s | 814 / 0 / 1756 | Yes | 1 |

Both edit requests used the exact same owned A-Flare output, with the same verified reference digest. All paired wire parameters and prompt text matched except the selected model ID. Brain was false for every case, including Logo. Logo used the existing complete Wizard request builder with brand, audience, symbol direction, exclusions, custom colors and bento presentation.

## PROVIDER COST DATA

### Provider-reported usage

The matrix contains the actual returned usage. Complete input/output/total token breakdowns, timestamps, request IDs, operation, settings and prompt hashes are in each job's `metadata.execution.image_provider`, with a copy in the provider-cost and pricing records. Edits reported 1,024 image-input tokens; generation requests reported zero image-input tokens. Every image reported 1,756 image-output tokens.

### Calculated provider-cost estimate

The official [Flare model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) and [Sunburst model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst), checked on 17 September 2026, list the same uncached token rates: $5 per million text-input tokens, $8 per million image-input tokens and $30 per million image-output tokens. The versioned estimate is `(text_input × 5 + image_input × 8 + image_output × 30) / 1,000,000` USD. Cached-input discounts, if any, are not deducted. This is a published-rate estimate, potentially an upper estimate, not invoice evidence.

| Case | Flare estimate | Sunburst estimate |
| --- | ---: | ---: |
| A | $0.055375 | $0.055375 |
| B | $0.055535 | $0.055535 |
| C | $0.055610 | $0.055610 |
| D | $0.064022 | $0.064022 |
| Imazh mean, four cases/model | **$0.0576355** | **$0.0576355** |
| E — Logo | **$0.056750** | Not applicable |

Total calculated estimate for nine images: **$0.517834**. The matched generation-only mean (A–C) is $0.0555067 per model. References increased the estimate in this sample. No cost premium for Sunburst was observed. Estimates are recorded with `cost_source=usage_calculated` and `reconciliation_status=estimated`, using `openai-image-2.5-2026-09-17`. Customer credits remain separately configured.

### Direct monetary cost reported by provider

**None.** No direct monetary amount was returned. `providerReportedCostUsd` is null. Actual invoiced cost was not retrieved or reconciled. The [Images API response documentation](https://developers.openai.com/api/reference/typescript/resources/images/methods/generate) describes usage, not an invoice amount. The existing job column named `provider_cost_usd` contains the calculated estimate here; the associated cost record identifies its provenance.

## FLARE VS SUNBURST OBSERVATIONS

These are visual observations from one output per case/model, not a statistically reliable model ranking.

- **Speed:** Imazh Flare averaged 18.763 seconds; Sunburst averaged 31.469 seconds. Flare was faster in all four pairs.
- **Simple photograph:** both produced a clean teal bottle, stone pedestal, cream background and credible lighting. Sunburst used a larger product crop and more pronounced background shadows; Flare left more breathing room. Both avoided added wording and branding.
- **Text:** both rendered “FRESH START”, “COFFEE & CALM” and “OPEN DAILY 7 AM” correctly. Flare retained the requested three-line arrangement. Sunburst split the headline across two lines and added more decorative scene props. This sample does not establish a general text-rendering advantage for Sunburst.
- **Complex composition:** both included the five requested objects, three tulips, the right-facing cup handle and the requested spatial arrangement. Flare kept all objects within the frame. Sunburst slightly cropped the notebook at the left edge despite the no-cropping instruction.
- **References:** both preserved the source bottle silhouette, camera position and pedestal while changing the bottle to orange and background to pale blue. Their edits were visually very similar, with small texture/light differences. Both used the edit endpoint and the selected model without compatibility errors.
- **Visible quality:** both produced clean, coherent 1024-pixel images. There is no persuasive evidence in this sample for a premium-quality Sunburst descriptor or a higher provider-cost claim.

## LOGO RESULT

Flare produced a legible NORTHLINE wordmark with a compact northward/trail-like geometric symbol in the requested green/cream palette. The existing bento presentation included symbol and wordmark variations, construction-style presentation and outdoor product applications. No unwanted slogan was added. It is the expected raster Wizard output, with no new vector/export capability introduced. Latency was 20.781 seconds; estimated provider cost was $0.056750; customer test charge was 1 credit. The snapshot confirms Logo Flare and Brain disabled.

## BILLING VERIFICATION

For all nine successes, the audit asserted equality across the snapshot provider ID, outgoing request, job model, generation model and provider-cost model. It also asserted the snapshot's authoritative price equals the route response, generation credits, job charge and actual balance delta. Every success had exactly one reserve and one charge ledger entry, each for 1 credit. Nine pricing snapshots were independently reread and matched to their job/model/charge/provider request ID.

| Representative case | Before balance / reserved | During balance / reserved | Charged | Released | After balance / reserved |
| --- | --- | --- | ---: | ---: | --- |
| A Flare success | 3076 / 0 | 3075 / 1 | 1 | 0 | 3075 / 0 |
| A Sunburst success | 3075 / 0 | 3074 / 1 | 1 | 0 | 3074 / 0 |
| E Logo success | 3068 / 0 | 3067 / 1 | 1 | 0 | 3067 / 0 |
| Confirmed controlled failure | 3067 / 0 | 3066 / 1 | 0 | 1 | 3067 / 0 |

Overall account balance: **3076 → 3067**, with **9 credits charged and 0 left reserved**. The two controlled failures each reserved and released 1 credit and caused no net change. These values follow the existing ledger convention: reservation reduces the balance immediately, and completion clears the reservation without subtracting again. The job's historical `credits_reserved=1` does not mean the account still has a live reservation.

## STORAGE/HISTORY

All nine images were uploaded through `uploadGeneratedImage`, logged through `logGeneration`, returned with a generation ID and canonical private storage reference, then independently downloaded and decoded as 1024 × 1024 images. Local copies are retained for review. The preflight probe also compared downloaded bytes exactly with uploaded bytes and removed only its own probe image/history row.

The known nullable upload/history durability weakness was not triggered and remains unchanged. A successful sample does not prove safety if persistence fails. The harness stops on missing history/storage rather than hiding that condition. Settlement and persistence architecture were not redesigned.

## FAILURES

No live OpenAI model/operation incompatibility was observed. A locally intercepted HTTP 400 rejection used code `phase3_controlled_rejection`; the route returned a controlled failure, the job became failed, and the real reserve was released without fallback or a charge. No image-provider request left the machine for either rejection check. The first check exposed an SDK property mismatch in failure diagnostics (`requestID`, not `request_id`); the wrapper was corrected and a second local rejection verified `mock_phase3_controlled_rejection` reached job diagnostics. Successful live request IDs were captured correctly throughout.

The direct-route harness lacks Next.js request context, so the retained Imazh shadow scheduler logged `after was called outside a request scope`. The live legacy execution path, provider call, persistence and settlement all completed. Shadow comparison itself is not claimed as live-verified here. Engine-internal forwarding remains covered by the focused tests. No production pipeline or canary gate was changed.

## PROMPT MISMATCHES

For all seven generate calls, the saved `generations.final_prompt`, wrapper observation hash and outgoing JSON prompt matched exactly. For the two edit calls, multipart serialization converted LF line endings to CRLF. Raw hashes therefore differed between saved text and decoded wire fields, but normalization of line endings produced exact equality: **no semantic instruction difference**. The wrapper hash represents the prompt before transport serialization; raw wire prompts are separately retained.

The raw user request and expanded final prompt intentionally differ: the existing composition adds tool, format and text/reference rules. No prompt-system convergence was performed. One existing tension remains visible in the edit prompt: the generic reference rule says to preserve colors while the explicit user instruction asks for recoloring. Both outputs followed the requested recoloring. This is an observation for the dedicated prompt phase, not a Phase 3 rewrite.

## FILES CHANGED

This list covers Phase 3 changes only; pre-existing Phase 1/2 and other working-tree changes were preserved.

| File | Reason |
| --- | --- |
| `src/lib/ai/openai.ts` | Capture success/failure observations and request IDs; explicitly disable SDK retries; preserve the existing image return interface and explicit model selection. |
| `src/lib/ai/imageObservation.ts` | Add safe usage/timing/settings/prompt-hash/error observations without storing image bytes or credentials. |
| `src/lib/cost/v1ImageCost.ts` | Add a dated, model-specific usage estimate with explicit assumptions and unavailable values. |
| `src/lib/cost/recordEstimate.ts` | Persist V1 image usage estimates with correct cost provenance rather than the legacy flat image estimate. |
| `src/lib/engine/imageEngineRun.ts` | Forward the observation callback for both image methods. |
| `src/lib/engine/executionTelemetry.ts` | Type the provider observation in job execution metadata. |
| `src/lib/generation/orchestrator.ts` | Accept resolved provider identity and image usage during existing budget/settlement/cost logging; prevent Imazh's old Anthropic attribution. |
| `src/app/api/ai/image/route.ts` | Pass snapshot provider identity, persist observations and supply real usage to settlement. |
| `src/lib/__tests__/v1-image-observation.test.ts` | Verify rates, incomplete usage handling, text-output exclusion and safe diagnostic capture. |
| `src/lib/__tests__/openai-image-safety.test.ts` | Verify request/usage metadata, SDK requestID handling and no retries/model substitution. |
| `src/lib/__tests__/credit-lifecycle.test.ts` | Verify resolved OpenAI identity, usage estimate and configured customer charge reach accounting. |
| `tools/phase3/vitest.config.ts` | Isolate live checks from ordinary regression tests. |
| `tools/phase3/live.verify.ts` | Explicit opt-in internal preflight, configuration, matrix and controlled failure harness, with checkpoints and rerun guards. |
| `tools/phase3/audit.mjs` | Read-only correlation audit of captured requests, records, billing and prompt parity. |
| `docs/MARO-V1-PHASE3.md` | This report and evidence index. |

Raw checkpoints, pricing records, output PNGs, the audit JSON and review gallery are under the ignored local directory `scripts/phase3-data/2026-09-17-v1/`. They include diagnostic records and synthetic prompts but no saved authentication tokens or API keys. They are not included in a deployment or Git commit.

## CONFIGURATION CHANGES

The authoritative database table is **`public.tool_model_configs`**. No existing approved V1 internal price rows existed. Added:

| Row ID | Module | Logical model | Default | `cost_metadata` |
| --- | --- | --- | --- | --- |
| `60cd6a82-0ae5-47b6-8170-78bff047b77c` | `maro_imazh` | `flare` | Yes | `customerCredits: 1`, `pricingStage: internal` |
| `d1840001-1606-4ad9-b090-d5ba7d9b5a8e` | `maro_imazh` | `sunburst` | No | `customerCredits: 1`, `pricingStage: internal` |
| `a8f40b7c-cc37-4505-8c36-f30e1497f44f` | `maro_logo` | `flare` | Yes | `customerCredits: 1`, `pricingStage: internal` |

Each row is enabled, not coming soon, provider `openai`, and carries the exact approved `metadata.providerModelId`. The neutral descriptor is “Verifikim i brendshëm V1”; metadata identifies run `2026-09-17-v1`, and cost metadata explicitly states “Phase 3 provider verification only; not launch pricing.” These values remain configured as temporary internal values, not approved launch prices.

Cleared `is_default` on the two old GPT Image 2 rows (`5105fdcf-1a87-4268-a758-86c4f1ee0a21`, `7816e4be-f0da-46a9-b684-362153356fa9`). Their rows and enabled state were preserved. Configuration before/after snapshots are saved with the test evidence. There were no schema migrations, credential edits, new provider accounts, commerce changes, signup changes, deployment changes or launch-gate changes. An in-memory session was obtained for the existing internal account without sending email or changing its password, then signed out.

## TEST RESULTS

- Targeted model/configuration, image route, reference/edit, credit lifecycle and failure tests: **189 passed across 9 files**.
- Full existing regression suite: **804 passed, 11 skipped; 62 files passed, 1 skipped (815 tests total)**. Service credentials were blanked for unit tests.
- TypeScript: **passed**, `tsc --noEmit --incremental false`.
- Storage/history preflight: **passed**, uploaded/downloaded bytes matched and probe artifacts were removed.
- Explicit live matrix harness: **passed**, 9 real provider calls and 1 initial local rejection, 271.52 seconds overall.
- Corrected failure-diagnostics confirmation: **passed**, local rejection only; no additional provider generation.
- Recorded-evidence audit: **passed** for all 9 live cases; model, usage estimate, charge, ledger, output, prompt and reference parity assertions held.
- Database pricing-snapshot follow-up: **9/9 matched**; final account balance **3067**, reserved **0**.

## DECISIONS REQUIRED FROM PRODUCT OWNER

Only the product choices requested for the next decision remain:

1. Approve the launch credit price for **Imazh Flare**. The measured four-case mean estimate was $0.0576355; the largest sampled estimate was $0.064022.
2. Approve the launch credit price for **Imazh Sunburst**. Its matched estimates were identical. This sample provides no provider-cost justification for a higher price; any premium would be a product decision.
3. Approve the launch credit price for **Logo Flare**, whose sampled estimate was $0.056750.
4. Approve customer-facing descriptors to replace the internal verification label. The evidence supports saying Flare was faster in this sample; it does not support presenting Sunburst as reliably better, more detailed or more expensive.

No final credit price or premium positioning has been selected. Phase 4 has not started.

## EVIDENCE INDEX

The following identifiers correlate each persisted image with its job and actual provider request. Full UTC timing, canonical storage refs and usage are retained in `audit.json` and per-case checkpoints. Open `review.html` in the local evidence directory for the side-by-side outputs.

| Case | Job ID | Generation ID | Provider request ID | Output |
| --- | --- | --- | --- | --- |
| A-flare | f0fbc4ee-2d8c-4f77-a983-e57b0dfc54c9 | ec0ec36f-3439-49d3-81be-2c2e2e47f51e | req_03b53512a29e44a49b708cf0863a5607 | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/A-flare.png) |
| A-sunburst | 852eb449-aed6-4ea1-b2a3-df253fc75b5b | 015e4e60-b1bf-4e50-87fe-04ce3da4ff28 | req_20008e161a654d20a6357b5382279f4a | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/A-sunburst.png) |
| B-flare | 16a30c9e-d66f-432f-a9d6-8b8c79ee871a | 83742f30-c46c-4c88-8b59-5c0a10f8bff3 | req_63d4fde9818549bc970aeb9e2fa1f8ec | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/B-flare.png) |
| B-sunburst | 09bbb0cd-b6a8-498c-93b3-bb16b2a4312a | f48b26b5-5336-40a3-a811-9d3ece209feb | req_21e15c8582444c34ada7913962403647 | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/B-sunburst.png) |
| C-flare | 824f99a3-bd64-44a1-845d-0853616f20a3 | c8747848-3e7a-4b7b-a9eb-c29f59b1cecd | req_803cfd9ad70a486e9093564b47fd90d2 | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/C-flare.png) |
| C-sunburst | dee0c652-afe3-4421-9a39-aed0f05ac3fa | c1afd469-7c29-4daf-9d5f-79d2f69100ef | req_5ef6663b00284f31af5be354918ad431 | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/C-sunburst.png) |
| D-flare | ed1c8509-332b-47af-8fa4-e4157b621032 | 8c49515e-3158-434b-879a-9cfa3a52149c | req_7fb5cb80f36b49639beae5ec2e6fbd27 | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/D-flare.png) |
| D-sunburst | a144f5fa-cf7f-4192-92c5-c9b327673aa3 | a4be493d-c709-4a2a-844f-6058d3006390 | req_c13d5abc399842a9870602d1180ae4da | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/D-sunburst.png) |
| E-logo-flare | bade6a79-e605-48e5-91b1-5cd2cf3d78c5 | b74d4f66-3bc1-4d45-a3b4-f06b256d11f6 | req_c9d6b55d29514c83b6469c70876496d7 | [PNG](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/E-logo-flare.png) |

[Output gallery](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/review.html) · [Audit data](C:/Users/nicep/Desktop/maro-al/maro-al/scripts/phase3-data/2026-09-17-v1/audit.json)

