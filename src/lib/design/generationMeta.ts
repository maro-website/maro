import { resolveImageFormatMeta } from "@/lib/design/aspectRatio";
import type { ToolDef, ToolSelections } from "@/lib/tools/registry";
import { findOption } from "@/lib/tools/registry";

export type GenerationLabels = {
  format: string;
  size: string;
  formatLabel: string;
  modelLabel?: string;
  speedLabel?: string;
};

/** Resolve display labels for a generation from tool settings. */
export function resolveGenerationLabels(tool: ToolDef, selections: ToolSelections): GenerationLabels {
  const { format, size } = resolveImageFormatMeta(tool, selections);

  const modelSetting = tool.settings.find((s) => s.id === "model");
  const speedSetting = tool.settings.find((s) => s.id === "speed");

  const modelId = modelSetting ? (selections[modelSetting.id] ?? modelSetting.default) : undefined;
  const speedId = speedSetting ? (selections[speedSetting.id] ?? speedSetting.default) : undefined;

  const modelOpt = modelSetting && modelId ? findOption(modelSetting, modelId) : undefined;
  const speedOpt = speedSetting && speedId ? findOption(speedSetting, speedId) : undefined;

  return {
    format,
    size,
    formatLabel: format,
    modelLabel: modelOpt?.label,
    speedLabel: speedOpt?.label,
  };
}

/** Fallback format label for legacy creations without formatLabel. */
export function fallbackFormatLabel(format?: string, size?: string): string | undefined {
  if (format) return format;
  if (size === "1024x1536") return "9:16";
  if (size === "1536x1024") return "16:9";
  if (size === "1024x1024") return "1:1";
  return undefined;
}
