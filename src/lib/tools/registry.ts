// Central registry of Maro AI Hub tools. Single source of truth for the hub
// landing, prompt box, sidebar, tool workspaces and the admin panel.
//
// Each tool declares its `settings` (the selectors shown in the prompt box).
// Every setting has `options`; every option can carry a default credit `cost`
// and an `available` flag (false => shown as "së shpejti", not selectable).
// The admin panel iterates this same structure to configure per-option cost +
// per-option master prompt. The final prompt sent to the model is:
//   base tool prompt + each selected option's prompt fragment + the user text.

import type { LucideIcon } from "lucide-react";
import {
  Globe,
  Sparkles,
  Megaphone,
  Clapperboard,
  AudioLines,
  Cpu,
  LayoutTemplate,
  Palette,
  Gauge,
  Ratio,
  Clock,
  Languages,
  Users,
  Lightbulb,
} from "lucide-react";

export type ToolId = "website" | "logo" | "reklama" | "filma" | "zo" | "prompte";
export type ToolKind = "website" | "image" | "video" | "audio" | "prompts";

// gpt-image-2 supports three canonical sizes; social formats map to the nearest.
export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "low" | "medium" | "high";

export const IMAGE_QUALITIES: { key: ImageQuality; label: string; hint: string }[] = [
  { key: "low", label: "Draft", hint: "I shpejtë, kosto e ulët" },
  { key: "medium", label: "Standard", hint: "Balancë" },
  { key: "high", label: "HD", hint: "Cilësia maksimale" },
];

export interface ToolOption {
  id: string;
  label: string;
  /** Short helper text shown in the option list. */
  hint?: string;
  /** Default credit cost contribution (admin-overridable). */
  cost?: number;
  /** false => shown as "së shpejti" and not selectable. */
  available?: boolean;
  /** Confirmation prompt shown before selecting (e.g. Expert). */
  confirm?: string;
  /** For image format options: the gpt-image size to request. */
  size?: ImageSize;
}

export interface ToolSetting {
  id: string;
  label: string;
  icon: LucideIcon;
  options: ToolOption[];
  /** Default option id. */
  default: string;
}

export interface ToolDef {
  id: ToolId;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  kind: ToolKind;
  route: string;
  /** false => the whole tool is a "coming soon" teaser (Filma, Zo). */
  functional: boolean;
  comingSoon?: boolean;
  /** Base credit cost added on top of the selected options' costs. */
  baseCost: number;
  settings: ToolSetting[];
  /** Built-in base prompt used until an admin sets one in Master Prompts. */
  defaultPrompt?: string;
}

// ---------------------------------------------------------------------------
// Shared settings
// ---------------------------------------------------------------------------
const MARO_SPEED: ToolSetting = {
  id: "speed",
  label: "maroSpeed",
  icon: Gauge,
  default: "normal",
  options: [
    { id: "kadale", label: "Kadale", hint: "Cilësia maksimale", cost: 0, available: true },
    { id: "normal", label: "Normal", hint: "Balancë", cost: 0, available: true },
    { id: "fast", label: "2x Ma shpejt", hint: "Prioritet, i shpejtë", cost: 0, available: true },
  ],
};

// Model lists (only the first is functional per Maro's current integrations).
const WEB_MODELS: ToolOption[] = [
  { id: "opus-4-8", label: "Claude Opus 4.8", available: true },
  { id: "fable-5", label: "Claude Fable 5", available: false },
  { id: "gpt-5-6-sol", label: "GPT-5.6 Sol", available: false },
  { id: "gemini-3-1-pro", label: "Gemini 3.1 Pro", available: false },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", available: false },
  { id: "marokod-1", label: "maroKod 1.0", available: false },
];

const IMAGE_MODELS: ToolOption[] = [
  { id: "gpt-image-2", label: "GPT Image 2", available: true },
  { id: "nano-banana-2", label: "Nano Banana 2", available: false },
  { id: "nano-banana-2-lite", label: "Nano Banana 2 Lite", available: false },
  { id: "flux-2-max", label: "FLUX.2 Max", available: false },
  { id: "seedream-5-pro", label: "Seedream 5 Pro", available: false },
  { id: "maroart-1", label: "maroArt 1.0", available: false },
];

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
export const TOOLS: ToolDef[] = [
  {
    id: "website",
    name: "maro Web",
    tagline: "Website i plotë nga një fjali",
    description:
      "Përshkruaj biznesin dhe maro ndërton një website profesional me Claude Opus 4.8.",
    icon: Globe,
    kind: "website",
    route: "/tools/website",
    functional: true,
    baseCost: 0,
    defaultPrompt: "",
    settings: [
      { id: "model", label: "Modeli", icon: Cpu, default: "opus-4-8", options: WEB_MODELS },
      {
        id: "type",
        label: "Lloji",
        icon: LayoutTemplate,
        default: "landing",
        options: [
          { id: "landing", label: "Landing Page", hint: "Një faqe, fokus konvertimi", cost: 10, available: true },
          { id: "standard", label: "Standard", hint: "Deri në 4 faqe", cost: 20, available: true },
          { id: "pro", label: "Pro", hint: "10+ faqe", cost: 40, available: true },
          {
            id: "expert",
            label: "Expert",
            hint: "Kontroll i plotë mbi kodin",
            cost: 60,
            available: true,
            confirm: "Modaliteti Expert kushton më shumë kredite dhe zgjat më gjatë. Vazhdon?",
          },
        ],
      },
      MARO_SPEED,
    ],
  },
  {
    id: "logo",
    name: "maro Logo",
    tagline: "Logo & ikona me AI",
    description: "Gjenero logo dhe simbole marke unike nga një përshkrim.",
    icon: Sparkles,
    kind: "image",
    route: "/tools/logo",
    functional: true,
    baseCost: 0,
    defaultPrompt:
      "You are maro Logo, an expert brand & logo designer. From the description, produce a single, clean, memorable logo concept. Prefer simple vector-style marks, balanced negative space, a strong silhouette and a limited palette. Center the mark on a plain background with generous padding. Avoid clutter, photorealism and text unless explicitly requested.",
    settings: [
      { id: "model", label: "Modeli", icon: Cpu, default: "gpt-image-2", options: IMAGE_MODELS },
      {
        id: "type",
        label: "Lloji",
        icon: LayoutTemplate,
        default: "both",
        options: [
          { id: "typography", label: "Vetëm tipografi", hint: "Wordmark, vetëm tekst", cost: 0, available: true },
          { id: "symbol", label: "Vetëm symbol", hint: "Vetëm ikonë/simbol", cost: 0, available: true },
          { id: "both", label: "Symbol + tipografi", hint: "Simbol + emri i markës", cost: 0, available: true },
        ],
      },
      {
        id: "present",
        label: "Prezentimi",
        icon: Palette,
        default: "color",
        options: [
          { id: "bw", label: "Logo bardh e zi", hint: "Një logo e pastër bardh e zi", cost: 5, available: true },
          { id: "color", label: "Logo me ngjyra", hint: "Paletë ngjyrash", cost: 5, available: true },
          { id: "bento", label: "Bento Grid", hint: "Prezantim bento me variante", cost: 8, available: true },
          { id: "mockup", label: "Logo Mockup", hint: "Logo mbi mockup realist", cost: 8, available: true },
        ],
      },
      MARO_SPEED,
    ],
  },
  {
    id: "reklama",
    name: "maro Imazh",
    tagline: "Imazhe & vizuale që konvertojnë",
    description: "Krijo imazhe dhe kreativë vizualë gati për rrjetet sociale.",
    icon: Megaphone,
    kind: "image",
    route: "/tools/reklama",
    functional: true,
    baseCost: 0,
    defaultPrompt:
      "You are maro Imazh, an expert visual art director. Produce a scroll-stopping, high-quality image with a clear focal point, strong contrast and deliberate empty space for a short headline. Modern, premium and on-brand. Avoid clutter, watermarks and fake logos or unreadable text.",
    settings: [
      { id: "model", label: "Modeli", icon: Cpu, default: "gpt-image-2", options: IMAGE_MODELS },
      {
        id: "format",
        label: "Formati",
        icon: Ratio,
        default: "ig-post",
        options: [
          { id: "ig-post", label: "Instagram Post", hint: "1080×1350px", cost: 5, available: true, size: "1024x1536" },
          { id: "ig-story", label: "Instagram Story", hint: "1080×1920px", cost: 5, available: true, size: "1024x1536" },
          { id: "fb-post", label: "Facebook Post", hint: "1:1", cost: 5, available: true, size: "1024x1024" },
          { id: "yt-thumb", label: "YouTube Thumbnail", hint: "1920×1080px", cost: 5, available: true, size: "1536x1024" },
        ],
      },
      MARO_SPEED,
    ],
  },
  {
    id: "prompte",
    name: "maro Prompts",
    tagline: "Prompte gati për t'u përdorur",
    description:
      "Prompte profesionale çdo ditë: 1 falas + 2 premium. Ngarko produktin tënd dhe gjenero. Së shpejti.",
    icon: Lightbulb,
    kind: "prompts",
    route: "/tools/prompte",
    functional: false,
    comingSoon: true,
    baseCost: 0,
    settings: [],
  },
  {
    id: "filma",
    name: "maro Filma",
    tagline: "AI Video Generator",
    description: "Gjenero video të shkurtra me AI nga një përshkrim. Së shpejti.",
    icon: Clapperboard,
    kind: "video",
    route: "/tools/filma",
    functional: false,
    comingSoon: true,
    baseCost: 0,
    settings: [
      {
        id: "model",
        label: "Modeli",
        icon: Cpu,
        default: "seedance-2",
        options: [
          { id: "seedance-2", label: "Seedance 2.0", available: false },
          { id: "veo-3-1", label: "Veo 3.1", available: false },
          { id: "omni-flash", label: "Google Omni Flash", available: false },
          { id: "kling-3", label: "Kling 3.0", available: false },
          { id: "runway-4-5", label: "Runway Gen-4.5", available: false },
          { id: "luma-ray-2", label: "Luma Ray 2", available: false },
        ],
      },
      {
        id: "length",
        label: "Gjatësia",
        icon: Clock,
        default: "5s",
        options: [
          { id: "5s", label: "5s", available: false },
          { id: "8s", label: "8s", available: false },
          { id: "10s", label: "10s", available: false },
        ],
      },
      {
        id: "format",
        label: "Formati",
        icon: Ratio,
        default: "reel",
        options: [
          { id: "reel", label: "Reel / TikTok 9:16", available: false },
          { id: "yt", label: "YouTube / TV 16:9", available: false },
        ],
      },
    ],
  },
  {
    id: "zo",
    name: "maro Zo",
    tagline: "Zëra me AI",
    description: "Kthe tekstin në zë natyral me AI. Së shpejti.",
    icon: AudioLines,
    kind: "audio",
    route: "/tools/zo",
    functional: false,
    comingSoon: true,
    baseCost: 0,
    settings: [
      {
        id: "model",
        label: "Modeli",
        icon: Cpu,
        default: "eleven-v3",
        options: [
          { id: "eleven-v3", label: "Eleven v3", available: false },
          { id: "eleven-multi-v2", label: "Eleven Multilingual v2", available: false },
          { id: "gpt4o-mini-tts", label: "OpenAI GPT-4o mini TTS", available: false },
        ],
      },
      {
        id: "lang",
        label: "Gjuha",
        icon: Languages,
        default: "sq",
        options: [
          { id: "sq", label: "Shqip", available: false },
          { id: "en", label: "Anglisht", available: false },
          { id: "de", label: "Gjermanisht", available: false },
        ],
      },
      {
        id: "voice",
        label: "Personi",
        icon: Users,
        default: "female",
        options: [
          { id: "female", label: "Femëror", available: false },
          { id: "male", label: "Mashkullor", available: false },
        ],
      },
    ],
  },
];

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

// Generation tools shown in the Hub selector + main sidebar list. maro Prompts
// is intentionally excluded — it's not a generator, it lives below the sidebar
// separator as a "coming soon" entry.
export const MAIN_TOOLS = TOOLS.filter((t) => t.id !== "prompte");

export const IMAGE_TOOLS = TOOLS.filter((t) => t.kind === "image");

// ---------------------------------------------------------------------------
// Selections + cost helpers
// ---------------------------------------------------------------------------
export type ToolSelections = Record<string, string>;

export function defaultSelections(tool: ToolDef): ToolSelections {
  const sel: ToolSelections = {};
  for (const s of tool.settings) sel[s.id] = s.default;
  return sel;
}

export function findOption(setting: ToolSetting, optionId: string): ToolOption | undefined {
  return setting.options.find((o) => o.id === optionId);
}

// Cost key used in pricing.options overrides + master prompts.
export function optionKey(toolId: string, settingId: string, optionId: string): string {
  return `${toolId}.${settingId}.${optionId}`;
}

// Total credit cost for a set of selections. `overrides` is pricing.options
// (admin-set per-option costs); falls back to each option's default cost.
export function toolSelectionCost(
  tool: ToolDef,
  selections: ToolSelections,
  overrides?: Record<string, number>
): number {
  let sum = tool.baseCost ?? 0;
  for (const s of tool.settings) {
    const optId = selections[s.id] ?? s.default;
    const opt = findOption(s, optId);
    if (!opt) continue;
    const key = optionKey(tool.id, s.id, optId);
    const c = overrides?.[key];
    sum += typeof c === "number" ? c : opt.cost ?? 0;
  }
  return Math.max(0, sum);
}

// Compose the final model prompt: base tool prompt + each selected option's
// prompt fragment (from tool_prompts, keyed by optionKey) + the user text.
export function composeToolPrompt(
  tool: ToolDef,
  selections: ToolSelections,
  toolPrompts: Record<string, string>,
  userText: string
): string {
  const parts: string[] = [];
  const base = toolPrompts[`${tool.id}.base`] ?? tool.defaultPrompt ?? "";
  if (base.trim()) parts.push(base.trim());
  for (const s of tool.settings) {
    const optId = selections[s.id] ?? s.default;
    const frag = toolPrompts[optionKey(tool.id, s.id, optId)];
    if (frag && frag.trim()) parts.push(frag.trim());
  }
  if (userText.trim()) parts.push(userText.trim());
  return parts.join("\n\n");
}
