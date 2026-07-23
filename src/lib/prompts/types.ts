// Shared, client-safe types for maro Prompts (curated prompt catalog).
// No server-only imports here.

// Fixed category list shown as chips in the search bar + admin dropdown.
export const PROMPT_CATEGORIES = [
  "Restaurant",
  "Dental",
  "Coffee",
  "Drinks",
  "Beauty",
  "Real Estate",
  "Automotive",
  "Fashion",
  "Barber",
  "Shoes",
  "Accessories",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

// Tools a curated prompt can target (single tool per prompt). Mirrors the
// functional generation tools; audio/video are excluded.
export const PROMPT_TARGET_TOOLS: { id: string; label: string }[] = [
  { id: "logo", label: "maro Logo" },
  { id: "reklama", label: "maro Imazh" },
  { id: "website", label: "maro Web" },
];

// Public metadata shipped to the browser. NEVER includes `full_prompt`.
export interface PromptItem {
  id: string;
  code: string;
  category: string;
  featured_url: string | null;
  keywords: string[];
  target_tool: string;
  reveal_count: number;
  use_count: number;
  created_at: string;
  /** Set per-request for the signed-in user. */
  liked?: boolean;
  /** Set per-request for the signed-in user (already paid to reveal). */
  owned?: boolean;
}

// Admin-only shape (includes the hidden prompt + active flag).
export interface AdminPromptItem extends PromptItem {
  full_prompt: string;
  active: boolean;
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

// Session key used to hand a chosen prompt off to a tool's composer.
export const PROMPT_ATTACH_KEY = "maro:promptAttach";

export interface PromptAttach {
  id: string;
  code: string;
  targetTool: string;
}
