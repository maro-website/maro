import {
  DIRECTION_SLIDER_LABELS,
  LOGO_TYPE_LABELS,
  TYPOGRAPHY_OPTIONS,
  TYPOGRAPHY_SLIDER_LABELS,
  ADVANCED_SLIDER_LABELS,
} from "./constants";
import {
  describeConstruction,
  describeNegativeSpace,
  describeSpectrum,
} from "./spectrum";
import type { MaroLogoWizardState, LogoTypeValue } from "./types";
import { resolveIndustry } from "./validation";

const TYPOGRAPHY_DESCRIPTIONS: Record<string, string> = {
  clean_sans: "clean contemporary sans-serif typography",
  geometric_sans: "geometric sans-serif typography with structured forms",
  humanist_sans: "humanist sans-serif typography with natural, approachable proportions",
  serif: "classic serif typography",
  elegant_serif: "refined elegant serif typography with premium editorial character",
  display: "distinctive display typography with strong visual personality",
  handwritten: "custom handwritten or script-inspired lettering",
  experimental: "experimental custom typography with distinctive letterform exploration",
  maro_decides: "select the typography style that best fits the full brand brief",
};

const CREATIVE_FREEDOM_TEXT: Record<string, string> = {
  precise:
    "Follow the supplied brief closely. Prioritize accuracy and constraint adherence over creative deviation.",
  balanced:
    "Respect the supplied brief while allowing thoughtful creative interpretation where it improves originality, clarity and logo quality.",
  wild:
    "Use the brief as strategic direction, but allow stronger creative exploration and unexpected concepts as long as the result remains professionally usable and relevant to the brand.",
};

function logoTypePrompt(type: LogoTypeValue): string {
  switch (type) {
    case "wordmark":
      return "Logo type: Wordmark — focus on custom brand-name lettering, typography, spacing and letterforms.";
    case "symbol":
      return "Logo type: Symbol — the primary result should be the symbol itself; brand name is context only.";
    case "symbol_wordmark":
      return "Logo type: Symbol + Wordmark — design both symbol and wordmark as one coherent identity.";
    case "maro_decides":
      return "Logo structure: Choose the logo structure that best fits the brand, audience, personality and intended usage.";
    default:
      return "";
  }
}

function showSymbolSection(type: LogoTypeValue): boolean {
  return type === "symbol" || type === "symbol_wordmark";
}

export function buildMaroLogoBrief(state: MaroLogoWizardState, hasReferences: boolean): string {
  const lines: string[] = ["LOGO DESIGN BRIEF", ""];

  // BRAND
  lines.push("BRAND");
  lines.push(`Name: ${state.brand.name.trim()}`);
  if (state.brand.slogan.trim()) lines.push(`Slogan: ${state.brand.slogan.trim()}`);
  lines.push(`Business: ${state.brand.description.trim()}`);
  lines.push(`Industry: ${resolveIndustry(state)}`);
  lines.push(`Primary usage: ${state.brand.usage.join(", ")}`);
  lines.push("");

  // BRAND DIRECTION
  lines.push("BRAND DIRECTION");
  if (state.direction.traits.length) {
    lines.push(`Personality: ${state.direction.traits.join(", ")}`);
  }
  lines.push("Overall character:");
  for (const s of DIRECTION_SLIDER_LABELS) {
    const val = state.direction.sliders[s.key];
    lines.push(`- ${describeSpectrum(val, s.left, s.right)}`);
  }
  lines.push("");

  if (state.direction.audience.trim()) {
    lines.push("TARGET AUDIENCE");
    lines.push(state.direction.audience.trim());
    lines.push("");
  }

  // LOGO STRUCTURE
  lines.push("LOGO STRUCTURE");
  lines.push(logoTypePrompt(state.logo.type));

  if (showSymbolSection(state.logo.type)) {
    if (state.logo.symbolMeaning.trim()) {
      lines.push(`Symbol should represent: ${state.logo.symbolMeaning.trim()}`);
    }
    if (state.logo.symbolDirection && state.logo.symbolDirection !== "No preference") {
      lines.push(`Symbol direction: ${state.logo.symbolDirection}`);
    } else if (state.logo.symbolDirection === "No preference") {
      lines.push("Symbol direction: No preference");
    }
  }
  lines.push("");

  if (state.logo.mustInclude.trim()) {
    lines.push("MUST INCLUDE");
    lines.push(state.logo.mustInclude.trim());
    lines.push("");
  }

  if (state.logo.avoid.trim()) {
    lines.push("AVOID");
    lines.push(`Do not use: ${state.logo.avoid.trim()}`);
    lines.push("");
  }

  // TYPOGRAPHY
  lines.push("TYPOGRAPHY");
  const typoOpt = TYPOGRAPHY_OPTIONS.find((t) => t.value === state.look.typography);
  const typoLabel = typoOpt?.label ?? state.look.typography;
  const typoDesc =
    TYPOGRAPHY_DESCRIPTIONS[state.look.typography] ?? `${typoLabel} typography direction`;
  lines.push(`Category: ${typoLabel}`);
  lines.push(`Direction: ${typoDesc}`);

  if (state.look.typography !== "maro_decides") {
    const tc = state.look.typographyControls;
    for (const s of TYPOGRAPHY_SLIDER_LABELS) {
      lines.push(`- ${s.left}/${s.right}: ${describeSpectrum(tc[s.key], s.left, s.right)}`);
    }
  }
  lines.push("");

  // COLOR
  lines.push("COLOR");
  if (state.look.colors.mode === "maro_decides") {
    lines.push(
      "Choose an appropriate professional logo palette based on the industry, audience and brand personality."
    );
  } else if (state.look.colors.values.length) {
    lines.push("Use these colors as the primary logo color direction:");
    for (const c of state.look.colors.values) lines.push(c);
  }
  lines.push("");

  // DESIGN CONTROLS
  lines.push("DESIGN CONTROLS");
  const adv = state.look.advanced;
  for (const s of ADVANCED_SLIDER_LABELS) {
    lines.push(`${s.label} ${describeSpectrum(adv[s.key], s.left, s.right)}`);
  }
  lines.push(`Negative space: ${describeNegativeSpace(adv.negativeSpace)}`);
  lines.push(`Construction: ${describeConstruction(adv.construction)}`);
  lines.push("");

  // CREATIVE FREEDOM
  lines.push("CREATIVE FREEDOM");
  const freedom = state.finish.creativeFreedom;
  lines.push(`${freedom.charAt(0).toUpperCase() + freedom.slice(1)}:`);
  lines.push(CREATIVE_FREEDOM_TEXT[freedom] ?? CREATIVE_FREEDOM_TEXT.balanced);
  lines.push("");

  if (hasReferences) {
    lines.push(
      "Use the supplied reference images for creative direction, visual language and taste. Do not directly copy or recreate existing logos."
    );
    lines.push("");
  }

  // Logo design rules
  lines.push("OUTPUT REQUIREMENTS");
  lines.push("- Create a professional logo concept, not a random illustration.");
  lines.push("- Prioritize recognizable silhouette, scalability and clean shapes.");
  lines.push("- Logo must remain understandable at small size.");
  lines.push(`- Respect exact brand name spelling: "${state.brand.name.trim()}". Never alter or invent additional words.`);
  if (state.brand.slogan.trim() && (state.logo.type === "wordmark" || state.logo.type === "symbol_wordmark")) {
    lines.push("- Slogan may appear only if relevant to the chosen logo type.");
  }
  lines.push("- Do not force mockups, stationery, walls, business cards or 3D scenes.");
  lines.push("- Primary result: the logo itself on a plain background with generous padding.");
  lines.push("- Avoid generic logo-generator clichés and unrelated decorative elements.");

  return lines.join("\n");
}

/** Human-readable summary for mini-review UI. */
export function summarizeTypography(state: MaroLogoWizardState): string {
  const opt = TYPOGRAPHY_OPTIONS.find((t) => t.value === state.look.typography);
  if (state.look.typography === "maro_decides") return "Maro decides";
  const weight = describeSpectrum(state.look.typographyControls.thinBold, "Thin", "Bold");
  const weightShort = weight.includes("strongly Bold") || weight.includes("leaning bold")
    ? "Bold"
    : weight.includes("strongly Thin") || weight.includes("leaning thin")
    ? "Thin"
    : weight.includes("leaning Bold")
    ? "Medium-Bold"
    : "Medium";
  return `${opt?.label ?? state.look.typography} · ${weightShort}`;
}

export function summarizeSymbol(state: MaroLogoWizardState): string | null {
  if (state.logo.type === "wordmark" || state.logo.type === "maro_decides") return null;
  const dir = state.logo.symbolDirection;
  if (dir && dir !== "No preference") return dir;
  return null;
}

export function summarizeLogoType(state: MaroLogoWizardState): string {
  return LOGO_TYPE_LABELS[state.logo.type] ?? state.logo.type;
}
