import type { MaroLogoAppState, MaroLogoWizardState } from "./types";

export const DEFAULT_WIZARD_STATE: MaroLogoWizardState = {
  brand: {
    name: "",
    slogan: "",
    description: "",
    industry: "",
    industryOther: "",
    usage: [],
  },
  direction: {
    traits: [],
    sliders: {
      simpleExpressive: 3,
      classicModern: 3,
      friendlySerious: 3,
      accessiblePremium: 3,
      safeExperimental: 3,
    },
    audience: "",
  },
  logo: {
    type: "symbol",
    symbolMeaning: "",
    symbolDirection: "No preference",
    mustInclude: "",
    avoid: "",
  },
  look: {
    typography: "maro_decides",
    typographyControls: {
      thinBold: 3,
      softSharp: 3,
      compactWide: 3,
    },
    colors: {
      mode: "maro_decides",
      values: [],
    },
    advanced: {
      simplicity: 3,
      geometry: 3,
      personality: 3,
      timelessness: 3,
      symmetry: 3,
      negativeSpace: "normal",
      construction: "freeform",
    },
  },
  finish: {
    creativeFreedom: "balanced",
    confirmed: false,
  },
};

export const INITIAL_APP_STATE: MaroLogoAppState = {
  phase: "intro",
  highestStepReached: 1,
  wizard: DEFAULT_WIZARD_STATE,
  references: [],
  generation: null,
};
