# Masterprompt optimizer

Production base: `220748985145a281583ea013b0a07813c3060dad` in `maro-website/maro`, branch `codex/raiaccept-payment-20261008`. Deployment target: Railway project `cb4c8dcc-712d-459d-b01c-96ae9ad29814`, production `46f492bd-a88b-4b68-aa5a-455a2707ca10`, WEB `4f5a55b0-dc24-4d6e-8d20-669b8d6ecf3d`. Domains: maro.al and www.maro.al. Preserve unrelated local branches and the reconciliation service.

## Activation

Apply `20261031015548_maro_prompt_optimizer.sql` once to the existing Maro Supabase project. It adds a private, RLS-enabled cost/cache table and two service-role-only SECURITY INVOKER functions. It does not modify source Brain profiles, engine content, credits or generation settlement.

Set these server-only Railway WEB variables, preserving all existing keys:

```
MARO_OPTIMIZER_OPENAI_API_KEY=<dedicated OpenAI key>
MARO_OPTIMIZER_ENABLED=true
MARO_OPTIMIZER_AUDIENCE=all
MARO_OPTIMIZER_USER_IDS=<comma-separated authenticated pilot user IDs>
```

The all-user rollout is explicitly authorized. `MARO_OPTIMIZER_AUDIENCE=all` includes every authenticated user, including future accounts. Set it to `allowlist` (or remove it) to return to the preserved individual user IDs in `MARO_OPTIMIZER_USER_IDS`. Unknown audience values also use the allowlist; empty identities never qualify. No wildcard user ID or fallback to OPENAI_API_KEY is supported. Authentication, workspace ownership, Brain access, isolated cache/cost attribution and the existing per-user/platform budgets still apply. Removing the enabled flag stops optimizer use on the next service restart/deploy. Keep the private cost ledger for accounting when disabling or reverting code.

## Execution

The shared durable V1 image route covers GPT Image models in maroImazh and maroLogo, including internal callers using that route. Recraft retains its existing reviewed local adaptations and its tighter limits. Tools that are not deployed or that use independent text-generation pipelines are outside this pilot.

After authentication, workspace/reference resolution and Brain/storage entitlement checks, the server compiles the live engine, selected layers, approved preset/style, relevant memories/sources and Brain. The optimizer receives all saved Brain text, omitting the logo URL/data and leaving image bytes on the image-generation path. Engine rules, the original user request, brand name/language/colors/contact information, prohibitions and supplied evidence are retained verbatim. GPT-6.1 Sol selects and condenses the remaining context to at most 6,000 characters, further reduced by the actual space left in the final 30,000-character budget. A JSON schema and a final server-side character check reject invalid/oversized output. There is no string slicing or automatic paid retry.

The optimizer runs only when optional context exists; simple requests without it incur no optimizer charge. The full original profile remains unchanged. Identical source/model/instructions are cached for seven days, scoped to user and workspace. Source changes invalidate the fingerprint. Concurrent requests are serialized at admission; in-flight duplicates do not spend again. A request-key replay reuses its existing receipt or preserves its failed/uncertain outcome.

Optimizer spend occurs before image-credit reservation. Its separate atomic budgets cover concurrent requests and uncertain spend: $2/user/day, $20/user/month, $20/platform/day and $200/platform/month, in UTC. The global AI pause and module pause also apply. If optimization cannot safely complete, the image provider is not called and image credits are not reserved. A provider timeout remains budgeted at the conservative reserved amount; it is not silently assumed free.

The exact final prompt and source components live only in the existing private execution trace. Jobs retain bounded optimizer provenance (version, model, attempt ID, cache status, hashes and lengths). Existing generation research shows the exact provider prompt for authorized Super Admin review. The deterministic Engine preview remains a preview of the source compiler; it does not incur optimizer spend.

## Costs and evaluation

Super Admin → Siguria & Kostot shows totals by user: API attempts, accepted/rejected outputs, cache hits, input/cache-read/cache-write/output tokens, lifetime and current-month estimated USD, unconfirmed exposure, latency and characters saved. Its API requires existing permission checks, MFA, throttling, an audit receipt and private/no-store responses. Direct anon/authenticated database access is revoked.

Pricing is a versioned estimate from returned API token usage, separate from the OpenAI invoice. Standard short-context GPT-6.1 Sol rates on 31 October 2026 are $2/MTok ordinary input, $0.10 cached reads, $2.50 30-minute cache writes and $10 output (including reasoning). Cache reads/writes are subsets of total input and are not double-counted. The request explicitly selects Standard and 30-minute caching. Unknown model/tier/usage or failed receipt persistence blocks the result and retains unconfirmed exposure. No web/search/tool calls are enabled.

Evaluate real generations for fidelity and latency using the existing original/provider prompt and image research. Reduced characters alone do not establish image quality or profitability. Compare optimizer spend plus final image spend against successful usable results and plan revenue. No historical cost is reconstructed. The all-user rollout keeps the initial $2/user/day, $20/user/month and $20/$200 platform caps unchanged.

Official references: [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [prompt caching and billing](https://developers.openai.com/api/docs/guides/prompt-caching), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
