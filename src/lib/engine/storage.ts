import "server-only";

import { getSupabaseAdmin, getAppSettings } from "@/lib/supabase/server";
import { isFeatureEnabled, FEATURE_PROMPT_COMPILER_V2 } from "@/lib/features/flags";
import { loadBrainContext } from "./brainLoader";
import { validateToolConfiguration } from "./configHealth";
import { defaultModelsFromRegistry } from "./models";
import {
  ENGINE_TOOL_DEFINITIONS,
  listRegisteredEngineTools,
  type EngineToolDefinition,
} from "./toolRegistry";
import type {
  EngineCompileContext,
  EngineToolId,
  PromptLayerRecord,
  RegisteredEngineTool,
  SystemPromptVersion,
  ToolEngineConfigRecord,
  ToolInputFieldRecord,
  ToolModelConfigRecord,
} from "./types";

function rowToSystemPrompt(row: Record<string, unknown>): SystemPromptVersion {
  return {
    id: String(row.id),
    toolId: row.tool_id as EngineToolId,
    versionLabel: String(row.version_label),
    status: row.status as SystemPromptVersion["status"],
    content: String(row.content ?? ""),
    changeNote: String(row.change_note ?? ""),
    createdBy: row.created_by as string | null,
    publishedBy: row.published_by as string | null,
    createdAt: String(row.created_at),
    publishedAt: (row.published_at as string | null) ?? null,
  };
}

function rowToLayer(row: Record<string, unknown>): PromptLayerRecord {
  return {
    id: String(row.id),
    layerKey: String(row.layer_key),
    toolId: row.tool_id as EngineToolId,
    name: String(row.name),
    enabled: Boolean(row.enabled),
    priority: Number(row.priority ?? 0),
    conditions: (row.conditions as PromptLayerRecord["conditions"]) ?? [],
    instructions: String(row.instructions ?? ""),
    versionLabel: String(row.version_label ?? "1"),
    status: row.status as PromptLayerRecord["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToInputField(row: Record<string, unknown>): ToolInputFieldRecord {
  return {
    id: String(row.id),
    toolId: row.tool_id as EngineToolId,
    fieldKey: String(row.field_key),
    label: String(row.label),
    description: String(row.description ?? ""),
    fieldType: String(row.field_type),
    placeholder: (row.placeholder as string | null) ?? null,
    options: (row.options as ToolInputFieldRecord["options"]) ?? [],
    defaultValue: row.default_value,
    required: Boolean(row.required),
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order ?? 0),
    standardVisible: Boolean(row.standard_visible),
    fortVisible: Boolean(row.fort_visible),
    conditionalVisibility: (row.conditional_visibility as ToolInputFieldRecord["conditionalVisibility"]) ?? [],
    modelCompatibility: (row.model_compatibility as string[]) ?? [],
    presetCompatibility: (row.preset_compatibility as string[]) ?? [],
    costModifier: (row.cost_modifier as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function rowToModel(row: Record<string, unknown>): ToolModelConfigRecord {
  return {
    id: String(row.id),
    toolId: row.tool_id as EngineToolId,
    modelId: String(row.model_id),
    displayName: String(row.display_name),
    provider: String(row.provider ?? "unknown"),
    enabled: Boolean(row.enabled),
    isDefault: Boolean(row.is_default),
    isFallback: Boolean(row.is_fallback),
    comingSoon: Boolean(row.coming_soon),
    sortOrder: Number(row.sort_order ?? 0),
    costMetadata: (row.cost_metadata as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function normalizePipeline(value: string | null | undefined): ToolEngineConfigRecord["productionPipeline"] {
  if (value === "shadow") return "shadow";
  if (value === "engine" || value === "engine_v2") return "engine";
  return "legacy";
}

function rowToToolConfig(row: Record<string, unknown>): ToolEngineConfigRecord {
  return {
    toolId: row.tool_id as EngineToolId,
    displayName: String(row.display_name),
    registryToolId: String(row.registry_tool_id),
    route: String(row.route ?? ""),
    status: row.status as ToolEngineConfigRecord["status"],
    productionPipeline: normalizePipeline(row.production_pipeline as string),
    defaultModelId: (row.default_model_id as string | null) ?? null,
    usesBrain: Boolean(row.uses_brain),
    usesFort: Boolean(row.uses_fort),
    presetSupport: Boolean(row.preset_support),
    brainMapping: (row.brain_mapping as ToolEngineConfigRecord["brainMapping"]) ?? {
      usesBrain: false,
      allowedSections: [],
    },
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export async function loadToolEngineConfigs(): Promise<Map<EngineToolId, RegisteredEngineTool>> {
  const map = new Map<EngineToolId, RegisteredEngineTool>();
  const defaults = listRegisteredEngineTools();
  for (const t of defaults) map.set(t.toolId, t);

  try {
    const { data } = await getSupabaseAdmin().from("tool_engine_config").select("*");
    for (const row of data ?? []) {
      const cfg = rowToToolConfig(row as Record<string, unknown>);
      const base = map.get(cfg.toolId);
      if (!base) continue;
      map.set(cfg.toolId, {
        ...base,
        ...cfg,
        legacyRegistryId: base.legacyRegistryId,
        functional: base.functional,
        comingSoon: base.comingSoon,
        brainMapping: { ...base.brainMapping, ...cfg.brainMapping },
      });
    }
  } catch {
    /* table may not exist yet — code defaults only */
  }

  return map;
}

export async function listEngineToolsWithMeta(): Promise<
  Array<
    RegisteredEngineTool & {
      livePromptVersion?: string | null;
      draftCount: number;
      layerCount: number;
      enabledModelCount: number;
    }
  >
> {
  const configs = await loadToolEngineConfigs();
  const tools = [...configs.values()];

  let prompts: SystemPromptVersion[] = [];
  let layers: PromptLayerRecord[] = [];
  let models: ToolModelConfigRecord[] = [];

  try {
    const admin = getSupabaseAdmin();
    const [pRes, lRes, mRes] = await Promise.all([
      admin.from("system_prompt_versions").select("*"),
      admin.from("prompt_layers").select("*"),
      admin.from("tool_model_configs").select("*"),
    ]);
    prompts = (pRes.data ?? []).map((r) => rowToSystemPrompt(r as Record<string, unknown>));
    layers = (lRes.data ?? []).map((r) => rowToLayer(r as Record<string, unknown>));
    models = (mRes.data ?? []).map((r) => rowToModel(r as Record<string, unknown>));
  } catch {
    /* ignore */
  }

  return tools.map((tool) => {
    const live = prompts.find((p) => p.toolId === tool.toolId && p.status === "live");
    const drafts = prompts.filter((p) => p.toolId === tool.toolId && p.status === "draft");
    const toolLayers = layers.filter((l) => l.toolId === tool.toolId && l.status === "live");
    const toolModels =
      models.filter((m) => m.toolId === tool.toolId).length > 0
        ? models.filter((m) => m.toolId === tool.toolId)
        : defaultModelsFromRegistry(tool.toolId);

    return {
      ...tool,
      livePromptVersion: live?.versionLabel ?? null,
      draftCount: drafts.length,
      layerCount: toolLayers.length,
      enabledModelCount: toolModels.filter((m) => m.enabled && !m.comingSoon).length,
    };
  });
}

export async function getEngineToolDetail(toolId: EngineToolId) {
  const configs = await loadToolEngineConfigs();
  const tool = configs.get(toolId);
  if (!tool) return null;

  const admin = getSupabaseAdmin();
  let prompts: SystemPromptVersion[] = [];
  let layers: PromptLayerRecord[] = [];
  let fields: ToolInputFieldRecord[] = [];
  let models: ToolModelConfigRecord[] = [];

  try {
    const [pRes, lRes, fRes, mRes] = await Promise.all([
      admin.from("system_prompt_versions").select("*").eq("tool_id", toolId).order("created_at", { ascending: false }),
      admin.from("prompt_layers").select("*").eq("tool_id", toolId).order("priority", { ascending: false }),
      admin.from("tool_input_fields").select("*").eq("tool_id", toolId).order("sort_order"),
      admin.from("tool_model_configs").select("*").eq("tool_id", toolId).order("sort_order"),
    ]);
    prompts = (pRes.data ?? []).map((r) => rowToSystemPrompt(r as Record<string, unknown>));
    layers = (lRes.data ?? []).map((r) => rowToLayer(r as Record<string, unknown>));
    fields = (fRes.data ?? []).map((r) => rowToInputField(r as Record<string, unknown>));
    models = (mRes.data ?? []).map((r) => rowToModel(r as Record<string, unknown>));
  } catch {
    /* ignore */
  }

  if (models.length === 0) models = defaultModelsFromRegistry(toolId);

  const settings = await getAppSettings();
  const promptCompilerV2 = await isFeatureEnabled(FEATURE_PROMPT_COMPILER_V2);
  const configHealth = validateToolConfiguration({
    tool,
    prompts,
    layers,
    fields,
    models,
    promptCompilerV2,
  });

  return {
    tool,
    prompts,
    layers,
    fields,
    models,
    toolPrompts: settings.tool_prompts ?? {},
    masterPrompt: settings.master_prompt ?? "",
    fortConfig: settings.fort_config ?? {},
    pricingOverrides: settings.pricing?.options ?? {},
    promptCompilerV2,
    configHealth,
  };
}

export async function loadCompileContext(
  toolId: EngineToolId,
  options?: {
    ownerUserId?: string;
    workspaceId?: string;
    presetPrompt?: string | null;
    adminInspection?: boolean;
  }
): Promise<EngineCompileContext> {
  const detail = await getEngineToolDetail(toolId);
  if (!detail) throw new Error("Tool not found");

  const live = detail.prompts.find((p) => p.status === "live") ?? null;
  const draft = detail.prompts.find((p) => p.status === "draft") ?? null;

  let brainProfile = null;
  let brainSources: import("@/lib/workspaces/brainTypes").WorkspaceSource[] = [];
  let brainLoad = undefined;

  if (options?.ownerUserId && options?.workspaceId) {
    brainLoad = await loadBrainContext({
      ownerUserId: options.ownerUserId,
      workspaceId: options.workspaceId,
      adminInspection: options.adminInspection,
    });
    brainProfile = brainLoad.profile;
    brainSources = brainLoad.sources;
  }

  return {
    tool: detail.tool,
    model: detail.tool.defaultModelId ?? detail.models.find((m) => m.isDefault)?.modelId ?? "",
    models: detail.models,
    systemPrompt: live,
    draftPrompt: draft,
    layers: detail.layers,
    inputFields: detail.fields,
    toolPrompts: detail.toolPrompts,
    masterPrompt: detail.masterPrompt,
    fortConfig: detail.fortConfig as Record<string, unknown>,
    brainProfile,
    brainSources,
    brainLoad,
    presetPrompt: options?.presetPrompt ?? null,
    pricingOverrides: detail.pricingOverrides,
    promptCompilerV2: detail.promptCompilerV2,
  };
}

export async function upsertToolEngineConfigRow(
  def: EngineToolDefinition,
  actorId?: string
): Promise<void> {
  await getSupabaseAdmin()
    .from("tool_engine_config")
    .upsert(
      {
        tool_id: def.id,
        display_name: def.displayName,
        registry_tool_id: def.registryToolId,
        route: def.route,
        status: def.functional ? "active" : "coming_soon",
        production_pipeline: "legacy",
        default_model_id: defaultModelsFromRegistry(def.id).find((m) => m.isDefault)?.modelId ?? null,
        uses_brain: def.usesBrain,
        uses_fort: def.usesFort,
        preset_support: def.presetSupport,
        brain_mapping: {
          usesBrain: def.usesBrain,
          allowedSections: def.brainSections,
          prioritySections: def.brainSections.slice(0, 3),
        },
        updated_by: actorId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tool_id" }
    );
}

export {
  rowToSystemPrompt,
  rowToLayer,
  rowToInputField,
  rowToModel,
};
