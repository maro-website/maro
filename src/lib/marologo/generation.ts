import type { AiImageRequest } from "@/lib/ai/imageTypes";
import type { FortPayload } from "@/lib/fort/types";
import { buildMaroLogoBrief } from "./briefBuilder";
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
    model: "gpt-image-2",
  };
}

export function buildGenerationRequest(
  wizard: MaroLogoWizardState,
  references: UploadedReference[],
  fort?: FortPayload
): AiImageRequest {
  const refs = references.slice(0, 3).map((r) => r.dataUrl);
  const brief = buildMaroLogoBrief(wizard, refs.length > 0);

  return {
    toolId: "logo",
    prompt: brief,
    selections: buildGenerationSelections(wizard),
    attachments: refs.length ? refs : undefined,
    fort,
    quality: "high",
    n: 1,
  };
}
