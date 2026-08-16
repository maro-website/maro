import type { CompiledGenerationBrief } from "../types";
import type { EngineAdapterResult, OpenAIImageAdapterRequest } from "./types";

/** Map Engine image/logo brief to OpenAI image request shape (no provider call). */
export function mapImageBriefToOpenAI(
  brief: CompiledGenerationBrief,
  opts?: { size?: string }
): EngineAdapterResult<OpenAIImageAdapterRequest> {
  const messages = brief.providerMessages;
  const prompt =
    messages?.debugFlatPreview?.trim() ||
    [messages?.systemInstructions, messages?.userContent].filter(Boolean).join("\n\n").trim() ||
    brief.primaryUserRequest?.trim();

  if (!prompt) return { ok: false, error: "missing_image_prompt" };

  return {
    ok: true,
    request: {
      prompt,
      model: brief.model,
      size: opts?.size,
      n: 1,
    },
  };
}
