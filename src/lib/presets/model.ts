import type {
  ConceptIntent,
  LogoTypeValue,
  PresentationMode,
  VisualStyle,
} from "@/lib/marologo/types";

export const PRESET_TOOLS = ["imazh", "logo", "web"] as const;
export type PresetTool = (typeof PRESET_TOOLS)[number];

export const PRESET_TOOL_META: Record<PresetTool, {
  label: string;
  shortLabel: string;
  targetTool: "reklama" | "logo" | "website";
  route: "/imazh" | "/marologo" | "/web";
}> = {
  imazh: { label: "maroImazh", shortLabel: "Imazh", targetTool: "reklama", route: "/imazh" },
  logo: { label: "maroLogo", shortLabel: "Logo", targetTool: "logo", route: "/marologo" },
  web: { label: "maroWeb", shortLabel: "Web", targetTool: "website", route: "/web" },
};

export type ImazhPresetConfig = {
  version: 1;
  initialPrompt?: string;
  format?: "ig-post" | "ig-story" | "fb-post" | "yt-thumb";
  text?: "on" | "off";
  font?: "modern" | "elegant" | "bold" | "handwritten" | "minimal";
};

export type LogoPresetConfig = {
  version: 1;
  creativeDirection?: string;
  traits?: string[];
  logoType?: LogoTypeValue;
  conceptIntent?: ConceptIntent;
  visualStyle?: VisualStyle;
  presentationMode?: PresentationMode;
};

export type WebPresetConfig = {
  version: 1;
  initialPrompt?: string;
  websiteType?: "landing" | "standard" | "pro" | "expert";
  siteStyle?: string;
  layout?: string;
  useCase?: string;
};

export type PresetConfig = ImazhPresetConfig | LogoPresetConfig | WebPresetConfig;

const LOGO_TYPES = new Set(["wordmark", "symbol", "symbol_wordmark", "maro_decides"]);
const LOGO_INTENTS = new Set(["meaning", "typography", "symbol", "maro_decides"]);
const LOGO_STYLES = new Set([
  "maro_decides", "minimal_intelligent", "bold_distinctive", "elegant_refined",
  "playful_friendly", "organic_human", "technical_precise", "editorial_expressive",
]);
const PRESENTATIONS = new Set(["bw", "color", "mockup", "bento"]);

function stringValue(value: unknown, max = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : undefined;
}

function enumValue<T extends string>(value: unknown, allowed: Set<string>): T | undefined {
  return typeof value === "string" && allowed.has(value) ? value as T : undefined;
}

/** Only stable product concepts enter preset config; arbitrary UI state is discarded. */
export function sanitizePresetConfig(tool: PresetTool, input: unknown): PresetConfig {
  const raw = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};

  if (tool === "imazh") {
    return {
      version: 1,
      initialPrompt: stringValue(raw.initialPrompt, 1000),
      format: enumValue(raw.format, new Set(["ig-post", "ig-story", "fb-post", "yt-thumb"])),
      text: enumValue(raw.text, new Set(["on", "off"])),
      font: enumValue(raw.font, new Set(["modern", "elegant", "bold", "handwritten", "minimal"])),
    };
  }

  if (tool === "logo") {
    const traits = Array.isArray(raw.traits)
      ? raw.traits.map((item) => stringValue(item, 40)).filter((item): item is string => Boolean(item)).slice(0, 3)
      : undefined;
    return {
      version: 1,
      creativeDirection: stringValue(raw.creativeDirection, 500),
      traits: traits?.length ? traits : undefined,
      logoType: enumValue(raw.logoType, LOGO_TYPES),
      conceptIntent: enumValue(raw.conceptIntent, LOGO_INTENTS),
      visualStyle: enumValue(raw.visualStyle, LOGO_STYLES),
      presentationMode: enumValue(raw.presentationMode, PRESENTATIONS),
    };
  }

  return {
    version: 1,
    initialPrompt: stringValue(raw.initialPrompt, 1000),
    websiteType: enumValue(raw.websiteType, new Set(["landing", "standard", "pro", "expert"])),
    siteStyle: stringValue(raw.siteStyle, 120),
    layout: stringValue(raw.layout, 120),
    useCase: stringValue(raw.useCase, 120),
  };
}

export function isPresetTool(value: unknown): value is PresetTool {
  return typeof value === "string" && PRESET_TOOLS.includes(value as PresetTool);
}

export function presetToolFromTarget(target: string): PresetTool {
  if (target === "logo") return "logo";
  if (target === "website" || target === "web") return "web";
  return "imazh";
}

export function presetSelections(tool: PresetTool, config: PresetConfig): Record<string, string> {
  if (tool === "imazh") {
    const value = config as ImazhPresetConfig;
    const selections: Record<string, string> = {};
    if (value.format) selections.format = value.format;
    if (value.text) selections.text = value.text;
    if (value.font) selections.font = value.font;
    return selections;
  }
  if (tool === "web") {
    const value = config as WebPresetConfig;
    return value.websiteType ? { type: value.websiteType } : {};
  }
  return {};
}

export function presetInitialPrompt(tool: PresetTool, config: PresetConfig): string {
  if (tool === "imazh") return (config as ImazhPresetConfig).initialPrompt ?? "";
  if (tool === "web") {
    const value = config as WebPresetConfig;
    if (value.initialPrompt) return value.initialPrompt;
    const direction = [value.useCase, value.siteStyle, value.layout].filter(Boolean).join(", ");
    return direction ? `Krijo një website për ${direction}.` : "";
  }
  return "";
}

export function wrapPresetRecommendation(prompt: string): string {
  const clean = prompt.trim();
  if (!clean) return "";
  return [
    "PRESET CREATIVE RECOMMENDATION (LOWER PRIORITY)",
    clean,
    "If the explicit user brief or structured tool choices conflict with this recommendation, follow the user and tool choices.",
  ].join("\n");
}
