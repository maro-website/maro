# maroChat private pilot

Pilot account: confirmed `erzen@nice.al`. Entry: `/chat`, with private Hub/mobile links. Every API and database mutation checks the confirmed pilot identity and workspace ownership. The public module rollout stays parked.

## What the pilot does

- Conversational Kosovo Albanian with short messages and clickable suggested replies.
- Uses the authenticated name, plan, available credits, workspace/Brain names and ten recent creations from the selected workspace. This is a bounded recent view, not a full historical search.
- Optional Brain context: current profile, up to twelve active memories and fifty recent source records. The account upload library includes thirty recent image uploads. It works from names, keywords and text; it does not claim visual inspection of photo pixels.
- Prepares an image prompt, format, text preference and Brain setting. A matching eligible asset is resolved server-side to its canonical private reference. An absent asset produces an explicit upload instruction.
- Transfers to a fresh image conversation in maroImazh; scopes the transfer to user/workspace/conversation, expires it after thirty minutes and leaves generation to the ordinary Maro button and displayed image price. Existing drafts/conversations are preserved.
- Proposes up to twelve supported Brain text edits. The user reviews them and clicks save. One database transaction applies all edits through the existing versioned Brain function, with revision/reset checks and idempotent application. A changed Brain requires a fresh proposal.
- Opens existing Brain, assets, presets, Logo, Feed and Apps tools. Web, Filma, Audio and Marketing retain their existing availability. Chat does not independently run paid tools or claim they have run.

## Metering and pricing decision

The pilot includes 1,000,000 combined input/output tokens per calendar month and 200,000 per day, measured in Europe/Berlin. Limits span every conversation and workspace on the account. One provider request can run at a time; POST is limited to forty requests per hour. Context and output are bounded. A conservative text-byte reservation prevents concurrent or interrupted requests bypassing the quota, then actual provider usage settles it. Ambiguous network failures keep their reservation; known API rejections release it. Request IDs prevent replaying paid calls. SDK retries are disabled.

Each request stores the model, provider response identity, input/cached/output/total usage and estimated USD separately from Maro credits. The user can inspect task usage in chat. Dedicated server-only Railway WEB variable: `MARO_CHAT_OPENAI_API_KEY`. There is deliberately no fallback to the image API key. OpenAI requests use `store:false` and product/task metadata; private source references are not sent as model context. Chat history stays in the private application table.

Model: GPT-5.4 mini, reasoning disabled, maximum 2,400 output tokens. Standard text estimates checked 21 October 2026: $0.75 per million input, $0.075 cached input, $4.50 output. These are estimates, not the provider invoice. Source: [official model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini). API architecture follows [official function calling guidance](https://developers.openai.com/api/docs/guides/function-calling).

Recommended public pricing after measuring the pilot: an included monthly chat allowance with a visible usage percentage, plan-based limits and optional separate allowance top-ups. Keep ordinary image prices visible in maroImazh. Charging an extra credit on every image would penalize the intended workflow while a long chat that never generates could remain costly. No new public prices, subscriptions or checkout products are introduced by this pilot. A possible later allowance split is 200k tokens for Standard and 1m for Pro; choose final values from actual successful-task costs and margins.

## Verification and rollback

Focused tests cover account/plan/ownership boundaries, fail-closed quotas, private table/RPC grants, request replay, stale/failed requests, transactional Brain edits and scoped private image transfers. Browser checks use the actual chat/shared components and synthetic transport. Three separate OpenAI smoke requests use only synthetic brand data and record usage under `synthetic_pilot_smoke`; no paid images or image credits are used.

Migration `0078_marochat_private_pilot.sql` adds one RLS-protected service-only table and three service-only functions. It does not replace existing functions or modify existing customer/credit rows. Source, baseline backup, checks and deployment evidence are in sibling folder `marochat-pilot-20261021`.

Rollback with an ordinary application revert after reconciling newer production changes. Preserve the additive schema and pilot history. Do not drop user data or reverse settled image credits. Remove the private navigation link/page or withhold the dedicated key to disable further chat requests.
