/**
 * Model validation — prepared for Phase 2B enforcement.
 * Phase 2A: validation only; production routes do NOT call enforceModelForGeneration yet.
 */

import type { EngineToolId, ToolModelConfigRecord } from "./types";
import { getEngineToolDefinition } from "./toolRegistry";
import { getTool } from "@/lib/tools/registry";

export interface ModelValidationResult {
  ok: boolean;
  modelId: string;
  error?: "unknown_model" | "disabled" | "coming_soon" | "wrong_tool" | "not_configured";
  message?: string;
  config?: ToolModelConfigRecord;
}

export function validateModelForTool(
  toolId: EngineToolId,
  modelId: string | undefined,
  configs: ToolModelConfigRecord[]
): ModelValidationResult {
  const def = getEngineToolDefinition(toolId);
  const registryTool = getTool(def.registryToolId);
  const modelSetting = registryTool?.settings.find((s) => s.id === "model");
  const fallback = configs.find((c) => c.isDefault)?.modelId
    ?? modelSetting?.default
    ?? configs[0]?.modelId
    ?? "unknown";

  const resolved = (modelId ?? fallback).trim();
  if (!resolved) {
    return { ok: false, modelId: resolved, error: "not_configured", message: "No model configured" };
  }

  const match = configs.find((c) => c.modelId === resolved);
  if (!match) {
    const registryOpt = modelSetting?.options.find((o) => o.id === resolved);
    if (registryOpt) {
      if (registryOpt.available === false) {
        return { ok: false, modelId: resolved, error: "coming_soon", message: "Model marked coming soon" };
      }
      return { ok: true, modelId: resolved };
    }
    return { ok: false, modelId: resolved, error: "unknown_model", message: "Model not registered for tool" };
  }

  if (match.toolId !== toolId) {
    return { ok: false, modelId: resolved, error: "wrong_tool", message: "Model belongs to another tool" };
  }
  if (!match.enabled) {
    return { ok: false, modelId: resolved, error: "disabled", message: "Model disabled", config: match };
  }
  if (match.comingSoon) {
    return { ok: false, modelId: resolved, error: "coming_soon", message: "Model coming soon", config: match };
  }

  return { ok: true, modelId: resolved, config: match };
}

/** Phase 2B hook — throws on invalid model. Not wired to production in 2A. */
export function enforceModelForGeneration(
  toolId: EngineToolId,
  modelId: string | undefined,
  configs: ToolModelConfigRecord[]
): string {
  const result = validateModelForTool(toolId, modelId, configs);
  if (!result.ok) {
    throw new Error(result.message ?? result.error ?? "invalid_model");
  }
  return result.modelId;
}

export function defaultModelsFromRegistry(toolId: EngineToolId): ToolModelConfigRecord[] {
  const def = getEngineToolDefinition(toolId);
  const tool = getTool(def.registryToolId);
  if (!tool) return [];

  const modelSetting = tool.settings.find((s) => s.id === "model");
  if (!modelSetting) return [];

  return modelSetting.options.map((opt, idx) => ({
    id: `${toolId}:${opt.id}`,
    toolId,
    modelId: opt.id,
    displayName: opt.label,
    provider: tool.kind === "website" ? "anthropic" : tool.kind === "image" ? "openai" : "unknown",
    enabled: opt.available !== false,
    isDefault: opt.id === modelSetting.default,
    isFallback: false,
    comingSoon: opt.available === false,
    sortOrder: idx,
    costMetadata: {},
    metadata: {},
  }));
}
