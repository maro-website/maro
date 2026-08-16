/**
 * Merge code-defined maroFort schema with DB tool_input_fields overrides.
 * Legacy code schema remains source structure; DB provides CMS overrides.
 */

import { getFortFields } from "@/lib/fort/schema";
import type { FortConfig, FortModuleId } from "@/lib/fort/types";
import type { ToolInputFieldRecord } from "./types";
import { engineIdToFortModule } from "./toolRegistry";
import type { EngineToolId } from "./types";

export interface ResolvedInputField {
  fieldKey: string;
  label: string;
  description: string;
  fieldType: string;
  source: "code" | "db" | "merged";
  enabled: boolean;
  standardVisible: boolean;
  fortVisible: boolean;
  options: Array<{ id: string; label: string }>;
  defaultValue?: unknown;
  required: boolean;
  sortOrder: number;
  placeholder?: string | null;
  conditionalVisibility?: import("./types").EngineCondition[];
  modelCompatibility?: string[];
  costModifier?: Record<string, unknown>;
}

function mapFortType(t: string): string {
  if (t === "multiselect") return "multi-select";
  if (t === "assetControl") return "asset";
  if (t === "positionGrid") return "position-grid";
  return t;
}

export function resolveToolInputFields(
  toolId: EngineToolId,
  dbFields: ToolInputFieldRecord[],
  fortConfig?: FortConfig
): ResolvedInputField[] {
  const fortModule = engineIdToFortModule(toolId);
  const resolved: ResolvedInputField[] = [];
  const dbByKey = new Map(dbFields.map((f) => [f.fieldKey, f]));

  if (fortModule) {
    const schema = getFortFields(fortModule, fortConfig);
    for (const field of schema) {
      const db = dbByKey.get(field.id);
      dbByKey.delete(field.id);
      resolved.push({
        fieldKey: field.id,
        label: db?.label ?? field.label,
        description: db?.description ?? field.description ?? "",
        fieldType: db?.fieldType ?? mapFortType(field.type),
        source: db ? "merged" : "code",
        enabled: db?.enabled ?? true,
        standardVisible: db?.standardVisible ?? false,
        fortVisible: db?.fortVisible ?? true,
        options: (db?.options?.length ? db.options : field.options ?? []).map((o) => ({
          id: o.id,
          label: o.label,
        })),
        defaultValue: db?.defaultValue ?? field.default,
        required: db?.required ?? field.required ?? false,
        sortOrder: db?.sortOrder ?? field.order ?? 0,
        placeholder: db?.placeholder ?? field.placeholder ?? null,
        conditionalVisibility: db?.conditionalVisibility,
        modelCompatibility: db?.modelCompatibility,
        costModifier: db?.costModifier,
      });
    }
  }

  for (const db of dbByKey.values()) {
    resolved.push({
      fieldKey: db.fieldKey,
      label: db.label,
      description: db.description,
      fieldType: db.fieldType,
      source: "db",
      enabled: db.enabled,
      standardVisible: db.standardVisible,
      fortVisible: db.fortVisible,
      options: db.options,
      defaultValue: db.defaultValue,
      required: db.required,
      sortOrder: db.sortOrder,
      placeholder: db.placeholder,
      conditionalVisibility: db.conditionalVisibility,
      modelCompatibility: db.modelCompatibility,
      costModifier: db.costModifier,
    });
  }

  return resolved.sort((a, b) => a.sortOrder - b.sortOrder || a.fieldKey.localeCompare(b.fieldKey));
}

const SAFE_FIELD_TYPES = new Set([
  "select",
  "multi-select",
  "text",
  "textarea",
  "number",
  "toggle",
  "slider",
  "color",
  "asset",
  "position-grid",
]);

export function validateFieldRecord(
  field: Partial<ToolInputFieldRecord> & { fieldKey?: string; fieldType?: string }
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const key = field.fieldKey ?? "";
  if (!key?.trim()) errors.push("field_key_required");
  if (field.fieldType && !SAFE_FIELD_TYPES.has(field.fieldType)) {
    errors.push("invalid_field_type");
  }
  if (field.fieldType === "select" && field.defaultValue != null && field.options?.length) {
    const id = String(field.defaultValue);
    if (!field.options.some((o) => o.id === id)) errors.push("invalid_default_option");
  }
  for (const cond of field.conditionalVisibility ?? []) {
    if (!cond.field || /eval|function|script/i.test(cond.field)) {
      errors.push("invalid_condition_reference");
    }
  }
  return { ok: errors.length === 0, errors };
}

export function validateInputSelections(
  fields: ResolvedInputField[],
  values: Record<string, unknown>,
  modelId: string
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of fields) {
    if (!field.enabled) {
      if (values[field.fieldKey] != null && String(values[field.fieldKey]).trim()) {
        errors.push(`Field "${field.fieldKey}" is disabled`);
      }
      continue;
    }
    const modelCompat = (fields.find((f) => f.fieldKey === field.fieldKey) as ToolInputFieldRecord | undefined);
    void modelCompat;

    const raw = values[field.fieldKey];
    if (field.required && (raw == null || String(raw).trim() === "")) {
      errors.push(`Field "${field.fieldKey}" is required`);
    }
    if (field.fieldType === "select" && raw != null) {
      const id = String(raw);
      if (!field.options.some((o) => o.id === id)) {
        errors.push(`Invalid option for "${field.fieldKey}"`);
      }
    }
  }
  void modelId;
  return { ok: errors.length === 0, errors };
}
