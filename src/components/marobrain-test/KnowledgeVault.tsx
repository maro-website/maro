"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, FileText, Globe, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { type Draft, type Source } from "./model";
import s from "./BrainExperiment.module.css";

const stages = ["Duke lexuar materialin…", "Duke kuptuar brandin…", "Duke lidhur produktet…", "Duke mësuar tonin e zërit…"];

export function KnowledgeVault({ draft, onAdd, onRemove }: { draft: Draft; onAdd: (source: Source) => void; onRemove: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [job, setJob] = useState<{ name: string; kind: string; stage: number; facts: string[] } | null>(null);
  const [learned, setLearned] = useState<Source | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!job) return;
    const timer = window.setTimeout(() => {
      if (job.stage < stages.length - 1) setJob({ ...job, stage: job.stage + 1 });
      else {
        const source: Source = { id: crypto.randomUUID(), name: job.name, kind: job.kind, facts: job.facts, simulated: true };
        onAdd(source); setLearned(source); setJob(null); busy.current = false;
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [job, onAdd]);

  function start(name: string, kind: string) {
    if (busy.current) return;
    if (draft.sources.length >= 50) { setError("Hiq një burim për të shtuar një tjetër."); return; }
    busy.current = true;
    setError(""); setLearned(null);
    setJob({ name, kind, stage: 0, facts: [
      `Brand: ${draft.knowledge.name || "pa emër ende"}`,
      `Audienca: ${draft.knowledge.audience || "ka nevojë për kontekst"}`,
      `Toni: ${draft.knowledge.tone || "ende i papërcaktuar"}`,
    ] });
  }
  function choose(file?: File) {
    if (!file) return;
    if (!/\.(pdf|png|jpe?g|webp|txt|docx)$/i.test(file.name)) { setError("Zgjidh PDF, PNG, JPG, WEBP, TXT ose DOCX."); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Zgjidh një skedar më të vogël se 20 MB."); return; }
    start(file.name, /\.(png|jpe?g|webp)$/i.test(file.name) ? "Image" : "Document");
  }
  function addUrl() {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      start(parsed.href, "Website"); setUrl("");
    } catch { setError("Shkruaj një URL të plotë, p.sh. https://example.com."); }
  }

  return <div className={s.vault}>
    <div className={s.vaultIntro}><div className={s.vaultSymbol}><Upload size={26} /></div><h3>Ushqeje me botën tënde.</h3><p>Një guideline, një katalog, një ide e ruajtur.<br />Konteksti i mirë fillon me materialet e tua.</p><div className={s.formatTags}><span>PDF</span><span>Brand guidelines</span><span>Product catalog</span><span>Images</span><span>Campaigns</span></div></div>
    <div className={s.dropzone} data-dragging={dragging} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}>
      <button type="button" disabled={!!job} onClick={() => input.current?.click()}><Plus size={22} /><strong>Zgjidh ose tërhiq një material</strong><span>Një skedar · deri 20 MB</span></button>
      <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
    <form className={s.urlForm} onSubmit={(e) => { e.preventDefault(); addUrl(); }}><Globe size={17} /><Input className={s.input} aria-label="URL e burimit" placeholder="https://website.com" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} /><button type="submit" aria-label="Shto URL" disabled={!!job || !url.trim()}><ArrowUpRight size={19} /></button></form>
    <p className={s.finePrint}>Eksperiment UI: skedarët nuk ngarkohen dhe URL-të nuk hapen. Mësimet më poshtë janë shembuj të simuluar nga konteksti aktual.</p>
    <Button variant="secondary" className={s.secondaryButton} disabled={!!job} icon={<FileText size={15} />} onClick={() => start("NOMA · Brand guidelines.pdf", "Brand Guidelines")}>Provo me një dokument demo</Button>
    {error && <p role="alert" className={s.error}>{error}</p>}
    <div aria-live="polite" aria-atomic="true">
      {job && <div className={s.processing}><span className={s.processingIcon}><NetworkGlyph /></span><div><small>SIMULIM · {job.name}</small><strong>{stages[job.stage]}</strong></div><div className={s.processingSteps}>{stages.map((stage, i) => <i key={stage} data-complete={i <= job.stage} />)}</div></div>}
      {learned && <div className={s.learned}><span><Check size={17} /> 3 lidhje njohurie u shtuan në demo.</span><p>Kështu do të dukej mësimi nga një burim. Këto janë shembuj, jo përmbajtje e nxjerrë nga skedari.</p><ul>{learned.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul></div>}
    </div>
    <div className={s.sourceHeading}><h3>Në Knowledge Vault</h3><span>{draft.sources.length} burime</span></div>
    {!draft.sources.length && <p className={s.empty}>Brain pret burimin e parë. Shto një material më sipër.</p>}
    {draft.sources.map((source) => <div className={s.source} key={source.id}><span className={s.sourceIcon}>{source.kind === "Image" ? <ImagePlus size={19} /> : source.kind === "Website" ? <Globe size={19} /> : <FileText size={19} />}</span><details><summary>{source.name}<small>{source.kind} · {source.simulated ? "Simuluar" : "Referencë nga Case Study"} · {source.facts.length} lidhje</small></summary><ul>{source.facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul></details><button type="button" aria-label={`Hiq ${source.name}`} onClick={() => { onRemove(source.id); if (learned?.id === source.id) setLearned(null); }}><Trash2 size={16} /></button></div>)}
  </div>;
}

function NetworkGlyph() { return <span aria-hidden="true">✳</span>; }
