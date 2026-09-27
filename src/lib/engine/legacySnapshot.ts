/**
 * Build legacy snapshots for shadow comparison from production assembly state.
 */

import { buildHtmlGenerateSystem, buildHtmlGenerateUser, buildWebHtmlOutputContract } from "@/lib/ai/prompts";
import type { AiGenerateRequest } from "@/lib/ai/types";
import type { NormalizedOpenAIImageRequest } from "./imageCompile";
import type { ShadowComparisonSnapshot } from "./types";

export function buildImageLegacySnapshot(input: {
  finalPrompt: string;
  model: string;
  imageProvider?: NormalizedOpenAIImageRequest;
  brainSections?: string[];
  fortValues?: Record<string, unknown>;
  appliedLayerNames?: string[];
  estimatedCredits?: number;
  presetId?: string;
  restrictions?: string;
}): ShadowComparisonSnapshot {
  const provider = input.imageProvider;
  return {
    systemInstructions: "",
    userContent: provider?.prompt ?? input.finalPrompt,
    brainSections: input.brainSections,
    fortValues: input.fortValues,
    appliedLayers: input.appliedLayerNames?.map((name, i) => ({
      layerKey: String(i),
      name,
      priority: 0,
      instructions: name,
    })),
    model: input.model,
    estimatedCredits: input.estimatedCredits,
    renderedPreview: provider?.prompt ?? input.finalPrompt,
    restrictions: input.restrictions,
    imageProvider: provider,
    metadata: input.presetId ? { presetId: input.presetId } : undefined,
  };
}

export function buildWebLegacySnapshot(input: {
  body: AiGenerateRequest;
  masterPlusOptions: string;
  fortBriefBlock?: string;
  model: string;
  estimatedCredits?: number;
  /** Pre-built messages from production route — preferred for exact parity. */
  legacySystem?: string;
  legacyUser?: string;
  selections?: Record<string, string>;
  fortEnabled?: boolean;
}): ShadowComparisonSnapshot {
  const system = input.legacySystem ?? buildHtmlGenerateSystem(input.body, input.masterPlusOptions);
  let user = input.legacyUser ?? buildHtmlGenerateUser(input.body);
  if (!input.legacyUser && input.fortBriefBlock?.trim()) {
    user = `${user}\n\n## BRIEF EKSPERT (maroFort)\n${input.fortBriefBlock.trim()}`;
  }

  return {
    systemInstructions: system,
    userContent: user,
    outputRequirements: buildWebHtmlOutputContract({
      websiteType: input.body.websiteType,
      language: input.body.language,
    }),
    model: input.model,
    estimatedCredits: input.estimatedCredits,
    websiteType: input.body.websiteType ?? "business",
    speed: input.body.speed,
    selections: input.selections,
    fortEnabled: input.fortEnabled,
    fortValues: input.fortEnabled ? input.body.fort?.values : undefined,
    attachmentsMeta: input.body.referenceImages?.map((url, index) => ({
      type: "image/reference",
      name: `reference-${index + 1}`,
      url,
    })),
    renderedPreview: `${system}\n\n---\n\n${user}`,
    metadata: {
      businessName: input.body.businessName,
      language: input.body.language,
      category: input.body.category,
      referenceImageCount: input.body.referenceImages?.length ?? 0,
    },
  };
}
