import type { Metadata } from "next";
import { CaseStudyArchive } from "@/components/case-studies/CaseStudyArchive";
import { caseStudies } from "@/data/case-studies";

export const metadata: Metadata = {
  title: "Case Studies · Maro Lab",
  description: "Teste reale. Të njëjtat kërkesa, të njëjtat burime dhe modele të ndryshme — që dallimin ta shohësh vetë.",
};

export default function CaseStudiesPage() {
  return <CaseStudyArchive studies={caseStudies} />;
}
