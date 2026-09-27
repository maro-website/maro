import { ImageRequestValidationError } from "./requestValidation";

/** Transport safety ceiling, not a guarantee that the compiled prompt will fit. */
export const IMAZH_REQUEST_PROMPT_MAX_CHARS = 64_000;
/** GPT Image generations AND edits. Verified 2026-09-19:
 * https://developers.openai.com/api/reference/cli/resources/images/methods/generate
 * https://developers.openai.com/api/reference/cli/resources/images/methods/edit
 */
export const GPT_IMAGE_PROMPT_MAX_CHARS = 32_000;

export function validateCompiledImagePrompt(userPrompt: string, compiledPrompt: string, model: string) {
  if (!model.startsWith("gpt-image-")) return;
  if (compiledPrompt.length > GPT_IMAGE_PROMPT_MAX_CHARS) {
    throw new ImageRequestValidationError("prompt_too_long", 400, "prompt", {
      userPromptLength: userPrompt.length,
      compiledPromptLength: compiledPrompt.length,
      maxCompiledPromptLength: GPT_IMAGE_PROMPT_MAX_CHARS,
    });
  }
}
