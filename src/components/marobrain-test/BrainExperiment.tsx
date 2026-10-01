"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Compass, Fingerprint, Flag, FolderOpen, Layers, Lightbulb, MessageCircle, Plus, RotateCcw, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { fetchBrainProfile } from "@/lib/workspaces/brainService";
import { MARO_LOGO } from "@/lib/design/maro-system";
import { BrainPanel } from "./BrainPanel";
import { KnowledgeVault } from "./KnowledgeVault";
import { fieldStrength, fixture, fromProfile, groups, parseDraft, productImage, sectionCopy, sections, strength, type Draft, type FieldKey, type Group, type Knowledge, type Section, type Source } from "./model";
import s from "./BrainExperiment.module.css";

const icons = { brand: Fingerprint, target: Users, goal: Flag, market: Compass, content: MessageCircle, sources: FolderOpen };
const STORE = "maro:experiment:marobrain-test:v1";

export function BrainExperiment() {
  const { user, ready: accountReady } = useMaro();
  const { workspaces, ready: workspaceReady } = useWorkspace();
  const noma = workspaces.find((workspace) => /\bnoma\b/i.test(workspace.name));
  const userId = user?.id;
  const nomaId = noma?.id;
  const [draft, setDraft] = useState<Draft>(fixture);
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("brand");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saved, setSaved] = useState("Duke përgatitur…");
  const [revision, setRevision] = useState(0);
  const [resetPending, setResetPending] = useState(false);
  const storageKey = useRef("");
  const testRef = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!accountReady || (userId && !workspaceReady)) return;
    let cancelled = false;
    setReady(false);
    const key = `${STORE}:${userId || "demo"}:${nomaId || "fixture"}`;
    storageKey.current = key;
    async function initialize() {
      let cached: Draft | null = null;
      try { cached = parseDraft(localStorage.getItem(key)); } catch { /* The in-memory experiment still works. */ }
      let next = cached || fixture();
      if (!cached && userId && nomaId) {
        try {
          // Read only. No production save, upload, workspace selection or scoring is used.
          const profile = await fetchBrainProfile(userId, nomaId);
          if (profile.brand.name || profile.brand.description) next = { version: 1, origin: "workspace", knowledge: fromProfile(profile), sources: [] };
        } catch { /* Safely fall back to the documented NOMA fixture. */ }
      }
      if (!cancelled) { setDraft(next); setReady(true); setSaved("Ruajtur lokalisht"); }
    }
    void initialize();
    return () => { cancelled = true; };
  }, [accountReady, workspaceReady, userId, nomaId]);

  useEffect(() => {
    if (!ready) return;
    // Persist immediately; only the visual acknowledgement is delayed. Leaving
    // the page during the feedback animation cannot drop the last keystroke.
    try { localStorage.setItem(storageKey.current, JSON.stringify(draft)); }
    catch { setSaved("Vetëm në këtë sesion · ruajtja lokale s’është e disponueshme"); return; }
    setSaved("Duke ruajtur lokalisht…");
    const timer = window.setTimeout(() => setSaved("Ruajtur lokalisht"), 600);
    return () => window.clearTimeout(timer);
  }, [draft, ready]);

  const update = (key: FieldKey, value: string) => {
    setDraft((previous) => ({ ...previous, knowledge: { ...previous.knowledge, [key]: value } }));
  };
  const addSource = useCallback((source: Source) => {
    setDraft((previous) => ({ ...previous, sources: [...previous.sources, source] }));
    setRevision((value) => value + 1);
  }, []);
  const removeSource = (id: string) => setDraft((previous) => ({ ...previous, sources: previous.sources.filter((source) => source.id !== id) }));
  function navigate(next: Section, group?: string) {
    setSection(next); setExpanded(group || null); setRevision((value) => value + 1);
    requestAnimationFrame(() => {
      if (group) {
        const element = document.getElementById(`knowledge-${group}`);
        element?.scrollIntoView({ block: "center", behavior: "auto" });
        element?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input")?.focus({ preventScroll: true });
      } else heading.current?.focus({ preventScroll: true });
    });
  }
  function showTest() {
    testRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    testRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
  }
  const score = strength(draft);
  const copy = sectionCopy[section];

  return <div className={s.page} data-marobrain-test>
    <header className={s.topbar}>
      <Link href="/" className={s.maroLogo} aria-label="Maro Hub"><Image src={MARO_LOGO.lockup} alt="maro" width={100} height={28} priority /></Link>
      <span className={s.topDivider} />
      <span className={s.topbarTitle}>Intelligence workspace</span>
      <span className={s.labBadge}><i /> LOCAL EXPERIMENT</span>
      <Link href="/brain" className={s.compare}>maroBrain aktual <ArrowUpRight size={15} /></Link>
    </header>
    <div className={s.workspace}>
      <aside className={s.sidebar}>
        <Link href="/" className={s.back}><ArrowLeft size={14} /> Maro Hub</Link>
        <div className={s.workspaceBadge}><span className={s.nomaMark}>N<span>®</span></span><div><strong>{draft.knowledge.name || "Brandi yt"}</strong><span>{draft.origin === "workspace" ? "Kopje lokale e workspace" : "Demo workspace"}</span></div><Layers size={15} /></div>
        <div className={s.sideCaption}>SHTRESAT E NJOHURISË</div>
        <nav className={s.sectionNav} aria-label="Seksionet e maroBrain">{sections.map((item) => {
          const Icon = icons[item.id];
          return <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon size={18} /><span>{item.label}</span><small>{score.sections[item.id] === 100 ? <Check size={14} /> : `${score.sections[item.id]}%`}</small></button>;
        })}</nav>
        <button className={s.sideTest} type="button" onClick={showTest}><Sparkles size={16} /> Testo maroBrain <ArrowDown size={14} /></button>
        <div className={s.sidebarNote}><span className={s.noteSymbol}>✳</span><h3>Çdo detaj lidhet.</h3><p>Një brand më i qartë.<br />Një ide më e jotja.</p><span className={s.noteLine} /></div>
        <div className={s.localNote}><span className={s.smallDot} /> Sandbox personal<p>{draft.origin === "workspace" ? "Profili NOMA është lexuar si kopje. Ndryshimet mbeten vetëm këtu." : "Fixture NOMA nga Case Study, me shembuj shtesë për këtë eksperiment."}</p></div>
        <button type="button" className={s.reset} disabled={!ready} onClick={() => setResetPending(!resetPending)}><RotateCcw size={12} /> Rifillo demonstrimin</button>
        {resetPending && <div className={s.resetConfirm}><p>Të zëvendësohet vetëm drafti i këtij eksperimenti me fixture NOMA?</p><button type="button" onClick={() => { setDraft(fixture()); setResetPending(false); setRevision((n) => n + 1); }}>Po, rifillo</button><button type="button" onClick={() => setResetPending(false)}>Anulo</button></div>}
      </aside>
      <a className={s.mobileBrain} href="#brain-live"><span><Sparkles size={15} /> Brain Strength <strong>{score.total}<small> / 100</small></strong></span><span>Shih lidhjet <ArrowDown size={13} /></span></a>
      <main className={s.main}>
        <div className={s.pageTitle}><div><h1>maroBrain<span> / lab</span></h1><p>Inteligjenca e biznesit tënd, në ndërtim.</p></div><span className={s.saved} role="status"><Check size={13} /> {saved}</span></div>
        <div className={s.sectionIntro}><span className={s.eyebrow}>{copy.eyebrow}</span><h2 ref={heading} tabIndex={-1}>{copy.title}</h2><p>{copy.description}</p></div>
        <fieldset disabled={!ready} className={s.knowledgeArea}>
          <legend className={s.srOnly}>Njohuria e workspace</legend>
          {section !== "sources" && <div key={section} className={s.sectionBody}>
            {section === "brand" && <div className={s.brandSnapshot}><div><span className={s.snapshotEyebrow}>NË QENDËR TË ÇDO IDEJE</span><h3>{draft.knowledge.name || "Brandi yt"}<span>®</span></h3><p>{draft.knowledge.positioning || "Pozicionimi yt fillon këtu."}</p><span className={s.snapshotTag}><span /> {draft.knowledge.category || "Shto kategorinë"}</span></div><div className={s.productPhoto}><Image src={productImage.src} alt={productImage.alt} width={240} height={360} sizes="170px" priority /><span>CASE STUDY REFERENCE</span></div></div>}
            <div className={s.cardsLabel}><span>ÇFARË DI MARO</span><span>Kliko një kartë për ta pasuruar <Plus size={12} /></span></div>
            {groups[section].map((group, index) => <KnowledgeCard key={group.id} group={group} index={index} knowledge={draft.knowledge} open={expanded === group.id} onToggle={() => { setExpanded(expanded === group.id ? null : group.id); setRevision((value) => value + 1); }} onUpdate={update} />)}
          </div>}
          <div hidden={section !== "sources"}><KnowledgeVault draft={draft} onAdd={addSource} onRemove={removeSource} /></div>
        </fieldset>
        <section ref={testRef} className={s.testSection} aria-label="Testo maroBrain"><BrainTest knowledge={draft.knowledge} disabled={!ready} /></section>
        <footer className={s.footer}><span>maroBrain / Intelligence Lab</span><span>Vetëm lokalisht. Hapësirë për ide të reja.</span></footer>
      </main>
      <div className={s.panelColumn} id="brain-live"><BrainPanel draft={draft} section={section} revision={revision} onNavigate={navigate} onTest={showTest} /></div>
    </div>
  </div>;
}

function KnowledgeCard({ group, index, knowledge, open, onToggle, onUpdate }: { group: Group; index: number; knowledge: Knowledge; open: boolean; onToggle: () => void; onUpdate: (key: FieldKey, value: string) => void }) {
  const percent = Math.round(group.fields.reduce((sum, spec) => sum + fieldStrength(spec, knowledge[spec.key]), 0) / group.fields.length);
  const summary = group.fields.map((spec) => knowledge[spec.key]).filter(Boolean).join(" · ");
  return <article id={`knowledge-${group.id}`} className={s.knowledgeCard} data-open={open}>
    <button type="button" className={s.cardTrigger} aria-expanded={open} aria-controls={`fields-${group.id}`} onClick={onToggle}>
      <span className={s.cardNumber}>{String(index + 1).padStart(2, "0")}</span>
      <span className={s.cardText}><span className={s.cardTitle}>{group.title}{percent === 100 && <Check size={13} />}</span><span className={summary ? s.cardSummary : s.missingSummary}>{summary || group.note}</span>{group.id === "visuals" && <span className={s.swatches} aria-label="Paletë demonstrimi NOMA"><i /><i /><i /><small>Paletë demo · drejtimi mund të editohet</small></span>}</span>
      <span className={s.cardAction}>{percent === 0 ? <span className={s.missing}>Shto kontekst</span> : null}<ChevronDown size={16} /></span>
    </button>
    {open && <div id={`fields-${group.id}`} className={s.cardFields}><p><Lightbulb size={14} /> {group.note}</p>{group.fields.map((spec) => <label key={spec.key} htmlFor={`field-${spec.key}`}><span>{spec.label}</span>{spec.short ? <Input id={`field-${spec.key}`} className={s.input} value={knowledge[spec.key]} maxLength={12000} onChange={(e) => onUpdate(spec.key, e.target.value)} placeholder={spec.placeholder} /> : <Textarea id={`field-${spec.key}`} className={s.input} rows={3} value={knowledge[spec.key]} maxLength={12000} onChange={(e) => onUpdate(spec.key, e.target.value)} placeholder={spec.placeholder} />}</label>)}<div className={s.cardFoot}><span><Check size={12} /> Ndryshimet ruhen vetëm në demo</span><button type="button" onClick={onToggle}>U krye <ArrowUpRight size={13} /></button></div></div>}
  </article>;
}

function BrainTest({ knowledge, disabled }: { knowledge: Knowledge; disabled: boolean }) {
  const [prompt, setPrompt] = useState("Krijo një ide reklame për NOMA Cold Brew.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ prompt: string; knowledge: Knowledge } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const context: { label: string; key: FieldKey }[] = [{ label: "Brand", key: "about" }, { label: "Audience", key: "audience" }, { label: "Tone", key: "tone" }, { label: "Goals", key: "primaryGoal" }, { label: "Visual identity", key: "visuals" }];
  const activeContext = result?.knowledge || knowledge;
  const stale = result && (JSON.stringify(result.knowledge) !== JSON.stringify(knowledge) || result.prompt !== prompt.trim());
  function run() {
    if (!prompt.trim() || busy) return;
    setBusy(true); setResult(null);
    const snapshot = { prompt: prompt.trim(), knowledge: { ...knowledge } };
    timer.current = setTimeout(() => { setResult(snapshot); setBusy(false); }, 1100);
  }
  return <>
    <div className={s.testHeader}><div className={s.testIcon}><Sparkles size={19} /></div><div><h3>Testo maroBrain</h3><p>Nga njohuria te ideja. Shihe lidhjen.</p></div><span className={s.simulatedBadge}>SIMULIM</span></div>
    <form onSubmit={(e) => { e.preventDefault(); run(); }}><label htmlFor="brain-test-prompt" className={s.srOnly}>Kërkesa për maroBrain</label><Textarea id="brain-test-prompt" className={s.testPrompt} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} maxLength={1000} /><div className={s.testActions}><span>Preview i kontekstit · pa AI / pa kredite</span><Button type="submit" className={s.primaryButton} disabled={disabled || !prompt.trim()} loading={busy} iconRight={<ArrowRight size={16} />}>{busy ? "Duke lidhur kontekstin…" : "Provoje"}</Button></div></form>
    <div className={s.contextUsed}><span>BRAIN CONTEXT {result ? "USED" : "AVAILABLE"}</span><div>{context.map(({ label, key }) => <details key={key} data-available={!!activeContext[key].trim()}><summary>{activeContext[key].trim() ? <Check size={11} /> : <Plus size={11} />}{label}</summary><p>{activeContext[key] || "Shto kontekst në këtë shtresë për ta përfshirë."}</p></details>)}</div></div>
    <div role="status" aria-live="polite">{result && <div className={s.testResult}><span className={s.eyebrow}>PREVIEW I SIMULUAR{stale ? " · KONTEKSTI KA NDRYSHUAR" : " · KONTEKSTI U LIDH"}</span><h4>Një ide që fillon me {result.knowledge.name || "brandin tënd"}.</h4><p><strong>Brief:</strong> {result.prompt}</p><p>Një moment nga dita e {result.knowledge.audience || "audiencës tënde"}. Produkti bëhet pjesë natyrale e ritualit të tyre.</p><div><span><strong>Toni</strong>{result.knowledge.tone || "Ende i papërcaktuar"}</span><span><strong>Drejtimi vizual</strong>{result.knowledge.visuals || "Shto identitetin vizual"}</span></div><p className={s.resultGoal}><Flag size={13} /> {result.knowledge.primaryGoal || "Shto një qëllim për t’i dhënë drejtim kësaj ideje."}</p><small>{stale ? "Provoje sërish për të përdorur ndryshimet e fundit." : "Shembull me template lokal. Një gjenerim real do ta përdorte këtë kontekst për brief-in tënd."}</small></div>}</div>
  </>;
}
