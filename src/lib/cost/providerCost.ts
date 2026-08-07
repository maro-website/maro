import { listPriceEur } from "@/lib/credits/money";

/** Estimated provider cost in USD (conservative defaults for margin tracking). */
const MODEL_COST_PER_1K: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 0.015, output: 0.075 },
  "claude-opus-5": { input: 0.015, output: 0.075 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "dall-e-3": { input: 0, output: 0.04 },
  default: { input: 0.01, output: 0.03 },
};

export function estimateProviderCostUsd(opts: {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  imageCostEach?: number;
}): number {
  const rates = MODEL_COST_PER_1K[opts.model ?? ""] ?? MODEL_COST_PER_1K.default;
  const inCost = ((opts.inputTokens ?? 0) / 1000) * rates.input;
  const outCost = ((opts.outputTokens ?? 0) / 1000) * rates.output;
  const imgCost = (opts.imageCount ?? 0) * (opts.imageCostEach ?? 0.04);
  return Math.round((inCost + outCost + imgCost) * 1_000_000) / 1_000_000;
}

export function marginPct(creditsCharged: number, costUsd: number): number {
  const revenue = listPriceEur(creditsCharged);
  if (revenue <= 0) return 0;
  return Math.round(((revenue - costUsd) / revenue) * 100);
}

export const TARGET_MARGIN_PCT = 40;
