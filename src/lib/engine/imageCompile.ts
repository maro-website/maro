/**
 * maroImazh / maroLogo compile helpers — legacy parity for flat OpenAI prompts
 * and normalized provider-request metadata (no provider calls).
 */

import type { ImageQuality, ImageSize } from "@/lib/tools/registry";
import {
  composeToolPrompt,
  findOption,
  getTool,
  type ToolSelections,
} from "@/lib/tools/registry";
import { MODULE_LIMITS } from "@/lib/generation/limits";
import type { CompileAttachmentMeta, CompiledGenerationBrief, CompileGenerationBriefInput } from "./types";
import type { EngineToolId } from "./types";
import { getRegistryToolId } from "./toolRegistry";

/** Legacy route — exact reference preservation instruction. */
export const IMAGE_REFERENCE_PRESERVATION =
  "IMPORTANT: Use the provided reference image(s) as the main subject/product. Keep the product's real shape, colors, label and proportions faithful; integrate it naturally and prominently into the composition.";

/** Text OFF when no reference images are in play — prohibit newly generated copy only. */
export const IMAGE_TEXT_OFF_NO_REFERENCE =
  "Do not add any text, headlines, captions, labels, letters, words, numbers or watermarks to the generated image.";

/** Text OFF when reference image(s) exist — preserve existing product typography/branding. */
export const IMAGE_TEXT_OFF_WITH_REFERENCE =
  "Do not add any new text, headlines, captions, labels or watermarks to the generated scene. Existing brand names, logos, labels, packaging typography, product markings, numbers and printed details visible in the provided reference image are part of the referenced product and should be preserved faithfully. Do not remove, rewrite, translate, replace or invent them.";

/** @deprecated Use {@link buildImageTextOffInstruction} — kept for imports expecting a single constant. */
export const IMAGE_TEXT_OFF = IMAGE_TEXT_OFF_NO_REFERENCE;

export const IMAGE_PARITY_MARKERS = {
  referencePreservation: "IMPORTANT: Use the provided reference image(s)",
  textOff: "Do not add any",
  textOffNoReference: IMAGE_TEXT_OFF_NO_REFERENCE,
  textOffWithReference: IMAGE_TEXT_OFF_WITH_REFERENCE,
  textOn: "Text: render any requested headline/text cleanly and legibly",
  fortHeader: "## BRIEF EKSPERT (maroFort)",
  brainHeader: "## maroBrain",
} as const;

export function promptHasTextOffInstruction(prompt: string): boolean {
  return (
    prompt.includes(IMAGE_TEXT_OFF_NO_REFERENCE) || prompt.includes(IMAGE_TEXT_OFF_WITH_REFERENCE)
  );
}

export function hasImageReferencesForTextOff(parts: {
  attachments?: Array<string | CompileAttachmentMeta>;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
}): boolean {
  return (
    hasImageReferenceAttachments(parts.attachments) ||
    Boolean(parts.brainLogoUrl?.trim()) ||
    (parts.matchedSourceUrls?.length ?? 0) > 0
  );
}

export function buildImageTextOffInstruction(hasReferences: boolean): string {
  return hasReferences ? IMAGE_TEXT_OFF_WITH_REFERENCE : IMAGE_TEXT_OFF_NO_REFERENCE;
}

export const IMAGE_PROVIDER_REF_LIMIT = 4;

/** Format option → OpenAI size (legacy production mapping). */
export const IMAGE_FORMAT_SIZE_MATRIX: Array<{
  format: string;
  legacySize: ImageSize;
  engineSize: ImageSize;
}> = [
  { format: "ig-post", legacySize: "1024x1536", engineSize: "1024x1536" },
  { format: "ig-story", legacySize: "1024x1536", engineSize: "1024x1536" },
  { format: "fb-post", legacySize: "1024x1024", engineSize: "1024x1024" },
  { format: "yt-thumb", legacySize: "1536x1024", engineSize: "1536x1024" },
];

export type ImageReferenceSource = "user" | "workspace_brain" | "matched_source";

export interface SafeImageReferenceMeta {
  index: number;
  sourceType: ImageReferenceSource;
  mime?: string;
  usable: boolean;
  includedInProviderRequest: boolean;
  /** Safe identifier only — never raw base64 or full data URLs. */
  identifier?: string;
}

export interface ImageReferenceResolution {
  referenceCountReceived: number;
  referenceCountUsable: number;
  referenceCountUsed: number;
  referenceLimit: number;
  operation: "generate" | "edit";
  referencesRequested: boolean;
  fallbackFromEditToGenerate: boolean;
  references: SafeImageReferenceMeta[];
}

export interface NormalizedOpenAIImageRequest {
  operation: "generate" | "edit";
  model: string;
  prompt: string;
  size: ImageSize;
  quality?: ImageQuality;
  n: number;
  references: SafeImageReferenceMeta[];
  referenceCountReceived: number;
  referenceCountUsable: number;
  referenceCountUsed: number;
  referenceLimit: number;
  referencesRequested: boolean;
  fallbackFromEditToGenerate: boolean;
}

function parseDataUrlMime(value: string): string | undefined {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(value);
  return m?.[1];
}

function safeRefIdentifier(value: string): string {
  if (value.startsWith("data:image/")) return "data-url";
  try {
    const u = new URL(value);
    return u.pathname.split("/").pop() || u.hostname;
  } catch {
    return "ref";
  }
}

function isUsableDataImage(value: string): boolean {
  return value.startsWith("data:image/");
}

/** Resolve reference semantics without persisting binary payloads. */
export function resolveImageReferences(input: {
  attachments?: Array<string | CompileAttachmentMeta>;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
  /** Simulates successful HTTP fetches in tests — url keys only, no bytes stored. */
  fetchedUrls?: Set<string>;
}): ImageReferenceResolution {
  const references: SafeImageReferenceMeta[] = [];
  let index = 0;

  const pushRef = (sourceType: ImageReferenceSource, raw: string, usable: boolean) => {
    references.push({
      index: index++,
      sourceType,
      mime: isUsableDataImage(raw) ? parseDataUrlMime(raw) : undefined,
      usable,
      includedInProviderRequest: false,
      identifier: safeRefIdentifier(raw),
    });
  };

  for (const item of input.attachments ?? []) {
    const raw = typeof item === "string" ? item : item.url ?? "";
    const type = typeof item === "string" ? "image" : item.type ?? "";
    if (typeof item !== "string" && !type.startsWith("image") && !raw.startsWith("data:image/")) {
      continue;
    }
    if (!raw && type.startsWith("image")) {
      pushRef("user", `attachment-${index}`, false);
      continue;
    }
    if (isUsableDataImage(raw)) {
      pushRef("user", raw, true);
    } else if (raw.startsWith("http")) {
      const fetched = input.fetchedUrls?.has(raw) ?? false;
      pushRef("user", raw, fetched);
    }
  }

  for (const url of input.matchedSourceUrls ?? []) {
    if (!url.trim()) continue;
    const usable = isUsableDataImage(url) || (input.fetchedUrls?.has(url) ?? false);
    pushRef("matched_source", url, usable);
  }

  if (input.brainLogoUrl?.trim()) {
    const url = input.brainLogoUrl.trim();
    const usable = isUsableDataImage(url) || (input.fetchedUrls?.has(url) ?? false);
    pushRef("workspace_brain", url, usable);
  }

  const referenceCountReceived = references.length;
  const usableRefs = references.filter((r) => r.usable);
  const referenceCountUsable = usableRefs.length;
  const referenceCountUsed = Math.min(referenceCountUsable, IMAGE_PROVIDER_REF_LIMIT);
  const referencesRequested = referenceCountReceived > 0;
  const operation = referenceCountUsed > 0 ? "edit" : "generate";
  const fallbackFromEditToGenerate = referencesRequested && referenceCountUsable === 0;

  for (let i = 0; i < references.length; i++) {
    references[i].includedInProviderRequest =
      references[i].usable && usableRefs.indexOf(references[i]) < referenceCountUsed;
  }

  return {
    referenceCountReceived,
    referenceCountUsable,
    referenceCountUsed,
    referenceLimit: IMAGE_PROVIDER_REF_LIMIT,
    operation,
    referencesRequested,
    fallbackFromEditToGenerate,
    references,
  };
}

export function resolveImageSize(
  toolId: EngineToolId,
  selections: ToolSelections,
  explicitSize?: ImageSize
): ImageSize {
  const registryId = getRegistryToolId(toolId);
  const tool = getTool(registryId);
  if (!tool) return explicitSize ?? "1024x1024";

  let size = explicitSize;
  for (const s of tool.settings) {
    const opt = findOption(s, selections[s.id] ?? s.default);
    if (opt?.size) size = opt.size;
  }
  return size ?? "1024x1024";
}

export function resolveImageN(requested?: number): number {
  return Math.min(Math.max(requested ?? 1, 1), MODULE_LIMITS.image.maxImagesPerRequest);
}

export function buildImageTextInstruction(
  toolId: EngineToolId,
  selections: ToolSelections,
  opts?: { hasReferences?: boolean }
): string | undefined {
  const registryId = getRegistryToolId(toolId);
  const tool = getTool(registryId);
  if (!tool) return undefined;

  const textSetting = tool.settings.find((s) => s.id === "text");
  if (!textSetting) return undefined;

  const textOn = (selections.text ?? textSetting.default) === "on";
  if (textOn) {
    const fontSetting = tool.settings.find((s) => s.id === "font");
    const fontOpt = fontSetting
      ? findOption(fontSetting, selections.font ?? fontSetting.default)
      : undefined;
    const fontNote = fontOpt ? ` Use a ${fontOpt.label} typography style.` : "";
    return `${IMAGE_PARITY_MARKERS.textOn}, spelling every word correctly.${fontNote}`;
  }
  return buildImageTextOffInstruction(Boolean(opts?.hasReferences));
}

export function hasImageReferenceAttachments(
  attachments?: Array<string | CompileAttachmentMeta>
): boolean {
  return (attachments ?? []).some((a) => {
    if (typeof a === "string") return a.startsWith("data:image/");
    return a.type.startsWith("image") || (a.url?.startsWith("data:image/") ?? false);
  });
}

/** Assemble flat OpenAI prompt in legacy production order. */
export function assembleImageFlatPrompt(parts: {
  toolId: EngineToolId;
  userPrompt: string;
  selections: ToolSelections;
  toolPrompts: Record<string, string>;
  presetPrompt?: string;
  attachments?: Array<string | CompileAttachmentMeta>;
  fortLayerText?: string;
  fortExpertBrief?: string;
  brainBrief?: string;
  matchedSourcesBrief?: string;
  workspaceBrandBrief?: string;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
}): string {
  const registryId = getRegistryToolId(parts.toolId);
  const tool = getTool(registryId);
  if (!tool) return parts.userPrompt;
  const toolPrompts = parts.toolPrompts ?? {};

  let finalPrompt = composeToolPrompt(
    tool,
    parts.selections,
    toolPrompts,
    parts.userPrompt
  );

  if (parts.presetPrompt?.trim()) {
    finalPrompt = `${parts.presetPrompt.trim()}\n\n${finalPrompt}`;
  }

  if (hasImageReferenceAttachments(parts.attachments)) {
    finalPrompt = `${finalPrompt}\n\n${IMAGE_REFERENCE_PRESERVATION}`;
  }

  const hasReferences = hasImageReferencesForTextOff({
    attachments: parts.attachments,
    brainLogoUrl: parts.brainLogoUrl,
    matchedSourceUrls: parts.matchedSourceUrls,
  });
  const textInstruction = buildImageTextInstruction(parts.toolId, parts.selections, {
    hasReferences,
  });
  if (textInstruction) {
    finalPrompt = `${finalPrompt}\n\n${textInstruction}`;
  }

  if (parts.fortLayerText?.trim() || parts.fortExpertBrief?.trim()) {
    const segments: string[] = [];
    if (parts.fortLayerText?.trim()) segments.push(parts.fortLayerText.trim());
    segments.push(finalPrompt);
    if (parts.fortExpertBrief?.trim()) {
      segments.push(`${IMAGE_PARITY_MARKERS.fortHeader}\n${parts.fortExpertBrief.trim()}`);
    }
    finalPrompt = segments.join("\n\n");
  }

  if (parts.brainBrief?.trim()) {
    finalPrompt = `${finalPrompt}\n\n${parts.brainBrief.trim()}`;
  } else if (parts.workspaceBrandBrief?.trim()) {
    finalPrompt = `${finalPrompt}\n\n${parts.workspaceBrandBrief.trim()}`;
  }

  if (parts.matchedSourcesBrief?.trim()) {
    finalPrompt = `${finalPrompt}\n\n${parts.matchedSourcesBrief.trim()}`;
  }

  return finalPrompt;
}

export function buildLegacyImageProviderRequest(input: {
  toolId: EngineToolId;
  userPrompt: string;
  selections: ToolSelections;
  toolPrompts: Record<string, string>;
  model: string;
  presetPrompt?: string;
  presetId?: string;
  attachments?: Array<string | CompileAttachmentMeta>;
  fortLayerText?: string;
  fortExpertBrief?: string;
  brainBrief?: string;
  matchedSourcesBrief?: string;
  workspaceBrandBrief?: string;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
  fetchedUrls?: Set<string>;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
}): NormalizedOpenAIImageRequest {
  const prompt = assembleImageFlatPrompt({
    ...input,
    brainLogoUrl: input.brainLogoUrl,
    matchedSourceUrls: input.matchedSourceUrls,
  });
  const refs = resolveImageReferences({
    attachments: input.attachments,
    brainLogoUrl: input.brainLogoUrl,
    matchedSourceUrls: input.matchedSourceUrls,
    fetchedUrls: input.fetchedUrls,
  });

  return {
    model: input.model,
    prompt,
    size: resolveImageSize(input.toolId, input.selections, input.size),
    quality: input.quality,
    n: resolveImageN(input.n),
    ...refs,
  };
}

/** Overlay actual legacy runtime reference outcome onto Engine-compiled provider metadata. */
export function applyRuntimeReferenceOutcome(
  compiled: NormalizedOpenAIImageRequest,
  runtime: NormalizedOpenAIImageRequest
): NormalizedOpenAIImageRequest {
  return {
    ...compiled,
    operation: runtime.operation,
    references: runtime.references.map((r) => ({ ...r })),
    referenceCountReceived: runtime.referenceCountReceived,
    referenceCountUsable: runtime.referenceCountUsable,
    referenceCountUsed: runtime.referenceCountUsed,
    referenceLimit: runtime.referenceLimit,
    referencesRequested: runtime.referencesRequested,
    fallbackFromEditToGenerate: runtime.fallbackFromEditToGenerate,
  };
}

export function buildEngineImageProviderRequest(
  brief: CompiledGenerationBrief,
  input: CompileGenerationBriefInput,
  ctx: { toolPrompts: Record<string, string> },
  opts?: {
    size?: ImageSize;
    quality?: ImageQuality;
    n?: number;
    brainLogoUrl?: string;
    matchedSourceUrls?: string[];
    fetchedUrls?: Set<string>;
    brainBriefOverride?: string;
    matchedSourcesBrief?: string;
    workspaceBrandBrief?: string;
  }
): NormalizedOpenAIImageRequest {
  const selections = brief.metadata.selections;
  const fortLayerText = brief.fortLayerText;
  const fortExpertBrief = brief.restrictions;

  const brainBrief =
    opts?.brainBriefOverride ??
    (brief.brandContext?.trim() ? brief.brandContext.trim() : undefined);

  const prompt = assembleImageFlatPrompt({
    toolId: brief.tool,
    userPrompt: input.userPrompt,
    selections,
    toolPrompts: ctx.toolPrompts,
    presetPrompt: input.presetPrompt ?? undefined,
    attachments: input.attachments,
    fortLayerText,
    fortExpertBrief,
    brainBrief,
    matchedSourcesBrief: opts?.matchedSourcesBrief,
    workspaceBrandBrief: opts?.workspaceBrandBrief,
    brainLogoUrl: opts?.brainLogoUrl,
    matchedSourceUrls: opts?.matchedSourceUrls,
  });

  const refs = resolveImageReferences({
    attachments: input.attachments,
    brainLogoUrl: opts?.brainLogoUrl,
    matchedSourceUrls: opts?.matchedSourceUrls,
    fetchedUrls: opts?.fetchedUrls,
  });

  return {
    model: brief.model,
    prompt,
    size: resolveImageSize(brief.tool, selections, opts?.size ?? input.explicitSize),
    quality: opts?.quality ?? input.quality,
    n: resolveImageN(opts?.n ?? input.n),
    ...refs,
  };
}
