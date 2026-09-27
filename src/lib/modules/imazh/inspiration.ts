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
