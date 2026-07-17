// Central registry of Maro AI Hub tools. Single source of truth for the hub
// landing, sidebar, tool workspaces and the admin panel. Adding a new tool is
// as simple as appending an entry here (+ its master prompt in Admin).

import type { LucideIcon } from "lucide-react";
import { Globe, Sparkles, Megaphone } from "lucide-react";

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
    accent: "#5a28e5",
    accentSoft: "#efeafe",
    kind: "website",
    route: "/tools/website",
    promptKey: "master_prompt",
    defaultCost: 10,
  },
  {
    id: "logo",
    name: "Maro Logo",
    tagline: "Logo & ikona me AI",
    description:
      "Gjenero logo dhe simbole marke unike nga një përshkrim, sipas stilit të Logo GPT tënde.",
    icon: Sparkles,
    accent: "#4285F4",
    accentSoft: "#e8f0fe",
    kind: "image",
    route: "/tools/logo",
    promptKey: "logo",
    defaultCost: 5,
  },
  {
    id: "reklama",
    name: "Maro Reklama",
    tagline: "Vizuale reklamash që konvertojnë",
    description:
      "Krijo banner-a dhe kreativë reklamash gati për rrjetet sociale, sipas stilit të Reklama GPT tënde.",
    icon: Megaphone,
    accent: "#34A853",
    accentSoft: "#e6f4ea",
    kind: "image",
    route: "/tools/reklama",
    promptKey: "reklama",
    defaultCost: 5,
  },
];

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export const IMAGE_TOOLS = TOOLS.filter((t) => t.kind === "image");
