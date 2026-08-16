export type LogoTypeValue = "wordmark" | "symbol" | "symbol_wordmark" | "maro_decides";

export type ColorMode = "custom" | "maro_decides";

export type CreativeFreedom = "precise" | "balanced" | "wild";

export type NegativeSpaceValue = "normal" | "explore";

export type ConstructionValue = "freeform" | "grid_based";

export type SliderValue = 1 | 2 | 3 | 4 | 5;

export interface DirectionSliders {
  simpleExpressive: SliderValue;
  classicModern: SliderValue;
  friendlySerious: SliderValue;
  accessiblePremium: SliderValue;
  safeExperimental: SliderValue;
}

export interface TypographyControls {
  thinBold: SliderValue;
  softSharp: SliderValue;
  compactWide: SliderValue;
}

export interface LookAdvanced {
  simplicity: SliderValue;
  geometry: SliderValue;
  personality: SliderValue;
  timelessness: SliderValue;
  symmetry: SliderValue;
  negativeSpace: NegativeSpaceValue;
  construction: ConstructionValue;
}

export interface MaroLogoWizardState {
  brand: {
    name: string;
    slogan: string;
    description: string;
    industry: string;
    industryOther: string;
    usage: string[];
  };
  direction: {
    traits: string[];
    sliders: DirectionSliders;
    audience: string;
  };
  logo: {
    type: LogoTypeValue;
    symbolMeaning: string;
    symbolDirection: string;
    mustInclude: string;
    avoid: string;
  };
  look: {
    typography: string;
    typographyControls: TypographyControls;
    colors: {
      mode: ColorMode;
      values: string[];
    };
    advanced: LookAdvanced;
  };
  finish: {
    creativeFreedom: CreativeFreedom;
    confirmed: boolean;
  };
}

export interface UploadedReference {
  id: string;
  name: string;
  dataUrl: string;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type WizardPhase = "intro" | WizardStep | "generating" | "result";

export interface MaroLogoGenerationState {
  status: "idle" | "loading" | "done" | "error";
  images: string[];
  error?: string;
  jobId?: string;
}

export interface MaroLogoAppState {
  phase: WizardPhase;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  references: UploadedReference[];
  generation: MaroLogoGenerationState | null;
}
