/**
 * Configuration warnings for Engine admin overview + dry run.
 */

import type {
  EngineCompileContext,
  EngineToolId,
  RegisteredEngineTool,
  SystemPromptVersion,
  ToolModelConfigRecord,
} from "./types";

export function collectToolWarnings(input: {
  tool: RegisteredEngineTool;
  livePrompt: SystemPromptVersion | null;
  draftPrompt?: SystemPromptVersion | null;
  models: ToolModelConfigRecord[];
  promptCompilerV2: boolean;
}): string[] {
  const warnings: string[] = [];

  if (!input.livePrompt?.content?.trim()) {
    warnings.push("No live system prompt configured");
  }
  if (input.tool.productionPipeline === "legacy" || input.tool.productionPipeline === "shadow") {
    warnings.push("Tool currently uses legacy generation pipeline");
  }
  const defaultModel = input.models.find((m) => m.isDefault) ?? input.models.find((m) => m.modelId === input.tool.defaultModelId);
  if (defaultModel && !defaultModel.enabled) {
    warnings.push("Default model disabled");
  }
  if (input.tool.usesBrain && !input.tool.brainMapping.allowedSections.length) {
    warnings.push("maroBrain mapping missing");
  }
  if (!input.promptCompilerV2) {
    warnings.push("prompt_compiler_v2 disabled — Engine LIVE blocked (shadow unaffected)");
  }
  if (input.tool.comingSoon) {
    warnings.push("Tool marked coming soon in registry");
  }

  return warnings;
}

export function toolHasBrainMapping(toolId: EngineToolId, tool: RegisteredEngineTool): boolean {
  if (!tool.usesBrain) return true;
  return tool.brainMapping.allowedSections.length > 0;
}

export function summarizeCompileWarnings(ctx: EngineCompileContext): string[] {
  return collectToolWarnings({
    tool: ctx.tool,
    livePrompt: ctx.systemPrompt,
    draftPrompt: ctx.draftPrompt,
    models: ctx.models,
    promptCompilerV2: ctx.promptCompilerV2,
  });
}
