/**
 * maroWeb shadow rollout preconditions (Phase 2B.1).
 * Pure checks — safe for tests and admin readiness endpoints.
 */

import { validateToolConfiguration } from "./configHealth";
import type { ConfigHealthResult, EngineToolId, RegisteredEngineTool } from "./types";
import type { PromptLayerRecord, SystemPromptVersion, ToolInputFieldRecord, ToolModelConfigRecord } from "./types";

export interface MaroWebShadowPreconditionInput {
  tool: RegisteredEngineTool;
  prompts: SystemPromptVersion[];
  layers: PromptLayerRecord[];
  fields: ToolInputFieldRecord[];
  models: ToolModelConfigRecord[];
  promptCompilerV2: boolean;
  migrationsApplied?: {
    m0021?: boolean;
    m0022?: boolean;
    m0023?: boolean;
  };
}

export interface MaroWebShadowPreconditionResult {
  ok: boolean;
  blockers: string[];
  health: ConfigHealthResult;
}

export function evaluateMaroWebShadowPreconditions(
  input: MaroWebShadowPreconditionInput
): MaroWebShadowPreconditionResult {
  const blockers: string[] = [];
  const health = validateToolConfiguration({
    tool: input.tool,
    prompts: input.prompts,
    layers: input.layers,
    fields: input.fields,
    models: input.models,
    promptCompilerV2: input.promptCompilerV2,
  });

  if (input.tool.toolId !== "maro_web") {
    blockers.push("tool_must_be_maro_web");
  }

  if (health.status === "blocked") {
    blockers.push("config_health_blocked");
    for (const issue of health.issues.filter((i) => i.severity === "blocked")) {
      blockers.push(issue.code);
    }
  }

  const live = input.prompts.filter((p) => p.status === "live");
  if (live.length !== 1 || !live[0].content?.trim()) {
    blockers.push("missing_live_system_prompt");
  }

  const defaultModels = input.models.filter((m) => m.isDefault && m.enabled);
  if (defaultModels.length !== 1) {
    blockers.push("invalid_default_model");
  } else if (!defaultModels[0].provider?.trim()) {
    blockers.push("default_model_missing_provider");
  }

  const mig = input.migrationsApplied;
  if (mig && (!mig.m0021 || !mig.m0022 || !mig.m0023)) {
    blockers.push("migrations_incomplete");
  }

  return { ok: blockers.length === 0, blockers, health };
}

export function isMaroWebShadowTool(toolId: EngineToolId): boolean {
  return toolId === "maro_web";
}
