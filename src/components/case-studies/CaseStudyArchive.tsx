"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FlaskConical } from "lucide-react";
import { CASE_STUDY_MODULES, renderCount, type CaseStudy, type CaseStudyModule } from "@/data/case-studies/types";
import { StudyImage } from "./StudyImage";
import { FutureStudies, StudyFooter, StudyStats } from "./StudyPrimitives";
import s from "./CaseStudies.module.css";

export function CaseStudyArchive({ studies }: { studies: CaseStudy[] }) {
  const [filter, setFilter] = useState<CaseStudyModule | "all">("all");
  const visible = studies.filter((study) => filter === "all" || study.module === filter);
  return <div className={s.page}>
    <header className={s.archiveHero}>
      <p className={s.eyebrow}><span className={s.statusDot} /> MARO LAB / CASE STUDIES</p>
      <h1>Mos na beso neve.<br /><span>Shiko rezultatet.</span></h1>
      <div className={s.heroBottom}><p>Teste reale. Të njëjtat kërkesa, të njëjtat burime dhe modele të ndryshme — që dallimin ta shohësh vetë.</p><span className={s.principle}>Same brief. Same asset.<br />Different intelligence.</span></div>
    </header>
    <StudyStats items={[
      { value: studies.length, label: "Case Study" },
      { value: studies.reduce((sum, study) => sum + study.tests.length, 0), label: "Tests" },
      { value: studies.reduce((sum, study) => sum + renderCount(study), 0), label: "Gjenerime" },
      { value: new Set(studies.map((study) => study.brand)).size, label: "Brand" },
    ]} />
    <section className={s.archiveList} aria-label="Arkivi i eksperimenteve">
      <div className={s.filters} role="group" aria-label="Filtro sipas modulit">
        {(["all", ...CASE_STUDY_MODULES] as const).map((module) => <button key={module} type="button" onClick={() => setFilter(module)} aria-pressed={filter === module}>{module === "all" ? "Të gjitha" : module}{module === "all" && <span>{studies.length.toString().padStart(2, "0")}</span>}</button>)}
      </div>
      <div aria-live="polite">
        {visible.length ? visible.map((study) => <Link href={`/case-studies/${study.slug}`} className={s.studyCard} key={study.id}>
          <div className={s.cardVisual}><StudyImage asset={study.cover} sizes="(max-width: 700px) 100vw, 55vw" priority className={s.coverImage} /><span className={s.imageTag}>EXPERIMENT {study.number} / {study.module}</span><span className={s.coverArrow}><ArrowUpRight aria-hidden /></span></div>
          <div className={s.cardCopy}><div className={s.cardTop}><span className={s.index}>{study.number}</span><span className={s.eyebrow}>{study.category}</span></div><div><span className={s.module}>{study.module}</span><h2>{study.title}</h2><p>{study.description}</p></div><div className={s.cardBottom}><span>{study.tests.length} teste <span aria-hidden> / </span> {renderCount(study)} gjenerime</span><strong>Shiko Case Study <ArrowRight size={18} aria-hidden /></strong></div></div>
        </Link>) : <div className={s.empty}><FlaskConical size={28} aria-hidden /><h2>{filter}: eksperimente në vijim.</h2><p>Ende nuk ka Case Studies në këtë modul.</p><button type="button" className={s.button} onClick={() => setFilter("all")}>Shiko të gjitha <ArrowRight size={16} /></button></div>}
      </div>
    </section>
    <FutureStudies /><StudyFooter />
  </div>;
}
