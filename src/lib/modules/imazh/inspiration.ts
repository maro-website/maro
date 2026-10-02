import type { PromptAttach } from "@/lib/prompts/types";
import { isPresetTool, presetToolFromTarget, sanitizePresetConfig } from "@/lib/presets/model";

export interface InspirationItem {
  id: string;
  imageUrl: string;
  label?: string;
  category?: string;
  /** When present, item represents a maroPreset (click/drag attaches preset metadata). */
  preset?: {
    id: string;
    code: string;
    tool: "imazh";
    targetTool: string;
  };
}

export const MARO_IMAGE_URL_MIME = "application/x-maro-image-url";
export const MARO_PRESET_MIME = "application/x-maro-preset";

/** A preset's preview must never turn into an ordinary image attachment. */
export function readInspirationDrop(data: Pick<DataTransfer, "getData">, targetTool: string):
  { kind: "preset"; attach: PromptAttach | null } | { kind: "image"; url: string } | null {
  const raw = data.getData(MARO_PRESET_MIME);
  if (raw) {
    let attach: PromptAttach | null = null;
    try {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === "object" && "id" in value && typeof value.id === "string" &&
          "code" in value && typeof value.code === "string" && "targetTool" in value && value.targetTool === targetTool &&
          "tool" in value && isPresetTool(value.tool) && value.tool === presetToolFromTarget(targetTool)) {
        attach = { id: value.id, code: value.code, targetTool, tool: value.tool,
          config: sanitizePresetConfig(value.tool, "config" in value ? value.config : undefined),
          thumbnailUrl: "thumbnailUrl" in value && typeof value.thumbnailUrl === "string" ? value.thumbnailUrl : undefined };
      }
    } catch { /* Ignore invalid presets without attaching their preview. */ }
    return { kind: "preset", attach };
  }
  const url = data.getData(MARO_IMAGE_URL_MIME);
  return url ? { kind: "image", url } : null;
}

export function presetAttachFromItem(item: InspirationItem) {
  if (!item.preset) return null;
  return {
    id: item.preset.id,
    code: item.preset.code,
    tool: item.preset.tool,
    targetTool: item.preset.targetTool,
    thumbnailUrl: item.imageUrl,
    config: { version: 1 as const },
  };
}

/** Fallback tiles when no API presets are available yet. */
export const IMAZH_INSPIRATION_FALLBACK: InspirationItem[] = [
  { id: "1", imageUrl: "", category: "Drinks" },
  { id: "2", imageUrl: "", category: "Product" },
  { id: "3", imageUrl: "", category: "Ads" },
  { id: "4", imageUrl: "", category: "Brand" },
  { id: "5", imageUrl: "", category: "Food" },
  { id: "6", imageUrl: "", category: "Fashion" },
  { id: "7", imageUrl: "", category: "Tech" },
  { id: "8", imageUrl: "", category: "Coffee" },
  { id: "9", imageUrl: "", category: "Retail" },
  { id: "10", imageUrl: "", category: "Social" },
];

/** @deprecated Use fetched maroImazh presets; kept as offline fallback. */
export const IMAZH_INSPIRATION = IMAZH_INSPIRATION_FALLBACK;
