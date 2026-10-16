"use client";
import * as React from "react";
import { Copy, ArrowRight, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { BrainTabId, WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";
import type { BrainMemory } from "@/lib/brain-studio/memories";
import { buildSectionPrompt, parseSectionAnswer, applySectionAnswer, type AnswerCandidate } from "@/lib/brain-studio/prompts";
import styles from "./BrainStudio.module.css";

export function BrainPromptAssist({ section, profile, setProfile, memories }: { section: BrainTabId; profile: WorkspaceBrainProfile; setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>; memories: BrainMemory[] }) {
  const [step, setStep] = React.useState(0);
  const [raw, setRaw] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [candidates, setCandidates] = React.useState<AnswerCandidate[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const promptRef = React.useRef<HTMLTextAreaElement>(null);
  const pendingCopy = React.useRef(false);
  const prompt = buildSectionPrompt(profile, section, memories);
  React.useEffect(() => { if (showPrompt && pendingCopy.current) { promptRef.current?.focus(); promptRef.current?.select(); pendingCopy.current = false; } }, [showPrompt]);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setNotice("Prompti u kopjua. Dërgoje te AI-ja jote."); }
    catch { pendingCopy.current = true; setShowPrompt(true); if (showPrompt) { promptRef.current?.focus(); promptRef.current?.select(); pendingCopy.current = false; } setNotice("Kopjimi automatik nuk u lejua. Teksti është i zgjedhur: përdor Kopjo ose Ctrl/Cmd+C."); }
  }
  function review() {
    if (section === "sources") return;
    try { const items = parseSectionAnswer(raw, section, profile); setCandidates(items); setSelected(items.filter(item => !item.previous.trim()).map(item => item.key)); setError(""); setStep(3); } catch (cause) { setError(cause instanceof Error ? cause.message : "Kontrolloje përgjigjen."); }
  }
  function apply() {
    if (section === "sources") return;
    try {
      const updated = applySectionAnswer(profile, section, candidates, selected);
      setProfile(updated); setStep(0); setRaw(""); setNotice(`${selected.length} fusha u shtuan. ${selected.length ? "Ndryshimet po ruhen me profilin." : ""}`); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kontrolloje përsëri."); }
  }
  return <div className={styles.assist}>
    <div className={styles.assistBar}><WandSparkles size={20} aria-hidden="true" /><div><strong>{section === "sources" ? "Përgatite listën e referencave" : "Plotësoje me AI-n tënde"}</strong><p>ChatGPT · Claude · Gemini · Grok</p></div><Button variant="secondary" onClick={() => setStep(step ? 0 : 1)} aria-expanded={step > 0}>{step ? "Prompti" : "Përgatit promptin"}</Button></div>
    {step > 0 && <div className={styles.assistPanel}>
      <div className={styles.row}><span className={styles.steps}>{(section === "sources" ? ["Prompti"] : ["Prompti", "Përgjigjja", "Kontrolli"]).map((label, index) => <span key={label} aria-current={step === index + 1 ? "step" : undefined}>{index + 1} {label}</span>)}</span><Button size="icon" variant="ghost" aria-label="Mbyll ndihmën me AI" onClick={() => setStep(0)}><X size={16} /></Button></div>
      {step === 1 && <><p className={styles.hint}>{section === "sources" ? "AI-ja ta përgatit listën. Fotografitë i zgjedh dhe i ngarkon vetë këtu." : "Dërgoje në chat-in ku e njeh brendin tënd. Pastaj ktheje përgjigjen këtu."}</p><div className={styles.actions}><Button variant="brand" icon={<Copy size={16} />} onClick={() => void copy()}>Kopjo promptin</Button>{section !== "sources" && <Button variant="secondary" onClick={() => { setNotice(""); setStep(2); }}>E kam përgjigjen</Button>}</div><details open={showPrompt} onToggle={event => setShowPrompt(event.currentTarget.open)}><summary className={styles.promptSummary}>Shiko promptin</summary><label className={styles.field}><span>Prompti i gatshëm</span><textarea className="maro-input" rows={8} readOnly ref={promptRef} value={prompt} /></label></details></>}
      {step === 2 && <><label className={styles.field}><span>Përgjigjja nga AI-ja jote</span><textarea className="maro-input" aria-label="Përgjigjja nga AI-ja jote" rows={6} maxLength={100000} value={raw} onChange={event => setRaw(event.target.value)} placeholder="Ngjite përgjigjen e plotë këtu…" /></label><div className={styles.actions}><Button variant="brand" icon={<ArrowRight size={16} />} onClick={review} disabled={!raw.trim()}>Kontrollo fushat</Button><Button variant="ghost" onClick={() => { setStep(1); setError(""); }}>Kthehu te prompti</Button></div></>}
      {step === 3 && <><p className={styles.hint}>Kontrolloji propozimet. Fushat që kanë tekst janë të pazgjedhura.</p>{candidates.map(item => <label key={item.key} className={styles.candidate}><input type="checkbox" checked={selected.includes(item.key)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.key] : previous.filter(key => key !== item.key))} /><span><strong>{item.label}</strong><small>{item.suggested ? "Propozim nga AI-ja · kërkon kontroll" : "Tekst nga AI-ja jote"}</small>{item.previous && <small>Tash: {item.previous}</small>}<span>{item.value}</span></span></label>)}<div className={styles.actions}><Button variant="brand" onClick={apply} disabled={!selected.length}>Shto {selected.length} fusha</Button><Button variant="ghost" onClick={() => { setStep(2); setError(""); }}>Ndrysho përgjigjen</Button></div></>}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    </div>}
    {notice && <p role="status" className={styles.feedback}>{notice}</p>}
  </div>;
}
