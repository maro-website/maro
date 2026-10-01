import "server-only";

import { estimateProviderCostUsd } from "@/lib/cost/providerCost";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type CostSource =
  | "provider_reported"
  | "usage_calculated"
  | "configured_fixed"
  | "fallback_maximum";

export interface RecordProviderCostInput {
  generationId?: string | null;
  jobId?: string | null;
  toolId?: string | null;
  modelId?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  /** Provider-reported USD if available in response metadata */
  providerReportedUsd?: number | null;
  configuredFixedUsd?: number | null;
  fallbackMaximumUsd?: number | null;
  usageMetadata?: Record<string, unknown>;
}

function resolveCost(input: RecordProviderCostInput): {
  estimatedUsd: number;
  costSource: CostSource;
  reconciliationStatus: "estimated" | "provider_reported";
} {
  if (input.providerReportedUsd != null && input.providerReportedUsd >= 0) {
    return {
      estimatedUsd: input.providerReportedUsd,
      costSource: "provider_reported",
      reconciliationStatus: "provider_reported",
    };
  }

  const usageUsd = estimateProviderCostUsd({
    model: input.modelId,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    imageCount: input.imageCount,
  });

  if (input.inputTokens != null || input.outputTokens != null || (input.imageCount ?? 0) > 0) {
    return { estimatedUsd: usageUsd, costSource: "usage_calculated", reconciliationStatus: "estimated" };
  }

  if (input.configuredFixedUsd != null && input.configuredFixedUsd >= 0) {
    return {
      estimatedUsd: input.configuredFixedUsd,
      costSource: "configured_fixed",
      reconciliationStatus: "estimated",
    };
  }

  const fallback = input.fallbackMaximumUsd ?? usageUsd;
  return { estimatedUsd: fallback, costSource: "fallback_maximum", reconciliationStatus: "estimated" };
}

export async function recordProviderCostEstimate(input: RecordProviderCostInput): Promise<void> {
  try {
    const { estimatedUsd, costSource, reconciliationStatus } = resolveCost(input);
    const provider = input.provider ?? inferProvider(input.modelId);

    await getSupabaseAdmin().from("provider_cost_estimates").insert({
      generation_id: input.generationId ?? null,
      job_id: input.jobId ?? null,
      tool_id: input.toolId ?? null,
      model_id: input.modelId ?? "unknown",
      provider,
      estimated_cost_usd: estimatedUsd,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      cost_source: costSource,
      reconciliation_status: reconciliationStatus,
      metadata: {
        image_count: input.imageCount ?? 0,
        ...(input.usageMetadata ?? {}),
      },
    });
  } catch (err) {
    console.error("[provider_cost_estimates] insert failed:", err);
  }
}

function inferProvider(modelId?: string): string {
  const m = (modelId ?? "").toLowerCase();
  if (m.includes("claude") || m.includes("opus") || m.includes("sonnet")) return "anthropic";
  if (m.includes("gpt") || m.includes("dall")) return "openai";
  if (m.includes("eleven")) return "elevenlabs";
  return "unknown";
}
