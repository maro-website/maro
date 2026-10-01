export const CASE_STUDY_MODULES = ["maroImazh", "maroLogo", "maroWeb", "maroFilma", "maroAudio", "maroMarketing"] as const;
export type CaseStudyModule = typeof CASE_STUDY_MODULES[number];

export interface StudyAsset {
  label?: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface GenerationSetup {
  id: string;
  provider: string;
  model: string | null;
  brain: "OFF" | "ON" | null;
  isMaro: boolean;
}

export interface StudyRender extends StudyAsset {
  setupId: string;
}

export interface StudyTest {
  id: string;
  number: string;
  title: string;
  description: string;
  prompt: string;
  renders: StudyRender[];
}

export interface CaseStudy {
  id: string;
  slug: string;
  number: string;
  title: string;
  brand: string;
  module: CaseStudyModule;
  category: string;
  type: string;
  description: string;
  date: string | null;
  headline: string[];
  introduction: string;
  cover: StudyAsset;
  inputs: StudyAsset[];
  setups: GenerationSetup[];
  tests: StudyTest[];
  evidence: { title: string; src: string; type: "pdf" | "image" }[];
  methodology: { statement: string; provenance: string; limitations: string };
  maroBrain: { label: string; title: string; description: string }[];
  cta: { label: string; href: string };
}

export const setupLabel = (setup: GenerationSetup) =>
  `${setup.provider} · ${setup.brain ? `maroBrain ${setup.brain}` : setup.model}`;

export const renderCount = (study: CaseStudy) => study.tests.reduce((total, test) => total + test.renders.length, 0);
