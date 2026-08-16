import type { AiImageRequest } from "@/lib/ai/imageTypes";
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
    present: "color",
    speed: "normal",
    model: "gpt-image-2",
  };
}

export function buildGenerationRequest(
  wizard: MaroLogoWizardState,
  references: UploadedReference[]
): AiImageRequest {
  const refs = references.slice(0, 3).map((r) => r.dataUrl);
  const brief = buildMaroLogoBrief(wizard, refs.length > 0);

  return {
    toolId: "logo",
    prompt: brief,
    selections: buildGenerationSelections(wizard),
    attachments: refs.length ? refs : undefined,
    quality: "high",
    n: 1,
  };
}
