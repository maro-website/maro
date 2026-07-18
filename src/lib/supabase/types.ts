// Shared types for the Supabase-backed domain (auth, credits, config).
// Client-safe: no server-only imports here.

export type WebsiteKind = "landing" | "business" | "platform";
export type SpeedKey = "slow" | "fast" | "2x";
export type EffortLevel = "low" | "medium" | "high" | "xhigh";
export type ModelKey = "claude-opus-4-8";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  credits: number;
  is_admin: boolean;
  created_at: string;
}

export interface SpeedConfig {
  effort: EffortLevel;
  mult: number;
}

export interface AdBanner {
  /** Public URL of the uploaded banner image. */
  imageUrl?: string;
  /** Tool routes/ids where the banner is shown (e.g. ["website","logo"]). */
  pages?: string[];
  /** Optional link opened when the banner is clicked. */
  link?: string;
}

export interface PricingConfig {
  types: Record<WebsiteKind, number>;
  speed: Record<SpeedKey, SpeedConfig>;
  editCost?: number;
  /** Credit cost per image tool (e.g. { logo: 5, reklama: 5 }). */
  tools?: Record<string, number>;
  /** Reserve: enable the product-image box in Maro Reklama (admin controlled). */
  reklamaProduct?: boolean;
  /** Admin-managed ad banner shown above the composer on selected tools. */
  ads?: AdBanner;
}

export interface AppSettings {
  master_prompt: string;
  pricing: PricingConfig;
  /** Per-tool master prompts for image tools (e.g. { logo, reklama }). */
  tool_prompts: Record<string, string>;
}

export interface GenerationLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  prompt: string | null;
  final_prompt: string | null;
  website_type: string | null;
  speed: string | null;
  model: string | null;
  tool_id: string | null;
  kind: string | null;
  output_urls: string[] | null;
  credits_spent: number;
  created_at: string;
}

export const DEFAULT_PRICING: PricingConfig = {
  types: { landing: 5, business: 10, platform: 20 },
  speed: {
    slow: { effort: "xhigh", mult: 1 },
    fast: { effort: "high", mult: 1.5 },
    "2x": { effort: "medium", mult: 2 },
  },
  tools: { logo: 5, logo_bw: 5, logo_brand: 15, reklama: 5 },
  reklamaProduct: false,
};

// Credit cost for an image tool (falls back to the tool's default).
export function imageToolCost(
  pricing: PricingConfig,
  toolId: string,
  fallback = 5
): number {
  return pricing.tools?.[toolId] ?? DEFAULT_PRICING.tools?.[toolId] ?? fallback;
}

export const WEBSITE_KINDS: { key: WebsiteKind; label: string; hint: string }[] = [
  { key: "landing", label: "Landing Page", hint: "Një faqe, fokus konvertimi" },
  { key: "business", label: "Business Page", hint: "Shumë faqe, biznes i plotë" },
  { key: "platform", label: "Platform", hint: "Aplikacion / produkt kompleks" },
];

export const SPEED_OPTIONS: { key: SpeedKey; label: string; hint: string }[] = [
  { key: "slow", label: "Slow", hint: "Cilësia maksimale" },
  { key: "fast", label: "Fast", hint: "Balancë" },
  { key: "2x", label: "2x Faster", hint: "Prioritet, i shpejtë" },
];

export const MODEL_OPTIONS: { key: ModelKey; label: string }[] = [
  { key: "claude-opus-4-8", label: "Claude Opus 4.8" },
];

// Compute credit cost for a given website type + speed using a pricing config.
export function creditCost(
  pricing: PricingConfig,
  kind: WebsiteKind,
  speed: SpeedKey
): number {
  const base = pricing.types?.[kind] ?? DEFAULT_PRICING.types[kind];
  const mult = pricing.speed?.[speed]?.mult ?? DEFAULT_PRICING.speed[speed].mult;
  return Math.ceil(base * mult);
}
