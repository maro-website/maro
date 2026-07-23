// maroFort — shared, client-safe types for the schema-driven expert mode.
// The canonical field schema lives in code (schema.ts); the admin can override
// labels/defaults/visibility/options via app_settings.fort_config.

export type FortModuleId = "web" | "imazh" | "logo";

export type FortFieldType =
  | "select"
  | "multiselect"
  | "text"
  | "textarea"
  | "slider"
  | "color"
  | "assetControl"
  | "positionGrid";

export interface FortOption {
  id: string;
  label: string;
}

// A visibility/inclusion condition. Matches when the referenced field currently
// equals one of `equals`, or (for multiselect values) includes one of `includes`.
export interface FortCondition {
  field: string;
  equals?: string[];
  includes?: string[];
}

// The 10 structured-brief sections (see briefBuilder.ts).
export type BriefSection =
  | "primary"
  | "objective"
  | "brand"
  | "creative"
  | "technical"
  | "required"
  | "restrictions"
  | "reference"
  | "expert"
  | "output";

export interface FortFieldSchema {
  id: string;
  type: FortFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: FortOption[];
  default?: string | string[];
  required?: boolean;
  /** Display order within its section. */
  order?: number;
  /** Show only when any of these conditions match. */
  visibleWhen?: FortCondition[];
  /** Which brief section this field contributes to. */
  briefSection?: BriefSection;
  /** Higher = earlier / stronger in the brief. */
  priority?: number;
  /** Slider endpoint labels. */
  sliderMin?: string;
  sliderMax?: string;
  /** Max selections for multiselect. */
  maxSelect?: number;
  /** Bridge to an existing request field (website), e.g. primaryColor, language. */
  mapsTo?: string;
  /** Label prefix used when rendering into the brief text. */
  briefLabel?: string;
}

export interface FortSectionSchema {
  id: string;
  label: string;
  description?: string;
  order?: number;
  visibleWhen?: FortCondition[];
  fields: FortFieldSchema[];
}

export interface FortModuleSchema {
  id: FortModuleId;
  sections: FortSectionSchema[];
}

// ---- Admin overrides (persisted in app_settings.fort_config) ----------------
export interface FortFieldOverride {
  enabled?: boolean;
  label?: string;
  description?: string;
  placeholder?: string;
  order?: number;
  required?: boolean;
  default?: string | string[];
  hiddenOptions?: string[];
  optionLabels?: Record<string, string>;
  addedOptions?: FortOption[];
}

export interface FortModuleOverride {
  enabled?: boolean;
  fields?: Record<string, FortFieldOverride>;
}

export interface FortPromptLayer {
  id: string;
  name: string;
  description?: string;
  content: string;
  priority?: number;
  enabled?: boolean;
  module: "universal" | FortModuleId;
  /** Only inject when any of these conditions match (empty => always for module). */
  when?: FortCondition[];
}

export interface FortPlanConfig {
  priceEur?: number;
  credits?: number;
  perks?: string[];
}

export interface FortConfig {
  /** Global maroFort on/off. */
  enabled?: boolean;
  label?: string;
  description?: string;
  ctaText?: string;
  badgeText?: string;
  defaultCreativeFreedom?: string;
  defaultOutputGoal?: string;
  /** Whether newly added fields default to enabled. */
  newSettingsDefault?: boolean;
  /** Show the Brief Strength meter. */
  briefScore?: boolean;
  modules?: Partial<Record<FortModuleId, FortModuleOverride>>;
  promptLayers?: FortPromptLayer[];
  plan?: FortPlanConfig;
}

export type FortValue = string | string[] | Record<string, unknown>;
export type FortValues = Record<string, FortValue>;

export interface FortPayload {
  enabled: boolean;
  values: FortValues;
}

// Map a tool id (registry) to its maroFort module id.
export function toolToFortModule(toolId: string): FortModuleId | null {
  if (toolId === "website") return "web";
  if (toolId === "logo") return "logo";
  if (toolId === "reklama") return "imazh";
  return null;
}

export const FORT_DEFAULTS = {
  label: "maroFort",
  description: "Modaliteti ekspert: brief kreativ i detajuar për rezultate premium.",
  ctaText: "Aktivizo maroFort",
  badgeText: "Premium",
  defaultCreativeFreedom: "balanced",
  defaultOutputGoal: "premium",
  briefScore: true,
} as const;
