/**
 * Runtime maroImazh shadow payload — uses actual legacy provider outcome.
 */

import type { ImageQuality, ImageSize } from "@/lib/tools/registry";
import type { NormalizedOpenAIImageRequest, ImageReferenceResolution } from "./imageCompile";
import { resolveImageN } from "./imageCompile";
import type { EngineToolId } from "./types";
import { resolveEngineToolId } from "./toolRegistry";

export interface ImageShadowSchedulePayload {
  registryToolId: string;
  finalPrompt: string;
  model: string;
  userId: string;
  workspaceId?: string | null;
  userPrompt: string;
  selections: Record<string, string>;
  fort?: { enabled: boolean; values: Record<string, unknown> };
  attachments: Array<{ type: string; name?: string; url?: string }>;
  useBrain: boolean;
  brandOnly: boolean;
  estimatedCredits: number;
  generationId?: string;
  jobId?: string;
  presetId?: string;
  presetPrompt?: string;
  quality?: ImageQuality;
  n: number;
  size: ImageSize;
  toolPrompts: Record<string, string>;
  fortLayerText?: string;
  fortExpertBrief?: string;
  brainBrief?: string;
  matchedSourcesBrief?: string;
  workspaceBrandBrief?: string;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
  fetchedUrls: string[];
  legacyImageProvider: NormalizedOpenAIImageRequest;
  textMode: "on" | "off";
  font?: string;
}

export function buildRuntimeImageLegacyProvider(input: {
  finalPrompt: string;
  model: string;
  size: ImageSize;
  quality?: ImageQuality;
  n?: number;
  referenceOutcome: ImageReferenceResolution;
}): NormalizedOpenAIImageRequest {
  return {
    prompt: input.finalPrompt,
    model: input.model,
    size: input.size,
    quality: input.quality,
    n: resolveImageN(input.n),
    ...input.referenceOutcome,
  };
}

export function buildImageShadowContextMetadata(input: {
  payload: ImageShadowSchedulePayload;
  compileError?: string;
}): Record<string, unknown> {
  const p = input.payload.legacyImageProvider;
  return {
    operation: p.operation,
    size: p.size,
    quality: p.quality ?? null,
    n: p.n,
    textMode: input.payload.textMode,
    font: input.payload.font ?? null,
    referenceCountReceived: p.referenceCountReceived,
    referenceCountUsable: p.referenceCountUsable,
    referenceCountUsed: p.referenceCountUsed,
    referenceLimit: p.referenceLimit,
    referencesRequested: p.referencesRequested,
    fallbackFromEditToGenerate: p.fallbackFromEditToGenerate,
    referenceSources: p.references.map((r) => ({
      index: r.index,
      sourceType: r.sourceType,
      usable: r.usable,
      includedInProviderRequest: r.includedInProviderRequest,
      identifier: r.identifier,
    })),
    fortEnabled: Boolean(input.payload.fort?.enabled),
    brainUsed: input.payload.useBrain && Boolean(input.payload.brainBrief),
    brandOnly: input.payload.brandOnly,
    presetPresent: Boolean(input.payload.presetId),
    compileError: input.compileError ?? null,
  };
}

export function resolveImageEngineToolId(registryToolId: string): EngineToolId {
  return (resolveEngineToolId(registryToolId) ?? "maro_imazh") as EngineToolId;
}
