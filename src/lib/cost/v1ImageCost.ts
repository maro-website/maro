/** Verified 2026-09-17 against the official Flare and Sunburst model pages.
 * https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
 * https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
 * This is a token-rate estimate, never an invoice or customer-credit price.
 */
export const V1_IMAGE_RATE_VERSION = "openai-image-2.5-2026-09-17";
export const V1_IMAGE_RATES_PER_MILLION = { textInput: 5, imageInput: 8, imageOutput: 30 } as const;

export interface V1ImageCostEstimate {
  usd: number | null;
  source: "usage_calculated" | "unavailable";
  rateVersion: typeof V1_IMAGE_RATE_VERSION;
  assumptions: string[];
}

export function estimateV1ImageCost(model: string, usage: Record<string, unknown> | null): V1ImageCostEstimate {
  const unavailable: V1ImageCostEstimate = { usd: null, source: "unavailable", rateVersion: V1_IMAGE_RATE_VERSION, assumptions: ["Complete supported usage breakdown was not returned."] };
  if (!["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"].includes(model) || !usage) return unavailable;
  const input = usage.input_tokens_details as Record<string, unknown> | undefined;
  const output = usage.output_tokens_details as Record<string, unknown> | undefined;
  const text = input?.text_tokens;
  const image = input?.image_tokens;
  const imageOutput = output?.image_tokens ?? usage.output_tokens;
  const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
  if (!count(text) || !count(image) || !count(imageOutput) || !count(usage.input_tokens) || text + image !== usage.input_tokens) return unavailable;
  // Use published uncached rates; do not guess undocumented cache-detail semantics.
  // If discounts apply this is an upper estimate, not a claimed exact monetary charge.
  return {
    usd: Math.round((text * 5 + image * 8 + imageOutput * 30) / 1_000_000 * 1e8) / 1e8,
    source: "usage_calculated", rateVersion: V1_IMAGE_RATE_VERSION,
    assumptions: ["Uncached input rates; any cache discounts are not deducted.", "USD token-rate estimate, not provider-reported money or invoiced cost."],
  };
}
