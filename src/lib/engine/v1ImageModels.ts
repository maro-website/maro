import "server-only";
import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";

export type V1ImageModule = "maro_imazh" | "maro_logo";
export type V1LogicalImageModel = "flare" | "sunburst";

/** Supported identifiers, not a fallback configuration or a price list. */
export const V1_IMAGE_PROVIDER_IDS = {
  flare: "gpt-image-2.5-flare",
  sunburst: "gpt-image-2.5-sunburst",
} as const;

export interface V1ImageModelConfiguration {
  id: string;
  module: V1ImageModule;
  logicalModel: V1LogicalImageModel;
  provider: "openai";
  providerModelId: string;
  enabled: boolean;
  isDefault: boolean;
  order: number;
  label: string;
  descriptor: string;
  customerCredits: number;
  pricingStage: "internal" | "launch";
  updatedAt: string;
  fingerprint: string;
}

function invalidConfig(field: string): never {
  throw new ImageRequestValidationError("invalid_model_configuration", 503, field);
}

function requestObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidConfig(field);
  return value as Record<string, unknown>;
}

/** Strict DB record boundary. Never fall back to registry, env or legacy pricing. */
export function readV1ImageModelConfiguration(value: unknown, module: V1ImageModule): V1ImageModelConfiguration {
  const row = requestObject(value, "modelConfiguration");
  const logicalModel = row.model_id;
  if (row.tool_id !== module || (logicalModel !== "flare" && logicalModel !== "sunburst") ||
      (module === "maro_logo" && logicalModel !== "flare")) invalidConfig("model_id");
  const metadata = requestObject(row.metadata, "metadata");
  const cost = requestObject(row.cost_metadata, "cost_metadata");
  if (row.provider !== "openai" || metadata.providerModelId !== V1_IMAGE_PROVIDER_IDS[logicalModel]) invalidConfig("providerModelId");
  if (typeof row.enabled !== "boolean" || typeof row.coming_soon !== "boolean") invalidConfig("enabled");
  if (typeof row.is_default !== "boolean") invalidConfig("is_default");
  if (typeof row.id !== "string" || !row.id || typeof row.updated_at !== "string" || !row.updated_at) invalidConfig("id/updated_at");
  if (typeof row.display_name !== "string" || !row.display_name.trim() || row.display_name.length > 80) invalidConfig("display_name");
  if (typeof metadata.description !== "string" || metadata.description.length > 240) invalidConfig("description");
  if (!Number.isSafeInteger(row.sort_order) || Number(row.sort_order) < 0) invalidConfig("sort_order");
  if (!Number.isSafeInteger(cost.customerCredits) || Number(cost.customerCredits) <= 0) {
    throw new ImageRequestValidationError("invalid_model_price", 503);
  }
  if (cost.pricingStage !== "internal" && cost.pricingStage !== "launch") invalidConfig("pricingStage");
  const config: Omit<V1ImageModelConfiguration, "fingerprint"> = {
    id: row.id, module, logicalModel,
    provider: "openai" as const, providerModelId: metadata.providerModelId as string,
    enabled: row.enabled && !row.coming_soon, isDefault: row.is_default,
    order: row.sort_order as number, label: row.display_name.trim(), descriptor: metadata.description,
    customerCredits: cost.customerCredits as number, pricingStage: cost.pricingStage,
    updatedAt: row.updated_at,
  };
  return { ...config, fingerprint: createHash("sha256").update(JSON.stringify(config)).digest("hex") };
}

export async function loadV1ImageModelRows(module: V1ImageModule): Promise<unknown[]> {
  try {
    const { data, error } = await getSupabaseAdmin().from("tool_model_configs")
      .select("id,tool_id,model_id,provider,display_name,enabled,is_default,coming_soon,sort_order,metadata,cost_metadata,updated_at")
      .eq("tool_id", module).in("model_id", ["flare", "sunburst"]);
    if (error || !Array.isArray(data)) throw new Error("model_config_unavailable");
    return data;
  } catch {
    throw new ImageRequestValidationError("model_config_unavailable", 503);
  }
}

export function validateV1ModelSet(rows: unknown[], module: V1ImageModule) {
  const models = rows.map((row) => readV1ImageModelConfiguration(row, module));
  if (new Set(models.map((m) => m.logicalModel)).size !== models.length ||
      models.filter((m) => m.isDefault).length !== 1 ||
      !models.some((m) => m.enabled && m.isDefault)) invalidConfig("default_model");
  return models;
}

export function resolveV1ImageModel(rows: unknown[], module: V1ImageModule, logicalModel?: V1LogicalImageModel) {
  if (!rows.length) throw new ImageRequestValidationError("model_not_configured", 503);
  const models = validateV1ModelSet(rows, module);
  logicalModel ??= models.find((m) => m.isDefault)!.logicalModel;
  const matches = rows.filter((value) => {
    const row = requestObject(value, "modelConfiguration");
    return row.tool_id === module && row.model_id === logicalModel;
  });
  if (matches.length !== 1) throw new ImageRequestValidationError("model_not_configured", 503);
  const row = requestObject(matches[0], "modelConfiguration");
  if (row.enabled === false || row.coming_soon === true) throw new ImageRequestValidationError("model_disabled", 400);
  return readV1ImageModelConfiguration(row, module);
}

/** Allowlisted projection for a future promptbox; no provider IDs or arbitrary metadata. */
export function publicV1ImageModel(config: V1ImageModelConfiguration) {
  return {
    key: config.logicalModel, label: config.label, descriptor: config.descriptor,
    customerCredits: config.customerCredits, enabled: config.enabled, isDefault: config.isDefault, order: config.order,
  };
}
