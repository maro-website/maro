import "server-only";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, getWorkspaceBrainProfile, getWorkspaceBrand, getWorkspaceSources } from "@/lib/supabase/server";
import { buildBrainBrief, buildMatchedSourcesBrief, matchSourcesByPrompt } from "@/lib/workspaces/brainProfile";
import { buildWorkspaceBrandBrief } from "@/lib/workspaces/brand";
import { buildMaroLogoBrief } from "@/lib/marologo/briefBuilder";
import { wrapPresetRecommendation } from "@/lib/presets/model";
import { resolveWorkspaceImageReference, type ResolvedImageReference } from "@/lib/ai/imageReferences";
import type { TrustedV1ImageRequest, resolveV1ImageRequest } from "./v1ImageRequest";
import { ImageRequestValidationError } from "./requestValidation";

export const CANONICAL_IMAGE_VERSION = "maro-v1-canonical/1";
export const promptHash = (value: string) => createHash("sha256").update(value.replace(/\r\n?/g, "\n")).digest("hex");
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export const configurationHash = (value: unknown) => promptHash(stable(value));
export interface ProductionImagePrompt {
  system: { id: string; tool_id: string; version_label: string; status: string; content: string };
  layers: Array<{ id: string; tool_id: string; layer_key: string; version_label: string; status: string; enabled: boolean; priority: number; instructions: string; conditions: unknown; updated_at?: string }>;
}
export interface CanonicalImageContext {
  presetPrompt?: string;
  brainText?: string;
  references: Array<{ id: string; digest: string; source: "user" | "brain" }>;
}

export async function loadProductionImagePrompt(module: TrustedV1ImageRequest["module"]): Promise<ProductionImagePrompt> {
  const db = getSupabaseAdmin();
  const [systems, layers] = await Promise.all([
    db.from("system_prompt_versions").select("id,tool_id,version_label,status,content").eq("tool_id", module).eq("status", "live"),
    db.from("prompt_layers").select("id,tool_id,layer_key,version_label,status,enabled,priority,instructions,conditions,updated_at").eq("tool_id", module),
  ]);
  if (systems.error || layers.error) throw new ImageRequestValidationError("prompt_configuration_unavailable", 503);
  if (systems.data?.length !== 1 || !systems.data[0].content?.trim()) throw new ImageRequestValidationError("ambiguous_production_prompt", 503);
  return { system: systems.data[0], layers: layers.data ?? [] };
}

/** One pure compiler for production and admin preview. No DB, flags or provider reconstruction. */
export function buildCanonicalImagePrompt(request: TrustedV1ImageRequest, config: ProductionImagePrompt, context: CanonicalImageContext) {
  if (config.system.tool_id !== request.module || config.system.status !== "live" || !config.system.id || !config.system.version_label || !config.system.content.trim()) throw new ImageRequestValidationError("invalid_production_prompt", 503);
  const brainAllowed = request.module === "maro_imazh" && request.useBrain && Boolean(request.workspaceId);
  const references = context.references.filter((ref) => ref.source === "user" || brainAllowed).slice(0, 4);
  const brainText = brainAllowed ? context.brainText?.trim() ?? "" : "";
  const fields: Record<string, string> = { ...Object.fromEntries(Object.entries(request.selections).filter(([k]) => k !== "model").map(([k, v]) => [`selections.${k}`, v])), hasReferences: String(references.length > 0), useBrain: String(brainAllowed) };
  const excluded: Array<{ id: string; reason: string }> = [];
  const candidates = config.layers.filter((layer) => {
    let reason = "";
    if (layer.tool_id !== request.module || layer.status !== "live" || !layer.enabled) reason = "inactive_or_other_module";
    else if (!/^v1\.production\./.test(layer.layer_key) || /(^|[._-])(fort|brain|web|future|legacy|migration|obsolete)([._-]|$)/i.test(layer.layer_key)) reason = "not_v1_production";
    else if (!Array.isArray(layer.conditions) || layer.conditions.some((condition) => !condition || typeof condition !== "object" || typeof condition.field !== "string" || !Object.hasOwn(fields, condition.field) || !Array.isArray(condition.equals) || condition.equals.length === 0 || condition.equals.some((v: unknown) => typeof v !== "string") || Object.keys(condition).some((k) => !["field", "equals"].includes(k)))) reason = "unsupported_condition";
    else if (!layer.conditions.every((condition) => condition.equals.includes(fields[condition.field]))) reason = "condition_not_matched";
    if (reason) { excluded.push({ id: layer.id, reason }); return false; }
    if (!Number.isSafeInteger(layer.priority) || !layer.id || !layer.version_label || typeof layer.instructions !== "string" || !layer.instructions.trim()) throw new ImageRequestValidationError("invalid_production_layer", 503);
    return true;
  }).sort((a, b) => b.priority - a.priority || (a.layer_key < b.layer_key ? -1 : a.layer_key > b.layer_key ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (new Set(candidates.map((l) => l.layer_key)).size !== candidates.length) throw new ImageRequestValidationError("duplicate_production_layer", 503);
  const preset = request.presetId && request.presetContentHash && context.presetPrompt ? context.presetPrompt : "";
  if (request.presetId && !preset) throw new ImageRequestValidationError("preset_snapshot_missing", 503);
  if (preset && createHash("sha256").update(preset).digest("hex") !== request.presetContentHash) throw new ImageRequestValidationError("preset_snapshot_mismatch", 503);
  const brief = request.module === "maro_logo"
    ? buildMaroLogoBrief(request.logoWizard!, references.length > 0)
    : request.prompt;
  const category = (key: string) => key.startsWith("v1.production.reference.") ? "reference" : key.startsWith("v1.production.output.") ? "output" : "direction";
  const section = (kind: string) => candidates.filter((l) => category(l.layer_key) === kind).map((l) => l.instructions);
  const orderedLayers = ["direction", "reference", "output"].flatMap((kind) => candidates.filter((l) => category(l.layer_key) === kind));
  const parts = [config.system.content, ...section("direction"), preset ? wrapPresetRecommendation(preset) : "", brainText, ...section("reference"), brief, ...section("output")];
  const prompt = parts.map((p) => p.replace(/\r\n?/g, "\n").trim()).filter(Boolean).join("\n\n");
  const provenance = {
    version: CANONICAL_IMAGE_VERSION,
    system: { id: config.system.id, version: config.system.version_label, hash: promptHash(config.system.content) },
    layers: orderedLayers.map((l) => ({ id: l.id, key: l.layer_key, version: l.version_label, hash: promptHash(l.instructions), priority: l.priority, conditions: l.conditions })),
    preset: preset ? { id: request.presetId, hash: request.presetContentHash } : null,
    brainUsed: Boolean(brainText || references.some((r) => r.source === "brain")), brainHash: brainText ? promptHash(brainText) : null,
    references, promptHash: promptHash(prompt),
  };
  const { idempotencyKey: _transportKey, ...normalizedInputs } = request;
  return Object.freeze({ prompt, provenance, configurationHash: configurationHash({ request: normalizedInputs, provenance }), excludedLayers: excluded.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    model: request.model.providerModelId, size: request.size, quality: request.quality, n: request.imageCount,
    operation: references.length ? "edit" as const : "generate" as const });
}
export type CanonicalImageCompilation = ReturnType<typeof buildCanonicalImagePrompt>;

/** Resolve permitted existing workspace context once. Both preview and execution call this service. */
export async function compileTrustedImageRequest(trusted: Awaited<ReturnType<typeof resolveV1ImageRequest>>, previewDraftId?: string) {
  const request = trusted.snapshot;
  const config = await loadProductionImagePrompt(request.module);
  // This argument is supplied only by the MFA-protected admin preview endpoint.
  if (previewDraftId) {
    const { data, error } = await getSupabaseAdmin().from("system_prompt_versions").select("id,tool_id,version_label,status,content").eq("id", previewDraftId).eq("tool_id", request.module).in("status", ["draft", "review"]).single();
    if (error || !data?.content?.trim()) throw new ImageRequestValidationError("invalid_preview_draft", 400);
    config.system = { ...data, status: "live" };
  }
  const context: CanonicalImageContext = { presetPrompt: trusted.presetPrompt, references: [] };
  const bytes: string[] = [];
  const digests = new Set<string>();
  function append(id: string, resolved: ResolvedImageReference, source: "user" | "brain") {
    if (digests.has(resolved.digest) || bytes.length >= 4) return;
    digests.add(resolved.digest); bytes.push(resolved.dataUrl);
    context.references.push({ id, digest: resolved.digest, source });
  }
  for (const ref of request.references) append(ref.id, trusted.resolvedReferences.get(ref.id)!, "user");
  if (request.module === "maro_imazh" && request.useBrain && request.workspaceId) {
    const brain = await getWorkspaceBrainProfile(request.userId, request.workspaceId);
    const brand = await getWorkspaceBrand(request.userId, request.workspaceId);
    const urls: string[] = [];
    if (brain) {
      const sources = await getWorkspaceSources(request.userId, request.workspaceId);
      const orderedSources = [...sources].sort((a, b) => a.createdAt === b.createdAt ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.createdAt > b.createdAt ? -1 : 1);
      const matched = matchSourcesByPrompt(request.prompt, orderedSources);
      context.brainText = [buildBrainBrief(brain), matched.length ? buildMatchedSourcesBrief(matched) : ""].filter(Boolean).join("\n\n");
      urls.push(...matched.map((s) => s.fileUrl).filter(Boolean));
      if (brain.brand.logoUrl) urls.push(brain.brand.logoUrl);
    } else if (brand) {
      context.brainText = buildWorkspaceBrandBrief(brand);
      if (brand.logoUrl) urls.push(brand.logoUrl);
    }
    for (const url of urls) {
      try { append(url, await resolveWorkspaceImageReference(url, request.userId), "brain"); }
      catch { /* Preserve existing behavior: inaccessible optional Brain assets are excluded. */ }
    }
  }
  return { compilation: buildCanonicalImagePrompt(request, config, context), images: bytes, config };
}

/** Existing admin-only pricing snapshot storage also owns the full execution configuration. */
export async function recordCanonicalImageTrace(jobId: string, request: TrustedV1ImageRequest, compilation: CanonicalImageCompilation) {
  const { data, error } = await getSupabaseAdmin().from("pricing_snapshots").insert({
    job_id: jobId, user_id: request.userId, kind: "generation",
    snapshot: { record_type: "v1_image_execution", request, canonical: compilation, configured_credits: request.model.customerCredits },
  }).select("id").single();
  if (error || !data?.id) throw new ImageRequestValidationError("execution_trace_unavailable", 503);
  return data.id as string;
}
