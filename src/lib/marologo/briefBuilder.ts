import {
  LOGO_TYPE_LABELS,
  PRESENTATION_LABELS,
  TYPOGRAPHY_OPTIONS,
  VISUAL_STYLE_OPTIONS,
} from "./constants";
import type { LogoTypeValue, MaroLogoWizardState, PresentationMode } from "./types";
import { resolveIndustry } from "./validation";

type CategoryProfile = {
  signal: string;
  tension: string;
  cliches: string;
  mockup: string;
  architecture: Exclude<LogoTypeValue, "maro_decides">;
  concept: string;
  style: string;
  typography: string;
  palette: string;
};

const CATEGORY_PROFILES: Array<[RegExp, CategoryProfile]> = [
  [/(saas|software|technology|artificial intelligence|\bai\b|\btech\b)/i, {
    signal: "clarity, trust and forward momentum without losing human accessibility",
    tension: "advanced capability versus effortless simplicity",
    cliches: "generic circuit lines, AI sparkles, robot heads, glowing brains and arbitrary tech gradients",
    mockup: "a polished app icon and product interface or premium device application",
    architecture: "symbol_wordmark", concept: "a compact proprietary symbol built from a simple organizing idea", style: "minimal, intelligent and precise", typography: "a contemporary custom sans serif with distinctive details", palette: "a restrained contemporary palette with one confident accent",
  }],
  [/(restaurant|café|cafe|food|beverage|hospitality)/i, {
    signal: "hospitality, appetite and a memorable sense of place",
    tension: "warmth versus premium restraint",
    cliches: "chef hats, forks and spoons, coffee cups, generic flames and literal plates unless specifically requested",
    mockup: "a premium menu cover, packaging detail or exterior signage appropriate to the venue",
    architecture: "symbol_wordmark", concept: "a distinctive hospitality mark with an ownable local or sensory cue", style: "warm, refined and tactile", typography: "characterful custom lettering or a refined serif/sans pairing", palette: "an appetizing restrained palette with material warmth",
  }],
  [/(construction|architecture|real estate|property|interior|home)/i, {
    signal: "reliability, precision and long-term confidence",
    tension: "structural strength versus contemporary sophistication",
    cliches: "roof outlines, house silhouettes, skylines, cranes, hammers and generic building monograms unless requested",
    mockup: "premium site signage, architectural plans or a vehicle application with realistic materials",
    architecture: "symbol_wordmark", concept: "an engineered, ownable form based on structure or connection rather than a literal building", style: "bold, architectural and precise", typography: "sturdy custom sans serif lettering with disciplined spacing", palette: "an industrial neutral palette with one authoritative accent",
  }],
  [/(fashion|beauty|cosmetic|luxury)/i, {
    signal: "desirability, point of view and confident recognition",
    tension: "timeless elegance versus a distinctive contemporary edge",
    cliches: "hangers, dresses, crowns, diamonds, eyelashes and generic luxury crests unless requested",
    mockup: "a premium garment tag, embossed packaging or refined storefront application",
    architecture: "wordmark", concept: "distinctive letterforms and an ownable typographic signature", style: "editorial, elegant and restrained", typography: "bespoke high-contrast or fashion-forward wordmark lettering", palette: "a disciplined fashion palette with strong material contrast",
  }],
  [/(creative agency|design studio|marketing|advertising|video production|photography|media)/i, {
    signal: "original thinking, confidence and creative range",
    tension: "expressive personality versus strategic clarity",
    cliches: "light bulbs, pencils, pen nibs, camera apertures, play buttons and generic colorful blobs unless requested",
    mockup: "a sharp studio portfolio cover, presentation system or environmental identity application",
    architecture: "symbol_wordmark", concept: "a flexible visual device with a clear transformation or framing idea", style: "bold, editorial and distinctive", typography: "expressive custom typography controlled by a disciplined grid", palette: "a confident high-contrast palette with a purposeful accent",
  }],
  [/(kids|children|family|toy|education)/i, {
    signal: "joy, imagination and reassuring friendliness",
    tension: "playfulness versus clarity and trust",
    cliches: "random rainbows, balloons, childish clip-art, excessive primary colors and generic smiling stars unless requested",
    mockup: "a delightful product package, book cover or child-friendly retail application",
    architecture: "symbol_wordmark", concept: "a simple characterful shape with a memorable friendly gesture", style: "playful, warm and clean", typography: "rounded custom lettering with excellent legibility", palette: "a joyful but controlled palette with clear hierarchy",
  }],
  [/(fintech|finance|bank|insurance|investment|payment)/i, {
    signal: "trust, control and intelligent progress",
    tension: "institutional credibility versus modern speed",
    cliches: "shields, coins, dollar signs, stock arrows, columns and generic connected nodes unless requested",
    mockup: "a premium payment card, financial app interface or restrained corporate application",
    architecture: "symbol_wordmark", concept: "a stable, ownable symbol based on flow, balance or exchange without literal financial icons", style: "minimal, assured and precise", typography: "highly legible contemporary sans serif with authoritative proportions", palette: "a trustworthy restrained palette with a modern accent",
  }],
  [/(personal brand|content creator|consulting|professional services|legal)/i, {
    signal: "recognition, credibility and a clear personal point of view",
    tension: "individual character versus professional authority",
    cliches: "generic signatures, shields, columns, gavels and arbitrary initials inside circles unless requested",
    mockup: "a premium profile, editorial cover or personal stationery application",
    architecture: "wordmark", concept: "an ownable typographic signature or intelligent monogram only when the initials offer a strong idea", style: "confident, refined and personal", typography: "bespoke wordmark lettering with memorable spacing or ligatures", palette: "a restrained personal palette with one distinctive accent",
  }],
];

const DEFAULT_PROFILE: CategoryProfile = {
  signal: "clear differentiation, trust and memorable brand recognition",
  tension: "category familiarity versus a distinctive ownable point of view",
  cliches: "obvious category symbols, generic swooshes, arbitrary gradients and stock-logo geometry",
  mockup: "one premium real-world application selected from the business context",
  architecture: "symbol_wordmark",
  concept: "one simple, ownable organizing idea that can support a coherent identity system",
  style: "clear, distinctive and professionally restrained",
  typography: "customized, highly legible typography appropriate to the audience",
  palette: "a small purposeful palette derived from the brand character",
};

const TYPE_TEXT: Record<LogoTypeValue, string> = {
  wordmark: "Wordmark — make the exact brand name the primary identity through custom letterforms, spacing and rhythm.",
  symbol: "Symbol — make a distinctive standalone mark the primary result; use the brand name only as context.",
  symbol_wordmark: "Symbol + Wordmark — design a unified symbol and exact-name wordmark that work together and separately.",
  maro_decides: "",
};

const INTENT_TEXT = {
  meaning: "Meaning first: begin with one relevant strategic idea, then reduce it to a simple ownable form.",
  typography: "Typography first: make the exact brand name and custom letterforms the main conceptual asset.",
  symbol: "Symbol first: prioritize a distinctive silhouette that is recognizable before the wordmark is read.",
  maro_decides: "",
} as const;

function profileFor(state: MaroLogoWizardState): CategoryProfile {
  const context = `${resolveIndustry(state)} ${state.brand.description}`;
  return CATEGORY_PROFILES.find(([pattern]) => pattern.test(context))?.[1] ?? DEFAULT_PROFILE;
}

function traits(state: MaroLogoWizardState): string {
  return state.direction.traits.length ? state.direction.traits.join(", ") : "infer the most fitting personality from the business and audience";
}

function resolvedArchitecture(state: MaroLogoWizardState, profile: CategoryProfile): string {
  if (state.logo.type !== "maro_decides") return TYPE_TEXT[state.logo.type];
  return `Maro decision: ${TYPE_TEXT[profile.architecture]} This is a creative recommendation, not a claimed business fact.`;
}

function resolvedIntent(state: MaroLogoWizardState, profile: CategoryProfile): string {
  if (state.logo.conceptIntent !== "maro_decides") return INTENT_TEXT[state.logo.conceptIntent];
  return `Maro decision: lead with ${profile.concept}.`;
}

function resolvedStyle(state: MaroLogoWizardState, profile: CategoryProfile): string {
  if (state.look.visualStyle === "maro_decides") return `Maro decision: ${profile.style}.`;
  return `${VISUAL_STYLE_OPTIONS.find((item) => item.value === state.look.visualStyle)?.label ?? state.look.visualStyle}.`;
}

function resolvedTypography(state: MaroLogoWizardState, profile: CategoryProfile): string {
  if (state.look.typography === "maro_decides") return `Maro decision: ${profile.typography}.`;
  const option = TYPOGRAPHY_OPTIONS.find((item) => item.value === state.look.typography);
  return `${option?.label ?? state.look.typography}; customize the letterforms rather than using an untouched stock font.`;
}

function colorDirection(state: MaroLogoWizardState, profile: CategoryProfile): string {
  if (state.presentation.mode === "bw") return "Render strictly in black and white. Judge the identity by form, contrast and recognizability; defer the color system.";
  if (state.look.colors.mode === "custom" && state.look.colors.values.length) return `Use this deliberate palette: ${state.look.colors.values.join(", ")}. Maintain accessible contrast and a clear primary/secondary hierarchy.`;
  return `Maro decision: ${profile.palette}. Keep the palette limited and reproducible.`;
}

function presentationDirection(mode: PresentationMode, profile: CategoryProfile): string[] {
  if (mode === "bw") return [
    "BLACK & WHITE: show the logo itself on a plain, high-contrast field with generous breathing room.",
    "Prioritize silhouette, negative space, small-size recognition and optical balance. No mockup, texture, color or decorative scene.",
  ];
  if (mode === "color") return [
    "COLOR: show one clean identity presentation on a controlled plain background.",
    "Use the approved palette with disciplined hierarchy. No random marketing copy, lifestyle clutter or unrelated mockup objects.",
  ];
  if (mode === "mockup") return [
    `LOGO MOCKUP: show one highly relevant premium application: ${profile.mockup}.`,
    "The identity remains the hero. Use believable scale, material, lighting and production detail; avoid generic wall-logo scenes when a more relevant application exists.",
  ];
  return [
    "BENTO GRID — RECOMMENDED IDENTITY-SYSTEM VIEW: create one art-directed image containing multiple views of ONE cohesive identity.",
    `Adapt the modules to the brand. Include the primary logo, standalone symbol or typographic detail, an alternate lockup where the chosen architecture supports it, black/white application, color application, close-up construction detail, and one relevant application such as ${profile.mockup}.`,
    "Every module must use the SAME brand, SAME core symbol, SAME wordmark letterforms, SAME palette and SAME design logic.",
    "This is not a moodboard and not a sheet of alternatives. Do not create six concepts, substitute symbols, change fonts between panels or repeat the brand name with inconsistent spelling.",
  ];
}

export function buildMaroLogoBrief(state: MaroLogoWizardState, hasReferences: boolean): string {
  const profile = profileFor(state);
  const name = state.brand.name.trim();
  const lines: string[] = ["PROFESSIONAL IDENTITY BRIEF", ""];

  lines.push("BRAND");
  lines.push(`- Exact name: ${name}`);
  if (state.brand.slogan.trim()) lines.push(`- Slogan: ${state.brand.slogan.trim()}`);
  lines.push(`- Business: ${state.brand.description.trim()}`);
  lines.push(`- Industry/context: ${resolveIndustry(state)}`);
  if (state.brand.audience.trim()) lines.push(`- Audience/context: ${state.brand.audience.trim()}`);
  lines.push("");

  lines.push("STRATEGIC IDEA");
  lines.push(`- Communicate: ${profile.signal}.`);
  lines.push(`- Brand personality: ${traits(state)}.`);
  lines.push(`- Creative tension: ${profile.tension}.`);
  lines.push(`- Concept priority: ${resolvedIntent(state, profile)}`);
  if (state.logo.symbolMeaning.trim()) lines.push(`- User concept direction: ${state.logo.symbolMeaning.trim()}`);
  lines.push("");

  lines.push("DESIGN DIRECTION");
  lines.push(`- Logo architecture: ${resolvedArchitecture(state, profile)}`);
  lines.push(`- Visual style: ${resolvedStyle(state, profile)}`);
  lines.push(`- Typography: ${resolvedTypography(state, profile)}`);
  lines.push(`- Geometry/form: reduce the idea to a distinctive silhouette with controlled spacing and purposeful negative space.`);
  lines.push(`- Color: ${colorDirection(state, profile)}`);
  lines.push("");

  lines.push("CREATIVE PRIORITY");
  lines.push("- One strong, ownable identity idea is more important than decoration, cleverness for its own sake or the number of elements.");
  lines.push("- Make the result feel specific to this brand context, not merely appropriate for the category.");
  lines.push("");

  lines.push("AVOID");
  lines.push(`- Category clichés: ${profile.cliches}.`);
  if (state.logo.avoid.trim()) lines.push(`- Explicit user restrictions: ${state.logo.avoid.trim()}`);
  lines.push("- Generic logo-generator tropes, unrelated decoration, clip-art, watermarks and fake supporting copy.");
  lines.push("");

  if (state.logo.mustInclude.trim()) {
    lines.push("REQUIRED");
    lines.push(`- ${state.logo.mustInclude.trim()}`);
    lines.push("");
  }

  if (hasReferences) {
    lines.push("REFERENCES");
    lines.push("- Use supplied images as evidence of taste, visual language, relevant forms or existing brand context.");
    lines.push("- Synthesize the direction; do not trace, copy or reproduce an existing logo. Preserve an uploaded existing brand asset only when the brief explicitly asks for continuity.");
    lines.push("");
  }

  lines.push("PRESENTATION");
  lines.push(...presentationDirection(state.presentation.mode, profile).map((line) => `- ${line}`));
  lines.push("");

  lines.push("QUALITY RULES");
  lines.push("- Vector-like clarity, clean contours, professional spacing, reproducible shapes and a distinctive silhouette.");
  lines.push("- Legible and recognizable at small size; no fragile detail that disappears in practical use.");
  lines.push(`- Whenever text is shown, spell the brand name exactly as \"${name}\". Do not invent extra names, taglines or random text.`);
  lines.push("- Maintain one consistent logo system throughout the image; no unrelated concept variants.");
  lines.push("- Deliver polished identity design, not an illustration of the business.");

  return lines.join("\n");
}

export function summarizeTypography(state: MaroLogoWizardState): string {
  if (state.look.typography === "maro_decides") return "Maro vendos";
  return TYPOGRAPHY_OPTIONS.find((item) => item.value === state.look.typography)?.label ?? state.look.typography;
}

export function summarizeSymbol(state: MaroLogoWizardState): string | null {
  return state.logo.symbolMeaning.trim() || null;
}

export function summarizeLogoType(state: MaroLogoWizardState): string {
  return LOGO_TYPE_LABELS[state.logo.type] ?? state.logo.type;
}

export function summarizePresentation(state: MaroLogoWizardState): string {
  return PRESENTATION_LABELS[state.presentation.mode] ?? state.presentation.mode;
}
