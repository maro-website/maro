// Central registry of Maro AI Hub tools. Single source of truth for the hub
// landing, sidebar, tool workspaces and the admin panel. Adding a new tool is
// as simple as appending an entry here (+ its master prompt in Admin).

import type { LucideIcon } from "lucide-react";
import { Globe, Sparkles, Megaphone } from "lucide-react";
import type { SpeedKey, WebsiteKind } from "@/lib/supabase/types";

export type ToolId = "website" | "logo" | "reklama";
export type ToolKind = "website" | "image";

// gpt-image-2 supports many sizes; we expose the three canonical aspect ratios.
export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "low" | "medium" | "high";

export interface ImageSizeOption {
  key: string;
  label: string;
  value: ImageSize;
}

export const IMAGE_SIZES: ImageSizeOption[] = [
  { key: "square", label: "Katror 1:1", value: "1024x1024" },
  { key: "portrait", label: "Portret 2:3", value: "1024x1536" },
  { key: "landscape", label: "Peizazh 3:2", value: "1536x1024" },
];

export const IMAGE_QUALITIES: { key: ImageQuality; label: string; hint: string }[] = [
  { key: "low", label: "Draft", hint: "I shpejtë, kosto e ulët" },
  { key: "medium", label: "Standard", hint: "Balancë" },
  { key: "high", label: "HD", hint: "Cilësia maksimale" },
];

// ---- Maro Logo: sub-options ------------------------------------------------
// Logo "type" only shapes the prompt (appended). The "package" chooses which
// admin master prompt + price to use (a real product variant).
export const LOGO_TYPES: { id: string; label: string; hint: string }[] = [
  { id: "symbol", label: "Symbol", hint: "Vetëm ikonë/simbol, pa tekst" },
  { id: "typography", label: "Vetëm tipografi", hint: "Wordmark, vetëm tekst" },
  { id: "both", label: "Symbol + tipografi", hint: "Simbol + emri i markës" },
];

export interface ToolVariant {
  id: string;
  label: string;
  hint: string;
  defaultCost: number;
}

export const LOGO_PACKAGES: ToolVariant[] = [
  { id: "logo_bw", label: "Logo bardh e zi", hint: "Një logo e pastër bardh e zi", defaultCost: 5 },
  { id: "logo_brand", label: "Brand komplet", hint: "Logo + paletë + variante brandi", defaultCost: 15 },
];

// ---- Maro Reklama: aspect-ratio formats ------------------------------------
// gpt-image supports 3 canonical sizes; each ratio maps to the nearest one.
export const REKLAMA_FORMATS: { id: string; label: string; size: ImageSize }[] = [
  { id: "16:9", label: "16:9", size: "1536x1024" },
  { id: "9:16", label: "9:16", size: "1024x1536" },
  { id: "4:3", label: "4:3", size: "1536x1024" },
  { id: "2:3", label: "2:3", size: "1024x1536" },
  { id: "1:1", label: "1:1", size: "1024x1024" },
];

export interface ToolDef {
  id: ToolId;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** Soft accent color (Google-like) used for cards/badges. */
  accent: string;
  accentSoft: string;
  kind: ToolKind;
  route: string;
  /** Where the master prompt lives: website uses app_settings.master_prompt,
   *  image tools use app_settings.tool_prompts[id]. */
  promptKey: "master_prompt" | ToolId;
  /** Default credit cost for image tools (website cost is computed per type/speed). */
  defaultCost: number;
  /** Built-in master prompt used until an admin sets a custom one (from Custom GPT). */
  defaultPrompt?: string;
  /** Default selections. */
  defaultSize?: ImageSize;
  defaultQuality?: ImageQuality;
  defaultType?: WebsiteKind;
  defaultSpeed?: SpeedKey;
  /** Reklama: reserve a product-image upload box (admin-controlled). */
  hasProductUpload?: boolean;
  /** Product variants (e.g. logo packages) each with own prompt + price. */
  variants?: ToolVariant[];
  comingSoon?: boolean;
}

export const TOOLS: ToolDef[] = [
  {
    id: "website",
    name: "Maro Website",
    tagline: "Website i plotë nga një fjali",
    description:
      "Përshkruaj biznesin dhe Maro ndërton një website profesional shumë-faqesh me Claude Opus 4.8.",
    icon: Globe,
    accent: "#6b46e5",
    accentSoft: "#f3f0fe",
    kind: "website",
    route: "/tools/website",
    promptKey: "master_prompt",
    defaultCost: 10,
    defaultType: "landing",
    defaultSpeed: "fast",
  },
  {
    id: "logo",
    name: "Maro Logo",
    tagline: "Logo & ikona me AI",
    description:
      "Gjenero logo dhe simbole marke unike nga një përshkrim, sipas stilit të Logo GPT tënde.",
    icon: Sparkles,
    accent: "#6b46e5",
    accentSoft: "#f3f0fe",
    kind: "image",
    route: "/tools/logo",
    promptKey: "logo",
    defaultCost: 5,
    defaultSize: "1024x1024",
    defaultQuality: "high",
    variants: LOGO_PACKAGES,
    defaultPrompt:
      "You are Maro Logo, an expert brand & logo designer. From the description, produce a single, clean, memorable logo concept. Prefer simple vector-style marks, balanced negative space, a strong silhouette and a limited palette. Center the mark on a plain white background with generous padding. Avoid clutter, gradients-heavy realism, photorealism and text unless explicitly requested.",
  },
  {
    id: "reklama",
    name: "Maro Reklama",
    tagline: "Vizuale reklamash që konvertojnë",
    description:
      "Krijo banner-a dhe kreativë reklamash gati për rrjetet sociale, sipas stilit të Reklama GPT tënde.",
    icon: Megaphone,
    accent: "#6b46e5",
    accentSoft: "#f3f0fe",
    kind: "image",
    route: "/tools/reklama",
    promptKey: "reklama",
    defaultCost: 5,
    defaultSize: "1024x1536",
    defaultQuality: "high",
    hasProductUpload: true,
    defaultPrompt:
      "You are Maro Reklama, an expert advertising art director. Produce a scroll-stopping social ad creative with a clear focal point, strong contrast and deliberate empty space for a short headline. Modern, premium and on-brand. Avoid clutter, watermarks and fake logos or unreadable text.",
  },
];

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export const IMAGE_TOOLS = TOOLS.filter((t) => t.kind === "image");
