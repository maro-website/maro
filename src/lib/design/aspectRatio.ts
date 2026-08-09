import type { ToolDef, ToolSelections } from "@/lib/tools/registry";
import { findOption } from "@/lib/tools/registry";

/** Map generation format / size to CSS aspect-ratio and max-width. */
const FORMAT_RATIOS: Record<string, { ratio: string; maxW: string }> = {
  "1:1": { ratio: "1 / 1", maxW: "min(100%, 420px)" },
  square: { ratio: "1 / 1", maxW: "min(100%, 420px)" },
  "9:16": { ratio: "9 / 16", maxW: "min(100%, 320px)" },
  portrait: { ratio: "9 / 16", maxW: "min(100%, 320px)" },
  "16:9": { ratio: "16 / 9", maxW: "min(100%, 560px)" },
  landscape: { ratio: "16 / 9", maxW: "min(100%, 560px)" },
};

const SIZE_RATIOS: Record<string, { ratio: string; maxW: string }> = {
  "1024x1024": FORMAT_RATIOS["1:1"],
  "1024x1536": FORMAT_RATIOS["9:16"],
  "1536x1024": FORMAT_RATIOS["16:9"],
};

export function resolveAspectBox(format?: string, size?: string) {
  if (format) {
    const key = format.toLowerCase();
    if (FORMAT_RATIOS[key]) return FORMAT_RATIOS[key];
  }
  if (size && SIZE_RATIOS[size]) return SIZE_RATIOS[size];
  return FORMAT_RATIOS["1:1"];
}

export function formatGenerationDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
}

export function resolveImageFormatMeta(tool: ToolDef, selections: ToolSelections) {
  const formatSetting = tool.settings.find((s) => s.id === "format");
  if (!formatSetting) {
    return { format: "1:1", size: "1024x1024" as const };
  }
  const optId = selections[formatSetting.id] ?? formatSetting.default;
  const opt = findOption(formatSetting, optId);
  const size = opt?.size ?? "1024x1024";
  const format =
    size === "1024x1536" ? "9:16" : size === "1536x1024" ? "16:9" : "1:1";
  return { format, size };
}
