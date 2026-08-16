/**
 * Provider-independent message packaging.
 * Adapters in Phase 2B map this to Claude/OpenAI/etc. role semantics.
 */

import type {
  CompiledGenerationBrief,
  CompileAttachmentMeta,
  CompileGenerationBriefInput,
  ProviderMessagePackage,
  ProviderMessagePart,
} from "./types";

export function buildProviderMessages(
  brief: CompiledGenerationBrief,
  systemContent: string,
  input: CompileGenerationBriefInput
): ProviderMessagePackage {
  const systemBlocks: ProviderMessagePart[] = [];

  for (const layer of brief.appliedLayers) {
    if (layer.instructions.trim()) {
      systemBlocks.push({
        role: "system",
        label: `Layer: ${layer.name}`,
        content: layer.instructions.trim(),
      });
    }
  }

  if (brief.creativeDirection?.trim()) {
    systemBlocks.push({
      role: "system",
      label: "Creative Direction",
      content: brief.creativeDirection.trim(),
    });
  }

  if (brief.technicalDirection?.trim()) {
    systemBlocks.push({
      role: "system",
      label: "Technical Direction",
      content: brief.technicalDirection.trim(),
    });
  }

  if (brief.outputRequirements?.trim()) {
    systemBlocks.push({
      role: "system",
      label: "Output Requirements",
      content: brief.outputRequirements.trim(),
    });
  }

  if (brief.restrictions?.trim()) {
    systemBlocks.push({
      role: "system",
      label: "Restrictions / maroFort",
      content: brief.restrictions.trim(),
    });
  }

  const userParts: string[] = [];
  if (brief.primaryUserRequest?.trim()) userParts.push(brief.primaryUserRequest.trim());
  if (brief.brandContext?.trim()) {
    userParts.push(`## maroBrain\n${brief.brandContext.trim()}`);
  }
  if (brief.references?.trim()) {
    userParts.push(`## References\n${brief.references.trim()}`);
  }

  const attachments: CompileAttachmentMeta[] = input.attachments ?? [];

  const parameters: Record<string, unknown> = {
    model: brief.model,
    tool: brief.tool,
    registryToolId: brief.registryToolId,
    selections: brief.metadata.selections,
  };

  const debugFlatPreview = [
    systemContent.trim(),
    ...systemBlocks.map((b) => b.content),
    userParts.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    systemInstructions: systemContent.trim(),
    userContent: userParts.join("\n\n"),
    systemBlocks,
    attachments,
    parameters,
    debugFlatPreview,
  };
}

/** Web-specific: preserve legacy system/user separation intent. */
export function buildWebProviderMessages(input: {
  systemPrompt: string;
  userPrompt: string;
  fortBriefBlock?: string;
  fortLayerText?: string;
  optionFragments?: string;
}): ProviderMessagePackage {
  const systemParts = [input.systemPrompt, input.optionFragments, input.fortLayerText].filter(Boolean);
  const systemInstructions = systemParts.join("\n\n");
  let userContent = input.userPrompt;
  if (input.fortBriefBlock?.trim()) {
    userContent = `${userContent}\n\n## BRIEF EKSPERT (maroFort)\n${input.fortBriefBlock.trim()}`;
  }

  return {
    systemInstructions,
    userContent,
    systemBlocks: input.fortLayerText
      ? [{ role: "system", label: "Fort Layers", content: input.fortLayerText }]
      : [],
    attachments: [],
    parameters: { kind: "website" },
    debugFlatPreview: `${systemInstructions}\n\n---\n\n${userContent}`,
  };
}
