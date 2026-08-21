import type { MaroLogoAppState, MaroLogoWizardState } from "./types";

export const DEFAULT_WIZARD_STATE: MaroLogoWizardState = {
  brand: {
    name: "",
    slogan: "",
    description: "",
    industry: "",
    industryOther: "",
    audience: "",
  },
  direction: { traits: [] },
  logo: {
    type: "maro_decides",
    conceptIntent: "maro_decides",
    symbolMeaning: "",
    mustInclude: "",
    avoid: "",
  },
  look: {
    visualStyle: "maro_decides",
    typography: "maro_decides",
    colors: { mode: "maro_decides", values: [] },
  },
  presentation: { mode: "bento" },
};

export const INITIAL_APP_STATE: MaroLogoAppState = {
  phase: "intro",
  highestStepReached: 1,
  wizard: DEFAULT_WIZARD_STATE,
  references: [],
  generation: null,
};
