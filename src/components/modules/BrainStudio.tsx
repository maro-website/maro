"use client";
import * as React from "react";
import { Fingerprint, Users, Target, Globe, MessageCircle, Images, NotebookPen, ArrowUpRight, RotateCcw, Trash2, Check } from "lucide-react";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { Button } from "@/components/ui/Button";
import { MARO_PRODUCTS } from "@/lib/design/maro-system";
import { BRAIN_TABS, type BrainTabId, type WorkspaceBrainProfile, type WorkspaceSource } from "@/lib/workspaces/brainTypes";
import { brainProgress } from "@/lib/workspaces/brainProfile";
import { activeMemories, type BrainMemory } from "@/lib/brain-studio/memories";
import { requestMemories } from "@/lib/brain-studio/client";
import { sectionFields, studioLabels } from "@/lib/brain-studio/prompts";
import { FetchBrandPilot } from "./FetchBrandPilot";
import { BrainPromptAssist } from "./BrainPromptAssist";
import { BrainMemories } from "./BrainMemories";
import { BrainIdentity, BrainDetails } from "./BrainIdentity";
import { BrainLibrary } from "./BrainLibrary";
import { BrainLogo } from "./BrainLogo";
import { BrainClearDialog } from "./BrainClearDialog";
import type { BrainClearSection } from "@/lib/brain-studio/operations";
import { hasBrandImport, compactBrandLocation } from "@/lib/brain-studio/presentation";
import styles from "./BrainStudio.module.css";

export type StudioTab = BrainTabId | "memories";
const icons = { brand: Fingerprint, target: Users, goal: Target, market: Globe, content: MessageCircle, sources: Images, memories: NotebookPen };
export interface BrainStudioProps {
  profile: WorkspaceBrainProfile; setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>;
  workspaceId: string; workspaceName: string; workspaces: { id: string; name: string }[]; onWorkspaceChange: (id: string) => void;
  resetAt: string | null; sources: WorkspaceSource[]; loading: boolean; loadError: string | null; onRetry: () => void;
  saving: boolean; saveError: string | null; onSave: () => void; onClear: (section: BrainClearSection) => Promise<void>;
  userId: string; onRefreshSources: () => Promise<void>; clearing: boolean;
  tab: StudioTab; onTabChange: (tab: StudioTab) => void;
  renderTab: (tab: BrainTabId) => React.ReactNode;
}
export function BrainStudio(props: BrainStudioProps) {
  const { profile, setProfile, workspaceId, sources } = props;
  const tab = props.tab, setTab = props.onTabChange;
  const [memories, setMemories] = React.useState<BrainMemory[]>([]);
  const [memoryLoading, setMemoryLoading] = React.useState(true);
  const [memoryError, setMemoryError] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);
  const [clearSection, setClearSection] = React.useState<BrainClearSection | null>(null);
  const [libraryBusy, setLibraryBusy] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController(); setMemoryLoading(true); setMemoryError("");
    void requestMemories(workspaceId, undefined, controller.signal).then(items => { if (!controller.signal.aborted) setMemories(items); }).catch(cause => { if (!controller.signal.aborted) setMemoryError(cause instanceof Error ? cause.message : "Memorjet nuk u ngarkuan."); }).finally(() => { if (!controller.signal.aborted) setMemoryLoading(false); });
    return () => controller.abort();
  }, [workspaceId, props.resetAt, attempt]);
  const progress = brainProgress(profile, sources.length);
  const b = profile.brand;
  const tabs: { id: StudioTab; label: string }[] = [...BRAIN_TABS.map(item => ({ id: item.id, label: studioLabels[item.id] })), { id: "memories", label: "Memorjet" }];
  const count = (id: StudioTab) => {
    if (id === "memories") return memoryError ? "—" : memoryLoading ? "…" : String(activeMemories(memories).length);
    if (id === "sources") return String(sources.length);
    const fields = sectionFields[id].filter(([key]) => key !== "phoneCountry"); const values = profile[id] as unknown as Record<string, unknown>;
    return `${fields.filter(([key]) => String(values[key] ?? "").trim()).length + (id === "brand" && profile.brand.logoUrl ? 1 : 0)}/${fields.length + (id === "brand" ? 1 : 0)}`;
  };
  const next = BRAIN_TABS.find(item => item.id !== "sources" && count(item.id).startsWith("0/"))?.id ?? "sources";
  const facts = [{ id: "target" as const, label: "Audienca", value: profile.target.demographics || profile.target.audience, empty: "Shto audiencën" }, { id: "content" as const, label: "Toni", value: profile.content.tone || profile.content.voice, empty: "Shto tonin" }, { id: "goal" as const, label: "Qëllimi", value: profile.goal.primaryGoal, empty: "Shto qëllimin" }];
  return <div className={styles.studio} style={{ "--brain-accent": MARO_PRODUCTS.maroBrain.color } as React.CSSProperties} data-brain-studio="private">
    <header className={styles.header}><div className={styles.mastheadCopy}><span className={styles.privateBadge}>Pilot privat</span><h1><ProductLogo product="maroBrain" className={styles.mastheadLogo} /></h1><p>Njoftoje Maro-n me brendin tënd.</p><div className={styles.saveStatus}><span role="status" className={props.saveError ? "text-sm text-danger" : styles.hint}>{props.saveError || (props.saving ? "Duke ruajtur…" : <><Check size={14} aria-hidden="true"/>Ruhet automatikisht</>)}</span>{props.saveError && <Button variant="secondary" loading={props.saving} onClick={props.onSave}>Provo ruajtjen përsëri</Button>}</div></div><div className={styles.mastheadArt} aria-hidden="true"><span className={styles.orbitRing}/><span className={styles.orbitRing}/><svg viewBox="0 0 340 180" fill="none"><path d="M14 42H82Q108 42 126 66L170 90M0 130H76Q110 130 132 111L170 90M326 33H265Q239 33 220 60L170 90M340 141H262Q231 141 214 117L170 90"/><circle cx="14" cy="42" r="4"/><circle cx="0" cy="130" r="3"/><circle cx="326" cy="33" r="3"/><circle cx="340" cy="141" r="4"/></svg>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/new-logos/maroBrain-icon.svg" alt="" width="80" height="80"/><i className={styles.signal}/><i className={styles.signal}/><i className={styles.signal}/></div></header>
    <fieldset className={styles.studioBody} disabled={props.clearing || libraryBusy}>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><label className={styles.workspace}><span>Workspace</span><select className="maro-input" value={workspaceId} disabled={libraryBusy} onChange={event => props.onWorkspaceChange(event.target.value)}>{props.workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><nav className={styles.sectionNav} aria-label="Seksionet e maroBrain">{tabs.map(item => { const Icon = icons[item.id]; return <button type="button" key={item.id} disabled={libraryBusy} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}><Icon size={18} aria-hidden="true" /><span>{item.label}</span><small>{count(item.id)}</small></button>; })}</nav><div className={styles.sidebarProgress}><div className={styles.row}><span>Profili yt</span><strong>{progress}%</strong></div><div className={styles.progress}><span style={{ width: `${progress}%` }} /></div><Button variant="ghost" disabled={libraryBusy} onClick={() => setTab(next)}>Vazhdo te {studioLabels[next].toLowerCase()}<ArrowUpRight size={14} /></Button></div><Button className={styles.restartButton} variant="ghost" icon={<RotateCcw size={14}/>} onClick={() => setClearSection('all')} disabled={props.loading || !!props.loadError || libraryBusy}>Nisja prej fillimit</Button></aside>
      <main className={styles.main}>
        {props.loading ? <p role="status" className={styles.hint}>Duke ngarkuar maroBrain…</p> : props.loadError ? <div role="alert"><p className="text-sm text-danger">{props.loadError}</p><Button variant="secondary" onClick={props.onRetry}>Provo përsëri</Button></div> : <>
          <section className={styles.hero} aria-label="Përmbledhja e brendit"><div className={styles.heroIdentity}><div className={styles.brandIdentity}><button type="button" className={styles.heroLogo} disabled={libraryBusy} onClick={() => setTab("brand")} aria-label="Hap identitetin e brendit"><BrainLogo src={b.logoUrl} backdrop={b.logoBackdrop} compact/></button><div><h2>{b.name || props.workspaceName}</h2><p title={compactBrandLocation(profile)}>{compactBrandLocation(profile) || "Shto identitetin e brendit"}</p></div></div><div className={styles.paletteRow}><div className={styles.palette} aria-label="Ngjyrat e brendit">{b.colors?.map(color => <span key={color} style={{ backgroundColor: color }} title={color} />)}</div><span>{sources.length} referenca · {activeMemories(memories).length} memorje</span><strong>{progress}%</strong></div><div className={styles.progress} role="progressbar" aria-label="Plotësimi i profilit" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></div>
            <div className={styles.memoryMap}><svg key={tab} className={styles.wires} viewBox="0 0 76 140" preserveAspectRatio="none" aria-hidden="true">{["M0 70 C32 70 24 22 64 22", "M0 70 H76", "M0 70 C32 70 24 118 64 118"].map((path,index) => <React.Fragment key={path}><path className={styles.rail} d={path}/><path className={styles.trace} pathLength={1} data-active={tab === "brand" || tab === facts[index].id} d={path}/></React.Fragment>)}<circle className={styles.junction} cx="0" cy="70" r="3"/></svg>{facts.map(item => { const Icon = icons[item.id]; return <button type="button" className={styles.fact} key={item.id} data-fact={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)} aria-label={`${item.label}: ${item.value || item.empty}`} title={item.value || item.empty}><Icon size={16} aria-hidden="true" /><span><small>{item.label}</small><strong>{item.value || item.empty}</strong></span></button>; })}</div></section>
          <BrainFetchStart key={`${workspaceId}:${props.resetAt}`} workspaceId={workspaceId} profile={profile} setProfile={setProfile}/>
          <section className={styles.editor} aria-label={tab === "memories" ? "Memorjet" : studioLabels[tab]}>
            {tab === "memories" ? <BrainMemories workspaceId={workspaceId} resetAt={props.resetAt} memories={memories} onChange={setMemories} loading={memoryLoading} error={memoryError} onRefresh={() => setAttempt(value => value + 1)} /> : <><BrainPromptAssist key={tab} section={tab} profile={profile} setProfile={setProfile} memories={memoryError ? [] : memories} />{memoryError && <p role="status" className={styles.hint}>Memorjet nuk u ngarkuan; prompti përfshin vetëm profilin. <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>Provo përsëri</button></p>}<div className={styles.fields}>{tab === 'brand' ? <BrainIdentity profile={profile} setProfile={setProfile} workspaceId={workspaceId} onBusy={setLibraryBusy}/> : tab === 'sources' ? <BrainLibrary userId={props.userId} workspaceId={workspaceId} resetAt={props.resetAt} sources={sources} onRefresh={props.onRefreshSources} onBusy={setLibraryBusy}/> : <BrainDetails section={tab} profile={profile} setProfile={setProfile}/>}</div></>}
            <div className={styles.clearSection}><span>{tab === 'memories' ? 'Pastro memorjet e këtij workspace-i.' : `Pastro vetëm seksionin “${studioLabels[tab]}”.`}</span><Button variant="ghost" icon={<Trash2 size={14}/>} disabled={libraryBusy} onClick={() => setClearSection(tab)}>Pastro këtë seksion</Button></div>
          </section><p className={styles.footnote}>maroBrain përdoret kur e aktivizon si kontekst në Imazh. Memorjet përkatëse përfshihen edhe në promptet që kopjon.</p>
        </>}
      </main>
    </div></fieldset>
    <BrainClearDialog section={clearSection} onClose={() => setClearSection(null)} onConfirm={props.onClear}/>
  </div>;
}

function BrainFetchStart({ workspaceId, profile, setProfile }: Pick<BrainStudioProps, "workspaceId" | "profile" | "setProfile">) {
  const [open, setOpen] = React.useState(() => !hasBrandImport(profile));
  const summary = React.useRef<HTMLElement>(null);
  return <details className={styles.fetch} open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary ref={summary}>Fillo nga website-i <span>Fetch Brand <ArrowUpRight size={14}/></span></summary><div><FetchBrandPilot workspaceId={workspaceId} profile={profile} setProfile={setProfile} onApplied={() => { setOpen(false); requestAnimationFrame(() => summary.current?.focus()); }}/></div></details>;
}
