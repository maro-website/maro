/**
 * Render structured CompiledGenerationBrief to provider-facing text.
 */

import { buildProviderMessages } from "./providerMessages";
import type { CompiledGenerationBrief, CompileGenerationBriefInput } from "./types";

const SECTION_ORDER: Array<keyof CompiledGenerationBrief> = [
  "systemPromptVersion",
  "brandContext",
  "references",
  "creativeDirection",
  "technicalDirection",
  "requiredElements",
  "restrictions",
  "outputRequirements",
  "primaryUserRequest",
];

export function renderProviderPrompt(
  brief: CompiledGenerationBrief,
  systemContent: string,
  input?: CompileGenerationBriefInput
): string {
  if (brief.providerMessages?.debugFlatPreview) {
    return brief.providerMessages.debugFlatPreview;
  }
  const parts: string[] = [];

  if (systemContent.trim()) parts.push(systemContent.trim());

  for (const layer of brief.appliedLayers) {
    if (layer.instructions.trim()) parts.push(layer.instructions.trim());
  }

  const appendSection = (title: string, body?: string) => {
    if (body?.trim()) parts.push(`## ${title}\n${body.trim()}`);
  };

  appendSection("maroBrain", brief.brandContext);
  appendSection("References", brief.references);
  appendSection("Creative Direction", brief.creativeDirection);
  appendSection("Technical Direction", brief.technicalDirection);
  appendSection("Required Elements", brief.requiredElements);
  appendSection("Restrictions", brief.restrictions);
  appendSection("Output Requirements", brief.outputRequirements);

  if (brief.fort && Object.keys(brief.fort).length) {
    appendSection("maroFort", JSON.stringify(brief.fort, null, 2));
  }

  if (brief.primaryUserRequest?.trim()) {
    parts.push(brief.primaryUserRequest.trim());
  }

  if (brief.metadata.conflicts.length) {
    appendSection(
      "Conflict Resolution Notes",
      brief.metadata.conflicts.map((c) => `- ${c.message} → ${c.resolution}`).join("\n")
    );
  }

  void SECTION_ORDER;
  void input;
  return parts.join("\n\n");
}

export { buildProviderMessages };
