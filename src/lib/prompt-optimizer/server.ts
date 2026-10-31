import "server-only";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCircuitAllows } from "@/lib/security/circuitBreaker";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
import { configurationHash, promptHash, type CanonicalImageCompilation } from "@/lib/generation/v1ImagePrompt";
import type { TrustedV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { OPTIMIZER_VERSION, OPTIMIZER_MODEL, OPTIMIZER_INSTRUCTIONS, OPTIMIZER_MAX_INPUT_CHARS, OPTIMIZER_MAX_OUTPUT_TOKENS,
  OPTIMIZER_KEY_ALIAS, OPTIMIZER_PRICE_VERSION, MASTERPROMPT_MAX_CHARS, optimizerEnabled, optimizerHash,
  contextBudget, parseOptimizedContext, estimateOptimizerUsd, optimizerReservationUsd, type OptimizerProvenance } from "./model";

export async function optimizeImageCompilation(request: TrustedV1ImageRequest, compilation: CanonicalImageCompilation, transportKey?: string | null): Promise<CanonicalImageCompilation> {
  if (!optimizerEnabled(request.userId, request.model.providerModelId)) return compilation;
  const source = compilation.optimizationSource;
  if (!source.context.trim()) {
    if (compilation.prompt.length > MASTERPROMPT_MAX_CHARS) throw new ImageRequestValidationError("context_too_long", 400);
    return compilation;
  }
  if (!process.env.MARO_OPTIMIZER_OPENAI_API_KEY) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  const budget = contextBudget(source);
  if (budget < 500) throw new ImageRequestValidationError("context_too_long", 400);
  const input = JSON.stringify({ engine_rules: source.engine, exact_brand_facts: source.facts, user_request: source.request,
    contextual_material: source.context, context_character_budget: budget });
  if (input.length > OPTIMIZER_MAX_INPUT_CHARS || Buffer.byteLength(input, "utf8") > OPTIMIZER_MAX_INPUT_CHARS) throw new ImageRequestValidationError("optimizer_input_too_long", 400);
  const circuit = await assertCircuitAllows(request.registryToolId);
  if (!circuit.ok) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  const fingerprint = optimizerHash(JSON.stringify({ version: OPTIMIZER_VERSION, model: OPTIMIZER_MODEL, instructions: OPTIMIZER_INSTRUCTIONS,
    input, imageModel: request.model.providerModelId, sourcePromptHash: promptHash(compilation.prompt), workspace: request.workspaceId ?? null }));
  const db = getSupabaseAdmin();
  const reservation = optimizerReservationUsd(input + OPTIMIZER_INSTRUCTIONS + " ".repeat(4096));
  const claim = await db.rpc("maro_optimizer_reserve", { p_user: request.userId, p_workspace: request.workspaceId ?? null,
    p_request_key: transportKey || request.idempotencyKey || randomUUID(), p_fingerprint: fingerprint,
    p_module: request.registryToolId, p_source_chars: compilation.prompt.length, p_reserved_usd: reservation });
  if (claim.error || !claim.data) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  const row = claim.data as { action: string; id?: string; final_prompt?: string };
  if (row.action === "budget") throw new ImageRequestValidationError("optimizer_budget_limit", 429);
  if (row.action === "busy") throw new ImageRequestValidationError("optimizer_busy", 409);
  if (!["run", "cache"].includes(row.action) || !row.id) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  const attemptId = row.id;
  let prompt = row.final_prompt ?? "";
  if (row.action === "run") {
    const started = Date.now();
    let metrics: Record<string, unknown> = {};
    let knownUsage = false;
    let succeeded = false;
    try {
      const response = await new OpenAI({ apiKey: process.env.MARO_OPTIMIZER_OPENAI_API_KEY!, maxRetries: 0, timeout: 60_000 }).responses.create({
        model: OPTIMIZER_MODEL, store: false, service_tier: "default", reasoning: { effort: "low" },
        prompt_cache_options: { mode: "implicit", ttl: "30m" },
        prompt_cache_key: optimizerHash(`${request.userId}:${request.workspaceId ?? ""}:${OPTIMIZER_VERSION}`),
        safety_identifier: optimizerHash(request.userId),
        max_output_tokens: OPTIMIZER_MAX_OUTPUT_TOKENS, instructions: OPTIMIZER_INSTRUCTIONS, input,
        text: { format: { type: "json_schema", name: "maro_context", strict: true,
          schema: { type: "object", properties: { context: { type: "string" } }, required: ["context"], additionalProperties: false } } },
      });
      metrics = { provider_response_id: response.id, actual_model: response.model, service_tier: response.service_tier ?? "default", price_version: OPTIMIZER_PRICE_VERSION };
      const knownRate = /^gpt-6\.1-sol(?:-\d{4}-\d{2}-\d{2})?$/.test(response.model) && [null, undefined, "default"].includes(response.service_tier);
      if (response.usage) {
        const usage = estimateOptimizerUsd(response.usage);
        knownUsage = knownRate;
        metrics = { ...metrics, input_tokens: usage.input, cached_tokens: usage.cached, cache_write_tokens: usage.writes, output_tokens: usage.output,
          ...(knownRate ? { estimated_usd: usage.usd } : {}) };
      }
      if (!knownUsage || response.status !== "completed") throw new Error("optimizer_output_invalid");
      prompt = parseOptimizedContext(response.output_text, source, budget);
      succeeded = true;
    } catch {
      // Provider text/errors can contain private prompts. Store only our bounded error code.
      metrics.error_code = knownUsage ? "optimizer_output_invalid" : "optimizer_cost_uncertain";
    }
    const saved = await db.from("maro_optimizer_attempts").update({ ...metrics,
      status: succeeded ? "completed" : knownUsage ? "rejected" : "uncertain", final_prompt: succeeded ? prompt : null,
      final_chars: succeeded ? prompt.length : null, duration_ms: Date.now() - started, finished_at: new Date().toISOString(),
    }).eq("id", attemptId).eq("user_id", request.userId).eq("status", "running").select("id").single();
    // A durable reservation remains budgeted as uncertain if completion accounting fails.
    if (saved.error || !saved.data?.id || !succeeded) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  }
  if (!prompt || prompt.length > MASTERPROMPT_MAX_CHARS) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  const optimizer: OptimizerProvenance = { version: OPTIMIZER_VERSION, model: OPTIMIZER_MODEL, attemptId, cacheHit: row.action === "cache",
    sourceHash: promptHash(compilation.prompt), sourceCharacters: compilation.prompt.length, finalCharacters: prompt.length };
  const provenance = { ...compilation.provenance, promptHash: promptHash(prompt), optimizer };
  return Object.freeze({ ...compilation, prompt, provenance, configurationHash: configurationHash({ source: compilation.configurationHash,
    optimizer: { version: OPTIMIZER_VERSION, model: OPTIMIZER_MODEL, sourceHash: optimizer.sourceHash, finalHash: provenance.promptHash } }) });
}

export async function optimizerUsageSummary() {
  const result = await getSupabaseAdmin().rpc("maro_optimizer_usage_summary");
  if (result.error) throw new Error("optimizer_usage_unavailable");
  return { model: OPTIMIZER_MODEL, keyAlias: OPTIMIZER_KEY_ALIAS, priceVersion: OPTIMIZER_PRICE_VERSION,
    enabled: process.env.MARO_OPTIMIZER_ENABLED === "true", configured: Boolean(process.env.MARO_OPTIMIZER_OPENAI_API_KEY),
    users: result.data ?? [] };
}
