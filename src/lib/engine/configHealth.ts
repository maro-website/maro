/**
 * Per-tool configuration health validator.
 * Phase 2B must refuse BLOCKED tools for engine/shadow cutover.
 */

import { getTool } from "@/lib/tools/registry";
import { matchesEngineConditions } from "./conditions";
import { resolveToolInputFields } from "./inputFields";
import { getEngineToolDefinition, isEngineToolId } from "./toolRegistry";
import type {
  ConfigHealthIssue,
  ConfigHealthResult,
  ConfigHealthStatus,
  EngineToolId,
  PromptLayerRecord,
  SystemPromptVersion,
  ToolInputFieldRecord,
  ToolModelConfigRecord,
  RegisteredEngineTool,
} from "./types";

export interface ValidateToolConfigInput {
  tool: RegisteredEngineTool;
  prompts: SystemPromptVersion[];
  layers: PromptLayerRecord[];
  fields: ToolInputFieldRecord[];
  models: ToolModelConfigRecord[];
  promptCompilerV2: boolean;
}

function statusFromIssues(issues: ConfigHealthIssue[]): ConfigHealthStatus {
  if (issues.some((i) => i.severity === "blocked")) return "blocked";
  if (issues.length) return "warning";
  return "ready";
}

export function validateToolConfiguration(input: ValidateToolConfigInput): ConfigHealthResult {
  const issues: ConfigHealthIssue[] = [];
  const { tool, prompts, layers, fields, models } = input;

  if (!tool.functional) {
    issues.push({
      code: "tool_not_functional",
      severity: "blocked",
      message: `${tool.displayName} is not a functional production tool`,
    });
  }

  if (tool.toolId === "maro_marketing") {
    issues.push({
      code: "marketing_coming_soon",
      severity: "blocked",
      message: "maroMarketing is COMING SOON — no production route",
    });
  }

  const livePrompts = prompts.filter((p) => p.status === "live");
  if (livePrompts.length === 0) {
    issues.push({
      code: "no_live_system_prompt",
      severity: "blocked",
      message: "No live system prompt configured",
    });
  } else if (livePrompts.length > 1) {
    issues.push({
      code: "multiple_live_prompts",
      severity: "blocked",
      message: "Multiple live system prompt versions detected",
    });
  } else if (!livePrompts[0].content?.trim()) {
    issues.push({
      code: "empty_live_prompt",
      severity: "blocked",
      message: "Live system prompt content is empty",
    });
  }

  const defaultModels = models.filter((m) => m.isDefault);
  if (defaultModels.length === 0) {
    issues.push({
      code: "no_default_model",
      severity: "blocked",
      message: "No default model configured",
    });
  } else if (defaultModels.length > 1) {
    issues.push({
      code: "multiple_default_models",
      severity: "blocked",
      message: "Multiple default models configured",
    });
  } else {
    const dm = defaultModels[0];
    if (!dm.enabled || dm.comingSoon) {
      issues.push({
        code: "default_model_disabled",
        severity: "blocked",
        message: "Default model is disabled or coming soon",
      });
    }
  }

  const registryTool = getTool(tool.registryToolId);
  if (!registryTool && tool.functional) {
    issues.push({
      code: "missing_registry_tool",
      severity: "blocked",
      message: `Registry tool "${tool.registryToolId}" not found`,
    });
  }

  if (!isEngineToolId(tool.toolId)) {
    issues.push({
      code: "invalid_engine_id",
      severity: "blocked",
      message: "Invalid canonical engine id",
    });
  } else {
    const def = getEngineToolDefinition(tool.toolId);
    if (def.registryToolId !== tool.registryToolId) {
      issues.push({
        code: "registry_mapping_mismatch",
        severity: "blocked",
        message: "Canonical/legacy registry mapping mismatch",
      });
    }
  }

  const fieldKeys = new Set<string>();
  for (const f of fields) {
    if (fieldKeys.has(f.fieldKey)) {
      issues.push({
        code: "duplicate_field_key",
        severity: "blocked",
        message: `Duplicate field key: ${f.fieldKey}`,
      });
    }
    fieldKeys.add(f.fieldKey);

    if (f.fieldType === "select" && f.defaultValue != null) {
      const id = String(f.defaultValue);
      if (f.options.length && !f.options.some((o) => o.id === id)) {
        issues.push({
          code: "invalid_select_default",
          severity: "blocked",
          message: `Invalid default option for field "${f.fieldKey}"`,
        });
      }
    }

    for (const cond of f.conditionalVisibility ?? []) {
      if (cond.field.includes("eval") || cond.field.includes("function")) {
        issues.push({
          code: "invalid_condition",
          severity: "blocked",
          message: `Invalid condition reference on field "${f.fieldKey}"`,
        });
      }
    }
  }

  const resolved = resolveToolInputFields(tool.toolId, fields);
  for (const f of resolved) {
    if (f.required && !f.enabled) {
      issues.push({
        code: "required_field_disabled",
        severity: "blocked",
        message: `Required field "${f.fieldKey}" is disabled`,
      });
    }
  }

  for (const layer of layers.filter((l) => l.status === "live")) {
    for (const cond of layer.conditions) {
      if (!cond.field || cond.field.includes("eval")) {
        issues.push({
          code: "invalid_layer_condition",
          severity: "warning",
          message: `Layer "${layer.layerKey}" has suspicious condition field`,
        });
      }
      void matchesEngineConditions;
    }
  }

  if (tool.productionPipeline === "legacy") {
    issues.push({
      code: "legacy_pipeline",
      severity: "warning",
      message: "Tool currently uses legacy generation pipeline",
    });
  }

  if (!input.promptCompilerV2) {
    issues.push({
      code: "compiler_v2_disabled",
      severity: "warning",
      message: "Global prompt_compiler_v2 is disabled — Engine LIVE cutover blocked (shadow unaffected)",
    });
  }

  if (tool.usesBrain && !tool.brainMapping.allowedSections.length) {
    issues.push({
      code: "brain_mapping_missing",
      severity: "blocked",
      message: "maroBrain mapping has no allowed sections",
    });
  }

  for (const m of models) {
    if (m.enabled && !m.provider) {
      issues.push({
        code: "missing_provider",
        severity: "warning",
        message: `Model "${m.modelId}" missing provider metadata`,
      });
    }
  }

  return { status: statusFromIssues(issues), issues };
}

export function canEnableShadowPipeline(health: ConfigHealthResult): boolean {
  return health.status !== "blocked";
}

export function canEnableEnginePipeline(health: ConfigHealthResult): boolean {
  return health.status === "ready";
}
