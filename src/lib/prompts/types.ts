// Shared, client-safe types for the canonical maroPresets catalog.
import type { PresetConfig, PresetTool } from "@/lib/presets/model";

export const PROMPT_CATEGORIES = [
  "Restaurant", "Dental", "Coffee", "Drinks", "Beauty", "Real Estate",
  "Automotive", "Fashion", "Barber", "Shoes", "Accessories",
] as const;

export const PRESET_CATEGORIES = [
  { id: "all", label: "Të gjitha" },
  { id: "product", label: "Product shot" },
  { id: "ads", label: "Ads" },
  { id: "posters", label: "Posters" },
  { id: "brand", label: "Brand" },
  ...PROMPT_CATEGORIES.map((c) => ({ id: c.toLowerCase(), label: c })),
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export const PROMPT_TARGET_TOOLS: { id: "reklama" | "logo" | "website"; label: string; tool: PresetTool }[] = [
  { id: "reklama", label: "maroImazh", tool: "imazh" },
  { id: "logo", label: "maroLogo", tool: "logo" },
  { id: "website", label: "maroWeb", tool: "web" },
];

/** Lightweight browse shape. Hidden master prompts and tool config are omitted. */
export interface PromptItem {
  id: string;
  code: string;
  tool: PresetTool;
  target_tool: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  featured_url: string | null;
  keywords: string[];
  featured: boolean;
  sort_order: number;
  access_level: "free" | "premium";
  use_count: number;
  created_at: string;
  liked?: boolean;
}

/** Fetched only when a preset is opened/used. Never includes full_prompt. */
export interface PromptDetail extends PromptItem {
  config: PresetConfig;
}

export interface AdminPromptItem extends PromptDetail {
  full_prompt: string;
  active: boolean;
  status: "draft" | "published" | "disabled" | "archived";
  updated_at: string;
  reveal_count: number;
}

export interface PromptAnalytics {
  total: number;
  activeCount: number;
  totalReveals: number;
  totalUses: number;
  creditsFromReveals: number;
  byCategory: { category: string; count: number }[];
  mostUsed: { id: string; code: string; category: string; use_count: number }[];
  mostRevealed: { id: string; code: string; category: string; reveal_count: number }[];
}

export const DEFAULT_PROMPT_REVEAL_COST = 10;
export const PROMPT_ATTACH_KEY = "maro:promptAttach";

export interface PromptAttach {
  id: string;
  code: string;
  title?: string;
  tool: PresetTool;
  targetTool: string;
  thumbnailUrl?: string | null;
  config: PresetConfig;
}

export interface PresetCategoryItem {
  id: string;
  tool: PresetTool;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  active: boolean;
}
