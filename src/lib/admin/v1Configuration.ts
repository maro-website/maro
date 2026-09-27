import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { loadV1ImageModelRows, validateV1ModelSet, publicV1ImageModel, type V1ImageModule } from "@/lib/engine/v1ImageModels";
import { knownKeys, requestObject } from "@/lib/generation/requestValidation";

export function validateModelEdits(value: unknown, module: V1ImageModule, rows: unknown[]) {
  if (!Array.isArray(value) || value.length !== (module === "maro_logo" ? 1 : 2)) throw new Error("invalid_model_set");
  const keys = value.map((v) => requestObject(v, "model").key);
  if (!keys.includes("flare") || (module === "maro_imazh" && !keys.includes("sunburst"))) throw new Error("invalid_model_set");
  const updated = value.map((v) => {
    const edit = requestObject(v, "model");
    knownKeys(edit, ["key", "label", "descriptor", "enabled", "isDefault", "order", "customerCredits"], "model");
    const row = rows.map((r) => requestObject(r, "configuration")).find((r) => r.model_id === edit.key);
    if (!row || Number(edit.customerCredits)>2147483647 || Number(edit.order)>2147483647) throw new Error("invalid_model_configuration");
    return { ...row, display_name: edit.label, enabled: edit.enabled, is_default: edit.isDefault, coming_soon: false, sort_order: edit.order,
      metadata: { ...requestObject(row.metadata, "metadata"), description: edit.descriptor },
      cost_metadata: { ...requestObject(row.cost_metadata, "cost"), customerCredits: edit.customerCredits } };
  });
  return validateV1ModelSet(updated, module).map(publicV1ImageModel);
}
export async function saveV1Models(module: V1ImageModule, value: unknown) {
  const models = validateModelEdits(value, module, await loadV1ImageModelRows(module));
  const { error } = await getSupabaseAdmin().rpc("admin_save_v1_models", { p_tool: module, p_models: models });
  if (error) throw new Error("model_save_failed");
  return validateV1ModelSet(await loadV1ImageModelRows(module), module).map(publicV1ImageModel);
}

export function validatePromptContent(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 100000) throw new Error("invalid_prompt_content");
}

/** Existing approved layer identity/conditions/order are fixed. Only copy is mutable. */
export function isV1ProductionLayer(layer: { layer_key: string; status: string; enabled?: boolean }) {
  return layer.enabled !== false && layer.status === "live" && /^v1\.production\./.test(layer.layer_key) && !/(^|[._-])(fort|brain|web|future|legacy|migration|obsolete)([._-]|$)/i.test(layer.layer_key);
}
export function validateLayerEdit(body: Record<string, unknown>, current: Record<string, unknown>) {
  knownKeys(body, ["id", "instructions"], "layer");
  validatePromptContent(body.instructions);
  if (!isV1ProductionLayer(current as { layer_key: string; status: string }) || !Array.isArray(current.conditions) || current.conditions.some((c) =>
    !c || typeof c !== "object" || !/^(selections\.(format|speed|text|font|type|type_source|present|visual_style|concept_intent)|hasReferences|useBrain)$/.test(c.field) ||
    !Array.isArray(c.equals) || !c.equals.length || c.equals.some((v: unknown) => typeof v !== "string") || Object.keys(c).some((k) => !["field", "equals"].includes(k)))) throw new Error("invalid_production_layer");
  return { instructions: body.instructions, version_label: `v${Date.now()}`, updated_at: new Date().toISOString() };
}
