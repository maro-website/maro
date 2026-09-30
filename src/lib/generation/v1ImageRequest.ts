import "server-only";
import { createHash } from "node:crypto";
import { generationAvailabilityError, resolveProductModule } from "@/lib/modules/availability";
import { findOption, getTool, type ImageSize } from "@/lib/tools/registry";
import { loadLogoContent } from "@/lib/marologo/contentServer";
import { logoContentAnswerErrors, type LogoContent } from "@/lib/marologo/content";
import { validateLogoWizardAnswers } from "@/lib/marologo/request";
import { mapLogoTypeToRegistry } from "@/lib/marologo/generation";
import type { MaroLogoWizardState } from "@/lib/marologo/types";
import { getActiveWorkspaceId, getPromptTemplate, getSupabaseAdmin } from "@/lib/supabase/server";
import { resolvePrivateImageReference, type ResolvedImageReference } from "@/lib/ai/imageReferences";
import { loadV1ImageModelRows, resolveV1ImageModel, type V1ImageModule, type V1LogicalImageModel, type V1ImageModelConfiguration } from "@/lib/engine/v1ImageModels";
import { ImageRequestValidationError, knownKeys, requestBoolean, requestChoice, requestObject, requestString } from "./requestValidation";
import { IMAZH_REQUEST_PROMPT_MAX_CHARS } from "./imagePromptValidation";

export { ImageRequestValidationError } from "./requestValidation";
export const V1_IMAGE_REQUEST_VERSION = "v1-image-request/1";

export interface ParsedV1ImageRequest {
  module: V1ImageModule;
  registryToolId: "reklama" | "logo";
  logicalModel?: V1LogicalImageModel;
  prompt: string;
  selections: Record<string, string>;
  imageCount: 1;
  quality: "high";
  size: ImageSize;
  referenceIds: string[];
  presetId?: string;
  requestedWorkspaceId?: string;
  useBrain: boolean;
  logoWizard?: MaroLogoWizardState;
  idempotencyKey?: string;
}

/** No database, provider or financial work. Explicit invalid values are never defaults. */
export function parseV1ImageRequest(value: unknown): ParsedV1ImageRequest {
  const raw = requestObject(value, "request");
  const denial = generationAvailabilityError(raw.toolId);
  if (denial) throw new ImageRequestValidationError(denial.error, denial.status, "toolId");
  const logo = resolveProductModule(raw.toolId) === "logo";
  knownKeys(raw, ["toolId", "prompt", "model", "selections", "size", "quality", "n", "attachments", "maroPrompt", "workspaceId", "useWorkspaceBrand", "logoWizard", "idempotencyKey", "fort"], "request");
  if (!logo && typeof raw.prompt !== "string") throw new ImageRequestValidationError("invalid_string", 400, "prompt");
  if (!logo && (raw.prompt as string).length > IMAZH_REQUEST_PROMPT_MAX_CHARS) {
    throw new ImageRequestValidationError("prompt_too_long", 400, "prompt", {
      userPromptLength: (raw.prompt as string).length, maxUserPromptLength: IMAZH_REQUEST_PROMPT_MAX_CHARS,
    });
  }
  let prompt = requestString(raw.prompt, "prompt", logo ? 24000 : IMAZH_REQUEST_PROMPT_MAX_CHARS, "");
  if (!logo && !prompt) throw new ImageRequestValidationError("missing-prompt");
  const submitted = raw.selections === undefined ? {} : requestObject(raw.selections, "selections");
  const requestedModel = raw.model === undefined ? submitted.model : raw.model;
  if (raw.model !== undefined && submitted.model !== undefined && raw.model !== submitted.model) {
    throw new ImageRequestValidationError("conflicting_model");
  }
  if (requestedModel !== undefined && requestedModel !== "flare" && requestedModel !== "sunburst") {
    throw new ImageRequestValidationError("unknown_model");
  }
  const logicalModel = requestedModel ?? (logo ? "flare" : undefined);
  if (logo && logicalModel !== "flare") throw new ImageRequestValidationError("model_not_allowed");
  const registryToolId = logo ? "logo" : "reklama";
  const tool = getTool(registryToolId)!;
  knownKeys(submitted, [...tool.settings.map((setting) => setting.id), ...(logo ? ["type_source", "visual_style", "concept_intent"] : [])], "selections");
  const selections: Record<string, string> = logicalModel ? { model: logicalModel } : {};
  for (const setting of tool.settings) {
    if (setting.id === "model") continue;
    const selected = submitted[setting.id] === undefined ? setting.default : submitted[setting.id];
    if (typeof selected !== "string" || !findOption(setting, selected) || findOption(setting, selected)?.available === false) {
      throw new ImageRequestValidationError("invalid_option", 400, `selections.${setting.id}`);
    }
    selections[setting.id] = selected;
  }

  let logoWizard: MaroLogoWizardState | undefined;
  if (logo) {
    logoWizard = validateLogoWizardAnswers(raw.logoWizard);
    // Browser-built instructions are never authoritative or retained as internal instructions.
    prompt = `${logoWizard.brand.name}: ${logoWizard.brand.description}`;
    const answers = {
      type: mapLogoTypeToRegistry(logoWizard.logo.type), type_source: logoWizard.logo.type,
      present: logoWizard.presentation.mode, visual_style: logoWizard.look.visualStyle, concept_intent: logoWizard.logo.conceptIntent,
    };
    for (const [key, answer] of Object.entries(answers)) {
      if (submitted[key] !== undefined && submitted[key] !== answer) throw new ImageRequestValidationError("conflicting_logo_answer", 400, key);
      selections[key] = answer;
    }
    if (selections.speed !== "normal") throw new ImageRequestValidationError("invalid_option", 400, "selections.speed");
  } else if (raw.logoWizard !== undefined) {
    throw new ImageRequestValidationError("unexpected_logo_answers");
  }

  if (raw.n !== undefined && raw.n !== 1) throw new ImageRequestValidationError("invalid_image_count");
  const quality = requestChoice(raw.quality, ["high"], "quality", "high");
  const format = tool.settings.find((setting) => setting.id === "format");
  const size: ImageSize = format ? findOption(format, selections.format)!.size! : "1024x1024";
  if (raw.size !== undefined && raw.size !== size) throw new ImageRequestValidationError("invalid_size");

  const referenceIds = raw.attachments === undefined ? [] : raw.attachments;
  // Match the existing non-admin reference guard (3), which is stricter than the old composer (4).
  if (!Array.isArray(referenceIds) || referenceIds.length > 3 || new Set(referenceIds).size !== referenceIds.length ||
      referenceIds.some((ref) => typeof ref !== "string" || ref.length > 1024 || !ref.startsWith("storage:generations/"))) {
    throw new ImageRequestValidationError("invalid_image_reference");
  }
  let presetId: string | undefined;
  if (raw.maroPrompt !== undefined) {
    const preset = requestObject(raw.maroPrompt, "maroPrompt");
    knownKeys(preset, ["id"], "maroPrompt");
    presetId = requestString(preset.id, "maroPrompt.id", 128);
    if (!presetId) throw new ImageRequestValidationError("invalid_preset");
  }
  let requestedWorkspaceId: string | undefined;
  if (raw.workspaceId !== undefined) {
    requestedWorkspaceId = requestString(raw.workspaceId, "workspaceId", 128);
    if (!/^[a-zA-Z0-9_-]+$/.test(requestedWorkspaceId)) throw new ImageRequestValidationError("invalid_workspace");
  }
  const requestedBrain = requestBoolean(raw.useWorkspaceBrand, "useWorkspaceBrand");
  const idempotencyKey = raw.idempotencyKey === undefined ? undefined : requestString(raw.idempotencyKey, "idempotencyKey", 128);
  if (idempotencyKey === "") throw new ImageRequestValidationError("invalid_idempotency_key");
  // Fort remains governed by Phase 1: stale payloads are intentionally discarded, never interpreted.
  return {
    module: logo ? "maro_logo" : "maro_imazh", registryToolId, logicalModel, prompt, selections,
    imageCount: 1, quality, size, referenceIds: [...referenceIds], presetId, requestedWorkspaceId,
    useBrain: !logo && requestedBrain, logoWizard, idempotencyKey,
  };
}

async function resolveOwnedWorkspace(userId: string, requestedId?: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  let id = requestedId;
  if (id === undefined) {
    try { id = (await getActiveWorkspaceId(userId, { strict: true })) ?? undefined; }
    catch { throw new ImageRequestValidationError("workspace_unavailable", 503); }
  }
  if (id === undefined) return null;
  const { data, error } = await admin.from("workspaces").select("id").eq("id", id).eq("owner_id", userId).maybeSingle();
  if (error) throw new ImageRequestValidationError("workspace_unavailable", 503);
  if (!data?.id) throw new ImageRequestValidationError("forbidden_workspace", 403);
  return data.id;
}

const dependencies = {
  loadModels: loadV1ImageModelRows,
  loadLogoContent,
  resolveWorkspace: resolveOwnedWorkspace,
  resolveReference: resolvePrivateImageReference,
  loadPreset: (...args: Parameters<typeof getPromptTemplate>) => getPromptTemplate(...args),
};
export type V1ImageRequestDependencies = Omit<typeof dependencies, "loadLogoContent"> & { loadLogoContent?: () => Promise<LogoContent> };

export interface TrustedV1ImageRequest extends Omit<ParsedV1ImageRequest, "requestedWorkspaceId" | "referenceIds"> {
  logicalModel: V1LogicalImageModel;
  contractVersion: typeof V1_IMAGE_REQUEST_VERSION;
  modulePolicy: "maro-v1";
  inputPolicy: "existing-image-ui/1";
  userId: string;
  workspaceId: string | null;
  model: V1ImageModelConfiguration;
  references: Array<{ id: string; digest: string; mime: string }>;
  presetContentHash?: string;
}

function freezeSnapshot<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeSnapshot(child);
    Object.freeze(value);
  }
  return value;
}

/** Resolve once before financial work; reference bytes and preset instructions stay out of metadata. */
export async function resolveV1ImageRequest(
  parsed: ParsedV1ImageRequest,
  userId: string,
  deps: V1ImageRequestDependencies = dependencies
): Promise<{ snapshot: Readonly<TrustedV1ImageRequest>; resolvedReferences: ReadonlyMap<string, ResolvedImageReference>; presetPrompt?: string }> {
  if (!userId) throw new ImageRequestValidationError("unauthorized", 401);
  // Clone caller-owned inputs so freezing this generation never freezes UI/test/source objects.
  const input = structuredClone(parsed);
  const model = resolveV1ImageModel(await deps.loadModels(input.module), input.module, input.logicalModel);
  if (input.logoWizard && deps.loadLogoContent) {
    const content = await deps.loadLogoContent();
    if (Object.keys(logoContentAnswerErrors(input.logoWizard, content)).length) throw new ImageRequestValidationError("invalid_logo_content_answer");
  }
  const workspaceId = await deps.resolveWorkspace(userId, input.requestedWorkspaceId);
  if (input.useBrain && !workspaceId) throw new ImageRequestValidationError("workspace_required");

  let presetPrompt: string | undefined;
  if (input.presetId) {
    const preset = await deps.loadPreset(input.presetId, input.registryToolId);
    if (!preset?.full_prompt?.trim() || preset.target_tool !== input.registryToolId) throw new ImageRequestValidationError("invalid_preset");
    presetPrompt = preset.full_prompt;
  }
  const resolvedReferences = new Map<string, ResolvedImageReference>();
  for (const id of input.referenceIds) {
    try {
      resolvedReferences.set(id, await deps.resolveReference(id, userId));
    } catch (error) {
      const code = (error as Error)?.message ?? "invalid_image_reference";
      const allowed = ["forbidden_reference", "reference_not_found", "file_too_large", "invalid_image_reference", "mime_mismatch", "unsupported_file_type"];
      throw new ImageRequestValidationError(allowed.includes(code) ? code : "invalid_image_reference", code === "forbidden_reference" ? 403 : code === "reference_not_found" ? 404 : 400);
    }
  }
  const { referenceIds: _refs, requestedWorkspaceId: _workspace, ...normalized } = input;
  const snapshot = freezeSnapshot<TrustedV1ImageRequest>({
    ...normalized, contractVersion: V1_IMAGE_REQUEST_VERSION, modulePolicy: "maro-v1" as const, inputPolicy: "existing-image-ui/1" as const,
    userId, workspaceId, model, logicalModel: model.logicalModel, selections: { ...input.selections, model: model.logicalModel },
    references: [...resolvedReferences].map(([id, ref]) => ({ id, digest: ref.digest, mime: ref.mime })),
    ...(presetPrompt ? { presetContentHash: createHash("sha256").update(presetPrompt).digest("hex") } : {}),
  });
  return { snapshot, resolvedReferences, presetPrompt };
}

export function v1ImageValidationResponse(error: unknown, requestId?: string): Response {
  if (error instanceof ImageRequestValidationError) {
    return Response.json({ error: error.code, ...(error.field ? { field: error.field } : {}), ...error.metadata,
      ...(requestId ? { requestId } : {}) }, { status: error.status });
  }
  return Response.json({ error: "request_configuration_unavailable", ...(requestId ? { requestId } : {}) }, { status: 503 });
}
