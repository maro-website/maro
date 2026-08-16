import type { CompiledGenerationBrief, EngineToolId } from "../types";
import { mapWebBriefToClaude } from "./claudeWeb";
import { mapImageBriefToOpenAI } from "./openaiImage";
import type { MappedEngineProviderRequest } from "./types";

export function mapEngineBriefToProviderRequest(
  brief: CompiledGenerationBrief,
  opts?: { effort?: string; imageSize?: string }
): MappedEngineProviderRequest | null {
  const tool = brief.tool;
  const messages = brief.providerMessages;
  if (!messages) return null;

  if (tool === "maro_web") {
    const mapped = mapWebBriefToClaude(brief, { effort: opts?.effort, model: brief.model });
    if (!mapped.ok || !mapped.request) return null;
    return {
      tool: "maro_web",
      provider: "anthropic",
      claude: mapped.request,
      brief,
      messages,
    };
  }

  if (tool === "maro_imazh" || tool === "maro_logo") {
    const mapped = mapImageBriefToOpenAI(brief, { size: opts?.imageSize });
    if (!mapped.ok || !mapped.request) return null;
    return {
      tool: tool as "maro_imazh" | "maro_logo",
      provider: "openai",
      openaiImage: mapped.request,
      brief,
      messages,
    };
  }

  return null;
}

export function isSupportedEngineAdapterTool(toolId: EngineToolId): boolean {
  return toolId === "maro_web" || toolId === "maro_imazh" || toolId === "maro_logo";
}
