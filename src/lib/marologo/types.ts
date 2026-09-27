export type LogoTypeValue = "wordmark" | "symbol" | "symbol_wordmark" | "maro_decides";

export type ConceptIntent = "meaning" | "typography" | "symbol" | "maro_decides";

export type PresentationMode = "bw" | "color" | "mockup" | "bento";

export type ColorMode = "custom" | "maro_decides";

export type VisualStyle =
  | "maro_decides"
  | "minimal_intelligent"
  | "bold_distinctive"
  | "elegant_refined"
  | "playful_friendly"
  | "organic_human"
  | "technical_precise"
  | "editorial_expressive";

export interface MaroLogoWizardState {
  brand: {
    name: string;
    slogan: string;
    description: string;
    industry: string;
    industryOther: string;
    audience: string;
  };
  direction: {
    traits: string[];
  };
  logo: {
    type: LogoTypeValue;
    conceptIntent: ConceptIntent;
    symbolMeaning: string;
    mustInclude: string;
    avoid: string;
  };
  look: {
    visualStyle: VisualStyle;
    typography: string;
    colors: {
      mode: ColorMode;
      values: string[];
    };
  };
  presentation: {
    mode: PresentationMode;
  };
}

export interface UploadedReference {
  id: string;
  name: string;
  dataUrl: string;
}

export type WizardStep = 1 | 2 | 3;

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
