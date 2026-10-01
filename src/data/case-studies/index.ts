import { nomaCoffee } from "./noma-coffee";
import type { CaseStudy } from "./types";

// Register one data object per published experiment. Teasers never enter this list.
export const caseStudies: CaseStudy[] = [nomaCoffee];
export const getCaseStudy = (slug: string) => caseStudies.find((study) => study.slug === slug);
export const futureStudies = [
  { number: "02", module: "maroLogo" },
  { number: "03", module: "maroWeb" },
  { number: "04", module: "maroFilma" },
];
