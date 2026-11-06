/** Flare and Sunburst share the same published token rates in GPT Image 2.5 and 2.6.
 * https://developers.openai.com/api/docs/models/gpt-image-2.6-flare
 * https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst
 * This is a token-rate estimate, never an invoice or customer-credit price.
 */
export const V1_IMAGE_RATE_VERSION = "openai-image-2.5-2026-09-17";
export const V1_IMAGE_RATES_PER_MILLION = { textInput: 5, imageInput: 8, imageOutput: 30 } as const;

export interface V1ImageCostEstimate {
  usd: number | null;
  source: "usage_calculated" | "unavailable";
  rateVersion: string;
  assumptions: string[];
}

/** Image rendering and SVG authoring are billed as separate model calls. */
export function estimateV1SvgCost(image: V1ImageCostEstimate, usage: Record<string, unknown> | null): V1ImageCostEstimate {
  const model = usage?.model;
  const input = usage?.input_tokens;
  const output = usage?.output_tokens;
  const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
  if (image.usd === null || typeof model !== "string" || !/^gpt-6-luna(?:-\d{4}-\d{2}-\d{2})?$/.test(model) || !count(input) || !count(output)) {
    return { ...image, usd: null, source: "unavailable", assumptions: [...image.assumptions, "Complete supported SVG authoring usage was unavailable."] };
  }
  // https://developers.openai.com/api/docs/models/gpt-6-luna
  const authorUsd = (input > 272_000 ? input * 0.2 + output * 0.75 : input * 0.1 + output * 0.5) / 1_000_000;
  return { ...image, usd: Math.round((image.usd + authorUsd) * 1e8) / 1e8,
    rateVersion: `${image.rateVersion}+gpt-6-luna-2026-11-06`, assumptions: [...image.assumptions, "Includes standard uncached SVG authoring usage."] };
}

export function estimateV1ImageCost(model: string, usage: Record<string, unknown> | null): V1ImageCostEstimate {
  const version = /^gpt-image-(2\.[56])-(flare|sunburst)$/.exec(model)?.[1];
  const rateVersion = version === "2.6" ? "openai-image-2.6-2026-11-04" : V1_IMAGE_RATE_VERSION;
  const unavailable: V1ImageCostEstimate = { usd: null, source: "unavailable", rateVersion, assumptions: ["Complete supported usage breakdown was not returned."] };
  if (!version || !usage) return unavailable;
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
    source: "usage_calculated", rateVersion,
    assumptions: ["Uncached input rates; any cache discounts are not deducted.", "USD token-rate estimate, not provider-reported money or invoiced cost."],
  };
}
