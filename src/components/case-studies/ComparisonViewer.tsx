"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { CaseStudy, StudyAsset, StudyTest } from "@/data/case-studies/types";
import { setupLabel } from "@/data/case-studies/types";
import { StudyImage } from "./StudyImage";
import s from "./CaseStudies.module.css";

export type ViewerState = { kind: "image"; asset: StudyAsset; title: string } | { kind: "compare"; test: StudyTest; pair: [string, string] };

// Native modal dialog supplies inert background, focus containment, and Escape support.
export function ComparisonViewer({ state, study, onClose }: { state: ViewerState; study: CaseStudy; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pair, setPair] = useState<[string, string]>(state.kind === "compare" ? state.pair : ["", ""]);
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [position, setPosition] = useState(50);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = dialog.current;
    el?.showModal();
    return () => { el?.close(); previous?.focus({ preventScroll: true }); };
  }, []);

  const renders = state.kind === "compare" ? pair.map((id) => state.test.renders.find((render) => render.setupId === id)!) : [];
  const equalDimensions = renders.length === 2 && renders[0].width === renders[1].width && renders[0].height === renders[1].height;
  const slider = mode === "slider" && equalDimensions;
  function changePair(index: number, id: string) {
    setPair((previous) => {
      const next: [string, string] = [...previous];
      if (next[1 - index] === id) next[1 - index] = next[index];
      next[index] = id;
      return next;
    });
    setPosition(50);
  }
  return <dialog ref={dialog} className={s.viewer} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={s.viewerInner}>
      <header className={s.viewerHeader}><div><span className={s.eyebrow}>{state.kind === "compare" ? `TEST ${state.test.number} / COMPARE` : "INSPEKTIM / ORIGJINAL"}</span><h2 id={titleId}>{state.kind === "compare" ? state.test.title : state.title}</h2></div><button type="button" className={s.iconButton} onClick={onClose} aria-label="Mbyll inspektimin"><X size={22} /></button></header>
      {state.kind === "image" ? <>
        <div className={s.viewerTools}><button className={s.button} type="button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? "Përshtat në ekran" : "Shiko 100%"}</button><a href={state.asset.src} target="_blank" rel="noreferrer">Hap origjinalin <ArrowUpRight size={16} /></a><span>{state.asset.width} × {state.asset.height}</span></div>
        <div className={`${s.singleImage} ${zoom ? s.zoomed : ""}`} tabIndex={0} aria-label="Imazhi origjinal; lëviz për të inspektuar kur është i zmadhuar"><StudyImage asset={state.asset} sizes="100vw" original priority /></div>
      </> : <>
        <div className={s.viewerTools}><div className={s.modeButtons} role="group" aria-label="Mënyra e krahasimit"><button type="button" aria-pressed={!slider} onClick={() => setMode("side")}>Krah për krah</button>{equalDimensions && <button type="button" aria-pressed={slider} onClick={() => setMode("slider")}>Me ndarës</button>}</div><span>{equalDimensions ? "Dimensione identike · pa prerje" : "Raporte origjinale · pa prerje"}</span></div>
        <div className={s.compareSelectors}>{pair.map((id, index) => <label key={index}>Setup {index === 0 ? "A" : "B"}<select value={id} onChange={(event) => changePair(index, event.target.value)}>{state.test.renders.map((render) => <option key={render.setupId} value={render.setupId}>{setupLabel(study.setups.find((setup) => setup.id === render.setupId)!)}</option>)}</select></label>)}<span className={s.vs}>vs</span></div>
        {slider ? <div className={s.sliderWrap}><div className={s.sliderImages} style={{ aspectRatio: `${renders[0].width} / ${renders[0].height}` }}><StudyImage asset={renders[1]} sizes="80vw" original priority /><div className={s.sliderClip} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}><StudyImage asset={renders[0]} sizes="80vw" original priority /></div><div className={s.sliderLine} style={{ left: `${position}%` }} aria-hidden><span>↔</span></div><input type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} aria-label="Pozicioni i ndarësit" aria-valuetext={`${position}% Setup A, ${100 - position}% Setup B`} /></div><p>A ← Lëviz ndarësin ose përdor shigjetat e tastierës → B</p></div> : <div className={s.compareImages}>{renders.map((render, index) => <figure key={`${index}-${render.setupId}`}><StudyImage asset={render} sizes="(max-width: 600px) 90vw, 48vw" original priority /><figcaption><span>{setupLabel(study.setups.find((setup) => setup.id === render.setupId)!)}</span><a href={render.src} target="_blank" rel="noreferrer" aria-label={`Hap origjinalin ${setupLabel(study.setups.find((setup) => setup.id === render.setupId)!)}`}><ArrowUpRight size={18} /></a></figcaption></figure>)}</div>}
        <p className={s.viewerNote}>Inspekto kompozimin, ruajtjen e produktit dhe interpretimin e promptit. Pa pikëzim automatik.</p>
      </>}
    </div>
  </dialog>;
}
