export interface InspirationItem {
  id: string;
  imageUrl: string;
  label?: string;
  category?: string;
  /** When present, item represents a maroPreset (click/drag attaches preset metadata). */
  preset?: {
    id: string;
    code: string;
    targetTool: string;
  };
}

export const MARO_IMAGE_URL_MIME = "application/x-maro-image-url";
export const MARO_PRESET_MIME = "application/x-maro-preset";

const LOCAL = "/images/hub/marketing-stack.png";

export function presetAttachFromItem(item: InspirationItem) {
  if (!item.preset) return null;
  return {
    id: item.preset.id,
    code: item.preset.code,
    targetTool: item.preset.targetTool,
    thumbnailUrl: item.imageUrl,
  };
}

/** Fallback tiles when no API presets are available yet. */
export const IMAZH_INSPIRATION_FALLBACK: InspirationItem[] = [
  { id: "1", imageUrl: LOCAL, category: "Drinks" },
  { id: "2", imageUrl: LOCAL, category: "Product" },
  { id: "3", imageUrl: LOCAL, category: "Ads" },
  { id: "4", imageUrl: LOCAL, category: "Brand" },
  { id: "5", imageUrl: LOCAL, category: "Food" },
  { id: "6", imageUrl: LOCAL, category: "Fashion" },
  { id: "7", imageUrl: LOCAL, category: "Tech" },
  { id: "8", imageUrl: LOCAL, category: "Coffee" },
  { id: "9", imageUrl: LOCAL, category: "Retail" },
  { id: "10", imageUrl: LOCAL, category: "Social" },
];

/** @deprecated Use fetched maroImazh presets; kept as offline fallback. */
export const IMAZH_INSPIRATION = IMAZH_INSPIRATION_FALLBACK;

export { LOCAL as IMAZH_INSPIRATION_FALLBACK_IMAGE };
