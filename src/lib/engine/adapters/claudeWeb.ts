import type { CompiledGenerationBrief } from "../types";
import type { ClaudeAdapterRequest, EngineAdapterResult } from "./types";

/** Map Engine web brief to Claude system/user roles (no provider call). */
export function mapWebBriefToClaude(
  brief: CompiledGenerationBrief,
  opts?: { effort?: string; model?: string }
): EngineAdapterResult<ClaudeAdapterRequest> {
  const messages = brief.providerMessages;
  if (!messages?.systemInstructions?.trim()) {
    return { ok: false, error: "missing_system_instructions" };
  }
  if (!messages.userContent?.trim() && !brief.primaryUserRequest?.trim()) {
    return { ok: false, error: "missing_user_content" };
  }

  const systemParts = [messages.systemInstructions.trim()];
  for (const block of messages.systemBlocks ?? []) {
    if (block.content?.trim()) systemParts.push(block.content.trim());
  }

  return {
    ok: true,
    request: {
      system: systemParts.join("\n\n"),
      user: messages.userContent?.trim() || brief.primaryUserRequest!.trim(),
      imageUrls: messages.attachments
        .filter((attachment) => attachment.type.startsWith("image/") && attachment.url)
        .map((attachment) => attachment.url as string),
      model: opts?.model ?? brief.model,
      effort: opts?.effort,
    },
  };
}
