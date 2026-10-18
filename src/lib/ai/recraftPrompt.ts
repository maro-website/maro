import "server-only";
import { createHash } from "node:crypto";
import { isRecraftModel, recraftPromptLimit } from "./recraftModels";
import { RECRAFT_LOCAL_PROMPT_VARIANTS } from "./recraftPromptVariants";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
import { wrapPresetRecommendation } from "@/lib/presets/model";

const hash = (text: string) => createHash("sha256").update(text.replace(/\r\n?/g, "\n")).digest("hex");
export interface RecraftPromptPart { text: string; kind: "system" | "preset" | "context" }
const join = (parts: RecraftPromptPart[]) => parts.map(({ text, kind }) => (kind === "preset" ? wrapPresetRecommendation(text) : text).replace(/\r\n?/g, "\n").trim()).filter(Boolean).join("\n\n");

/** Pure local compatibility compilation. No SDK, network, keys, retries or charges.
 * Only reviewed, exact source versions have shorter equivalents. Engine edits
 * invalidate a variant automatically; arbitrary text is never cut or summarized.
 */
export function adaptRecraftImagePrompt(model: string, parts: RecraftPromptPart[]) {
  const original = join(parts);
  if (!isRecraftModel(model) || original.length <= recraftPromptLimit(model)) return { prompt: original };
  const variants: Array<{ kind: string; sourceHash: string; variantHash: string; version: string }> = [];
  const adapted = parts.map((part) => {
    if (part.kind === "context" || !part.text) return part;
    const sourceHash = hash(part.text);
    const variant = RECRAFT_LOCAL_PROMPT_VARIANTS[sourceHash];
    if (!variant) return part;
    variants.push({ kind: part.kind, sourceHash, variantHash: hash(variant.text), version: variant.version });
    return { ...part, text: variant.text };
  });
  const prompt = join(adapted);
  if (prompt.length > recraftPromptLimit(model)) throw new ImageRequestValidationError("recraft_prompt_too_long", 400, "model", {
    compiledPromptLength: prompt.length, maxCompiledPromptLength: recraftPromptLimit(model),
  });
  return { prompt, adaptation: { version: "recraft-local/1", originalCharacters: original.length, adaptedCharacters: prompt.length, variants } };
}
