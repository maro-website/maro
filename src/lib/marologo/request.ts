import {
  BRAND_TRAITS, CONCEPT_INTENTS, INDUSTRIES, INDUSTRY_OTHER, LOGO_TYPES,
  MAX_COLORS, MAX_TRAITS, PRESENTATION_MODES, TYPOGRAPHY_OPTIONS, VISUAL_STYLE_OPTIONS,
} from "./constants";
import { normalizeHex } from "./validation";
import type { MaroLogoWizardState } from "./types";
import { ImageRequestValidationError, knownKeys, requestChoice, requestObject, requestString } from "@/lib/generation/requestValidation";

/** Validate the fields the existing three-step Wizard actually sends. */
export function validateLogoWizardAnswers(value: unknown): MaroLogoWizardState {
  const root = requestObject(value, "logoWizard");
  knownKeys(root, ["brand", "direction", "logo", "look", "presentation"], "logoWizard");
  const brand = requestObject(root.brand, "brand");
  const direction = requestObject(root.direction === undefined ? {} : root.direction, "direction");
  const logo = requestObject(root.logo === undefined ? {} : root.logo, "logo");
  const look = requestObject(root.look === undefined ? {} : root.look, "look");
  const colors = requestObject(look.colors === undefined ? {} : look.colors, "colors");
  const presentation = requestObject(root.presentation === undefined ? {} : root.presentation, "presentation");
  knownKeys(brand, ["name", "slogan", "description", "industry", "industryOther", "audience"], "brand");
  knownKeys(direction, ["traits"], "direction");
  knownKeys(logo, ["type", "conceptIntent", "symbolMeaning", "mustInclude", "avoid"], "logo");
  knownKeys(look, ["visualStyle", "typography", "colors"], "look");
  knownKeys(colors, ["mode", "values"], "colors");
  knownKeys(presentation, ["mode"], "presentation");

  const name = requestString(brand.name, "brand.name", 80);
  const description = requestString(brand.description, "brand.description", 700);
  if (!name || !description) throw new ImageRequestValidationError("missing_logo_brand");
  const industry = requestChoice(brand.industry, ["", ...INDUSTRIES], "brand.industry", "");
  const industryOther = requestString(brand.industryOther, "brand.industryOther", 500, "");
  if (industry === INDUSTRY_OTHER && !industryOther) throw new ImageRequestValidationError("missing_logo_industry");

  const traits = direction.traits === undefined ? [] : direction.traits;
  if (!Array.isArray(traits) || traits.length > MAX_TRAITS || new Set(traits).size !== traits.length) {
    throw new ImageRequestValidationError("invalid_logo_traits");
  }
  const values = colors.values === undefined ? [] : colors.values;
  if (!Array.isArray(values) || values.length > MAX_COLORS) throw new ImageRequestValidationError("invalid_logo_colors");
  const normalizedColors = values.map((color) => {
    if (typeof color !== "string" || color.length > 7) throw new ImageRequestValidationError("invalid_logo_colors");
    const normalized = normalizeHex(color);
    if (!normalized) throw new ImageRequestValidationError("invalid_logo_colors");
    return normalized;
  });
  const colorMode = requestChoice(colors.mode, ["custom", "maro_decides"], "colors.mode", "maro_decides");
  if (colorMode === "custom" && normalizedColors.length === 0) throw new ImageRequestValidationError("missing_logo_colors");

  return {
    brand: { name, description, industry, industryOther,
      slogan: requestString(brand.slogan, "brand.slogan", 120, ""),
      audience: requestString(brand.audience, "brand.audience", 500, ""),
    },
    direction: { traits: traits.map((trait) => requestChoice(trait, BRAND_TRAITS, "direction.traits")) },
    logo: {
      type: requestChoice(logo.type, LOGO_TYPES.map((o) => o.value), "logo.type", "maro_decides"),
      conceptIntent: requestChoice(logo.conceptIntent, CONCEPT_INTENTS.map((o) => o.value), "logo.conceptIntent", "maro_decides"),
      symbolMeaning: requestString(logo.symbolMeaning, "logo.symbolMeaning", 4000, ""),
      mustInclude: requestString(logo.mustInclude, "logo.mustInclude", 4000, ""),
      avoid: requestString(logo.avoid, "logo.avoid", 4000, ""),
    },
    look: {
      visualStyle: requestChoice(look.visualStyle, VISUAL_STYLE_OPTIONS.map((o) => o.value), "look.visualStyle", "maro_decides"),
      typography: requestChoice(look.typography, TYPOGRAPHY_OPTIONS.map((o) => o.value), "look.typography", "maro_decides"),
      colors: { mode: colorMode, values: normalizedColors },
    },
    presentation: { mode: requestChoice(presentation.mode, PRESENTATION_MODES.map((o) => o.value), "presentation.mode", "bento") },
  };
}
