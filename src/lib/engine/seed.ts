import "server-only";

import { getSupabaseAdmin, getAppSettings } from "@/lib/supabase/server";
import { getTool } from "@/lib/tools/registry";
import type { FortPromptLayer } from "@/lib/fort/types";
import {
  ENGINE_TOOL_DEFINITIONS,
  engineIdToFortModule,
  getEngineToolDefinition,
} from "./toolRegistry";
import { upsertToolEngineConfigRow } from "./storage";
import { defaultModelsFromRegistry } from "./models";
import type { EngineToolId } from "./types";

function resolveLegacySystemPrompt(
  toolId: EngineToolId,
  toolPrompts: Record<string, string>,
  masterPrompt: string
): string {
  const registryId = getEngineToolDefinition(toolId).registryToolId;
  if (toolId === "maro_web") {
    const base = toolPrompts[`${registryId}.base`]?.trim();
    return base || masterPrompt.trim() || getTool(registryId)?.defaultPrompt?.trim() || "";
  }
  const baseKey = `${registryId}.base`;
  return (
    toolPrompts[baseKey]?.trim() ||
    getTool(registryId)?.defaultPrompt?.trim() ||
    ""
  );
}

function fortModuleToEngineId(module: FortPromptLayer["module"]): EngineToolId | null {
  if (module === "web") return "maro_web";
  if (module === "imazh") return "maro_imazh";
  if (module === "logo") return "maro_logo";
  if (module === "universal") return null;
  return null;
}

export interface SeedResult {
  toolsSeeded: number;
  promptsSeeded: number;
  layersSeeded: number;
  modelsSeeded: number;
  skipped: string[];
}

/** Idempotent seed from legacy app_settings + fort_config. Preserves prompt text verbatim. */
export async function seedEngineFromLegacy(actorId?: string): Promise<SeedResult> {
  const admin = getSupabaseAdmin();
  const settings = await getAppSettings();
  const toolPrompts = settings.tool_prompts ?? {};
  const masterPrompt = settings.master_prompt ?? "";
  const fortLayers = settings.fort_config?.promptLayers ?? [];

  const result: SeedResult = {
    toolsSeeded: 0,
    promptsSeeded: 0,
    layersSeeded: 0,
    modelsSeeded: 0,
    skipped: [],
  };

  for (const def of ENGINE_TOOL_DEFINITIONS) {
    await upsertToolEngineConfigRow(def, actorId);
    result.toolsSeeded += 1;

    const { data: existingLive } = await admin
      .from("system_prompt_versions")
      .select("id")
      .eq("tool_id", def.id)
      .eq("status", "live")
      .maybeSingle();

    if (!existingLive) {
      const content = resolveLegacySystemPrompt(def.id, toolPrompts, masterPrompt);
      if (content || def.functional) {
        await admin.from("system_prompt_versions").insert({
          tool_id: def.id,
          version_label: "v1",
          status: "live",
          content,
          change_note: "Migrated from legacy configuration",
          created_by: actorId ?? null,
          published_by: actorId ?? null,
          published_at: new Date().toISOString(),
        });
        result.promptsSeeded += 1;
      } else {
        result.skipped.push(`${def.id}: no legacy prompt`);
      }
    } else {
      result.skipped.push(`${def.id}: live prompt exists`);
    }

    const models = defaultModelsFromRegistry(def.id);
    for (const model of models) {
      const { data: exists } = await admin
        .from("tool_model_configs")
        .select("id")
        .eq("tool_id", def.id)
        .eq("model_id", model.modelId)
        .maybeSingle();
      if (!exists) {
        await admin.from("tool_model_configs").insert({
          tool_id: def.id,
          model_id: model.modelId,
          display_name: model.displayName,
          provider: model.provider,
          enabled: model.enabled,
          is_default: model.isDefault,
          is_fallback: model.isFallback,
          coming_soon: model.comingSoon,
          sort_order: model.sortOrder,
        });
        result.modelsSeeded += 1;
      }
    }
  }

  for (const layer of fortLayers) {
    const targets: EngineToolId[] = [];
    if (layer.module === "universal") {
      targets.push("maro_imazh", "maro_web", "maro_logo", "maro_marketing");
    } else {
      const id = fortModuleToEngineId(layer.module);
      if (id) targets.push(id);
    }

    for (const toolId of targets) {
      if (!engineIdToFortModule(toolId) && layer.module !== "universal") continue;
      const layerKey = `${layer.id}${layer.module === "universal" ? "" : ""}`;
      const { data: exists } = await admin
        .from("prompt_layers")
        .select("id")
        .eq("tool_id", toolId)
        .eq("layer_key", layerKey)
        .maybeSingle();
      if (exists) continue;

      await admin.from("prompt_layers").insert({
        layer_key: layerKey,
        tool_id: toolId,
        name: layer.name,
        enabled: layer.enabled !== false,
        priority: layer.priority ?? 0,
        conditions: (layer.when ?? []).map((w) => ({
          field: w.field.includes(".") ? w.field : `fort.${w.field}`,
          equals: w.equals,
          includes: w.includes,
        })),
        instructions: layer.content ?? "",
        version_label: "1",
        status: "live",
        created_by: actorId ?? null,
        updated_by: actorId ?? null,
      });
      result.layersSeeded += 1;
    }
  }

  return result;
}

export async function ensureEngineSeeded(actorId?: string): Promise<SeedResult | null> {
  try {
    const { count } = await getSupabaseAdmin()
      .from("tool_engine_config")
      .select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) return null;
    return seedEngineFromLegacy(actorId);
  } catch {
    return null;
  }
}
