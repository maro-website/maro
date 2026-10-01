"use client";

import { ArrowUpRight, Check, ChevronRight, Network, Sparkles } from "lucide-react";
import { sections, strength, type Draft, type Section } from "./model";
import s from "./BrainExperiment.module.css";

const nodes: { label: string; section: Section; x: number; y: number }[] = [
  { label: "Brand", section: "brand", x: 52, y: 42 },
  { label: "Audience", section: "target", x: 192, y: 31 },
  { label: "Goals", section: "goal", x: 257, y: 99 },
  { label: "Market", section: "market", x: 220, y: 192 },
  { label: "Voice", section: "content", x: 87, y: 224 },
  { label: "Visuals", section: "brand", x: 35, y: 153 },
  { label: "Products", section: "sources", x: 115, y: 90 },
  { label: "Content", section: "content", x: 152, y: 163 },
  { label: "Sources", section: "sources", x: 268, y: 254 },
];
const edges = [[0, 1], [0, 5], [0, 6], [1, 2], [1, 6], [2, 3], [2, 6], [3, 7], [3, 8], [4, 5], [4, 7], [5, 6], [6, 7], [7, 8]];

export function BrainPanel({ draft, section, revision, onNavigate, onTest }: {
  draft: Draft; section: Section; revision: number; onNavigate: (section: Section, group?: string) => void; onTest: () => void;
}) {
  const score = strength(draft);
  const hasCompetitors = draft.knowledge.competitors.split(/[,;\n]/).filter((v) => v.trim().length >= 2).length >= 3;
  const nextSection = hasCompetitors ? [...sections].sort((a, b) => score.sections[a.id] - score.sections[b.id])[0].id : "market";
  const improved = { ...draft, knowledge: { ...draft.knowledge, competitors: "Konkurrenti A, Konkurrenti B, Konkurrenti C" } };
  const gain = strength(improved).total - score.total;
  const status = score.total >= 80 ? "Strong" : score.total >= 50 ? "Growing" : "Getting started";
  return <aside className={s.brainPanel} aria-label="Gjendja e maroBrain">
    <div className={s.brainTop}><span><Network size={18} /> maroBrain</span><span className={s.live}><i /> LIVE</span></div>
    <p className={s.brainWorkspace}>{draft.knowledge.name || "Brandi yt"}</p>
    <div className={s.strengthLabel}>BRAIN STRENGTH <span title="Model eksperimental: sasia e kontekstit, jo vlerësim i inteligjencës reale.">LOCAL MODEL</span></div>
    <div className={s.strengthValue}><strong data-testid="brain-score">{score.total}</strong><span>/ 100</span><em>{status}</em></div>
    <div className={s.strengthTrack} role="progressbar" aria-label="Brain Strength" aria-valuenow={score.total} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${score.total}%` }} /></div>
    <div className={s.network} key={revision}>
      <svg viewBox="0 0 310 290" aria-hidden="true">
        <defs><radialGradient id="brain-network-glow"><stop stopColor="#00ff72" stopOpacity=".12" /><stop offset="1" stopColor="#00ff72" stopOpacity="0" /></radialGradient></defs>
        <circle cx="145" cy="142" r="135" fill="url(#brain-network-glow)" />
        {edges.map(([a, b]) => <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} className={nodes[a].section === section || nodes[b].section === section ? s.activeEdge : s.edge} />)}
      </svg>
      {nodes.map((node) => {
        const value = node.label === "Visuals" ? (draft.knowledge.visuals.trim() ? 100 : 0) : score.sections[node.section];
        return <button type="button" key={node.label} className={s.node} style={{ left: `${node.x / 310 * 100}%`, top: `${node.y / 290 * 100}%` }} data-active={node.section === section} data-state={value >= 80 ? "strong" : value > 0 ? "partial" : "empty"} aria-label={`${node.label}: ${value}%. Hap ${sections.find((item) => item.id === node.section)?.label}`} onClick={() => onNavigate(node.section, node.label === "Visuals" ? "visuals" : undefined)}><i /><span>{node.label}</span></button>;
      })}
    </div>
    <div className={s.networkLegend}><span><i /> E fortë</span><span><i /> Në zhvillim</span><span><i /> Pa kontekst</span></div>
    <div className={s.breakdown}>{sections.map((item) => <button key={item.id} type="button" onClick={() => onNavigate(item.id)}><span>{item.id === "brand" ? "Brand knowledge" : item.label}</span><span className={s.miniTrack}><i style={{ width: `${score.sections[item.id]}%` }} /></span><span>{score.sections[item.id]}<small>%</small></span></button>)}</div>
    <button type="button" className={s.recommendation} onClick={() => onNavigate(nextSection, hasCompetitors ? undefined : "competitors")}>
      <span className={s.recommendationLabel}><Sparkles size={13} /> HAPI I RADHËS <ChevronRight size={14} /></span>
      <strong>{hasCompetitors ? `Pasuro ${sections.find((item) => item.id === nextSection)?.label.toLowerCase()}` : "Kush janë 3 konkurrentët e tu?"}</strong>
      <span>{hasCompetitors ? "Plotëso kontekstin që mungon." : "Ndihmo Maro të kuptojë çfarë të dallon."}</span>
      {!hasCompetitors && gain > 0 && <em>+{gain} Brain Strength</em>}
    </button>
    <button type="button" className={s.testJump} onClick={onTest}><span><Check size={14} /> Shihe kontekstin në veprim</span><ArrowUpRight size={16} /></button>
  </aside>;
}
