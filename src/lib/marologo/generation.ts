import { MAX_COMPOSER_ATTACHMENTS } from "@/lib/config/attachments";
import type { AiImageRequest } from "@/lib/ai/imageTypes";
import type { FortPayload } from "@/lib/fort/types";
import type { LogoTypeValue, MaroLogoWizardState, UploadedReference } from "./types";

export function mapLogoTypeToRegistry(type: LogoTypeValue): string {
  switch (type) {
    case "wordmark":
      return "typography";
    case "symbol":
      return "symbol";
    case "symbol_wordmark":
    case "maro_decides":
      return "both";
    default:
      return "both";
  }
}

export function buildGenerationSelections(wizard: MaroLogoWizardState): Record<string, string> {
  return {
    type: mapLogoTypeToRegistry(wizard.logo.type),
    type_source: wizard.logo.type,
    present: wizard.presentation.mode,
    visual_style: wizard.look.visualStyle,
    concept_intent: wizard.logo.conceptIntent,
    speed: "normal",
    model: "flare",
  };
}

export function buildGenerationRequest(
  wizard: MaroLogoWizardState,
  references: UploadedReference[],
  fort?: FortPayload,
  canonicalReferences?: string[],
  presetId?: string
): AiImageRequest {
  const refs = (canonicalReferences ?? []).slice(0, MAX_COMPOSER_ATTACHMENTS);

  return {
    toolId: "logo",
    // The server builds all Logo instructions from the structured answers.
    prompt: "",
    selections: buildGenerationSelections(wizard),
    logoWizard: structuredClone(wizard),
    attachments: refs.length ? refs : undefined,
    fort,
    maroPrompt: presetId ? { id: presetId } : undefined,
    quality: "high",
    n: 1,
  };
}
