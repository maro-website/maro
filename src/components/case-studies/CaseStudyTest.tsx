"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, ChevronDown, Expand, Plus } from "lucide-react";
import type { CaseStudy, GenerationSetup, StudyRender, StudyTest } from "@/data/case-studies/types";
import { setupLabel } from "@/data/case-studies/types";
import { StudyImage } from "./StudyImage";
import { PromptBlock } from "./PromptBlock";
import s from "./CaseStudies.module.css";

export function OutputCard({ render, setup, test, selected, onSelect, onInspect }: {
  render: StudyRender; setup: GenerationSetup; test: StudyTest; selected: boolean; onSelect: () => void; onInspect: () => void;
}) {
  return <article className={s.output} data-selected={selected || undefined}>
    <header className={s.outputHeader}><div><h3 className={setup.isMaro ? s.maroLabel : undefined}>{setup.provider}</h3><span>{setup.brain ? <>maroBrain <b>{setup.brain}</b></> : setup.model}</span></div><button type="button" className={s.selectButton} onClick={onSelect} aria-pressed={selected} aria-label={`${selected ? "Hiq" : "Zgjidh"} ${setupLabel(setup)} për krahasim`}>{selected ? <Check size={17} /> : <Plus size={17} />}</button></header>
    <button type="button" className={s.outputImage} onClick={onInspect} aria-label={`Zmadho ${test.title} — ${setupLabel(setup)}`}><StudyImage asset={render} sizes="(max-width: 699px) 78vw, (max-width: 1099px) 43vw, 24vw" /><span className={s.expand}><Expand size={16} /> Inspekto</span></button>
    <details className={s.outputMetadata}><summary>Detajet e gjenerimit <ChevronDown size={14} aria-hidden /></summary><dl><div><dt>Test</dt><dd>{test.number} · {test.title}</dd></div><div><dt>Setup</dt><dd>{setupLabel(setup)}</dd></div><div><dt>Rezolucioni</dt><dd>{render.width} × {render.height}</dd></div><div><dt>Input</dt><dd>Prompt + attachment{setup.brain === "ON" ? " + kontekst brandi" : ""}</dd></div></dl><a href={render.src} target="_blank" rel="noreferrer">Hap origjinalin ↗</a></details>
  </article>;
}

export function CaseStudyTest({ test, study, onInspect, onCompare }: {
  test: StudyTest; study: CaseStudy; onInspect: (render: StudyRender) => void; onCompare: (pair: [string, string]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((previous) => previous.includes(id) ? previous.filter((value) => value !== id) : [...previous.slice(-1), id]);
  return <section id={test.id} className={s.test} aria-labelledby={`${test.id}-title`}>
    <div className={s.testHeading}><div><span className={s.eyebrow}>TEST {test.number}</span><h2 id={`${test.id}-title`}>{test.title}</h2></div><p>{test.description}</p></div>
    <PromptBlock prompt={test.prompt} number={test.number} />
    <div className={s.compareToolbar}><p><ArrowLeftRight size={16} aria-hidden /><span>Zgjidh dy rezultate për krahasim.</span></p><button type="button" className={s.button} disabled={selected.length !== 2} onClick={() => onCompare([selected[0], selected[1]])}>Compare <span>{selected.length}/2</span><ArrowLeftRight size={16} aria-hidden /></button></div>
    <div className={s.outputGrid} tabIndex={0} role="region" aria-label={`Katër rezultate: ${test.title}. Në ekran të vogël rrëshqit horizontalisht.`}>{test.renders.map((render) => <OutputCard key={render.setupId} render={render} setup={study.setups.find((setup) => setup.id === render.setupId)!} test={test} selected={selected.includes(render.setupId)} onSelect={() => toggle(render.setupId)} onInspect={() => onInspect(render)} />)}</div>
    <p className={s.railHint}>← Rrëshqit për të parë të katër konfigurimet →</p>
  </section>;
}
