"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Check, Grid3X3, ImagePlus, LoaderCircle, RefreshCw, Sparkles, X, History, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { IMAGE_REFERENCE_ACCEPT, createPrivateImageAttachment, uploadOrResolvePrivateAttachment, type PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import { canUseFeed, roles, contentLabels, feedRole, FEED_MAX_REFERENCES, type FeedContentType, type FeedBrief, type FeedCategory, type FeedView, type FeedHistoryItem } from "@/lib/feed/model";
import { downloadFeed, feedJson, feedMessage, feedStep } from "@/lib/feed/client";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./FeedWorkspace.module.css";
import { AppsPreparation, appDraftPayload, initialAppDraft } from "@/components/apps/AppsPreparation";
import { appRole, appFormats, canUseApps } from "@/lib/apps/model";
import { marketingJson, marketingMessage } from "@/lib/marketing/client";
import type { MarketingCampaign } from "@/lib/marketing/model";
import { feedFormats } from "@/lib/feed/campaign";
import { draftFeedDesign, initialFeedDesign, readyFeedDesign } from "./FeedBrandSettings";
import { FeedHero } from "./FeedHero";
import { FeedPreparation, type FeedBrainState } from "./FeedPreparation";
import { FeedResults, FeedLibrary } from "./FeedResults";
import { useFeedPreparation } from "./useFeedPreparation";
import { fetchBrainProfile } from "@/lib/workspaces/brainService";
import { FeedBrainPicker } from "./FeedBrainPicker";
import { mergeFeedBrainAssets, type FeedBrainSelection } from "@/lib/feed/brainAssets";

export function FeedWorkspace({ studio = "feed", marketingCampaignId, onMarketingImport }: { studio?: "feed" | "apps"; marketingCampaignId?: string; onMarketingImport?: (feedId: string, studio: "feed" | "apps") => Promise<void> }) {
  const { user, ready } = useMaro(); const { activeWorkspace } = useWorkspace();
  if (!ready) return <div className={s.notice}>Duke hapur studion…</div>;
  if (!(studio === "apps" ? canUseApps : canUseFeed)(user?.email)) return <div className={s.notice}><Grid3X3 size={32} /><h1>{studio === "apps" ? "maroApps" : "maroFeed"}</h1><p>Në pilot privat. Diçka e mirë po përgatitet.</p><Link href="/">Kthehu në maro</Link></div>;
  if (!activeWorkspace) return <div className={s.notice}>Duke hapur workspace…</div>;
  return <FeedStudio key={`${studio}:${user!.id}:${activeWorkspace.id}:${marketingCampaignId ?? "standalone"}`} workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} studio={studio} marketingCampaignId={marketingCampaignId} onMarketingImport={onMarketingImport} />;
}
type History = FeedHistoryItem;
const initialBrief: FeedBrief = { brand: "", description: "", audience: "", goal: "sales", language: "sq", colors: "", notes: "" };
function FeedStudio({ workspaceId, workspaceName, studio, marketingCampaignId, onMarketingImport }: { workspaceId: string; workspaceName: string; studio: "feed" | "apps"; marketingCampaignId?: string; onMarketingImport?: (feedId: string, studio: "feed" | "apps") => Promise<void> }) {
  const apps = studio === "apps", api = `/api/${studio}`;
  const [appDraft, setAppDraft] = React.useState(initialAppDraft);
  const { user, credits, refreshProfile } = useMaro();
  const userId = user!.id;
  const [tab, setTab] = React.useState<"prepare" | "feed" | "history">("prepare");
  const [brief, setBrief] = React.useState(initialBrief); const [brain, setBrain] = React.useState(false);
  const [brainState, setBrainState] = React.useState<FeedBrainState>({ loading: false, ready: false });
  const languageTouched = React.useRef(false);
  const [category, setCategory] = React.useState<FeedCategory>("drinks");
  const [attachments, setAttachments] = React.useState<PrivateImageAttachment[]>([]);
  const attachmentRef = React.useRef<PrivateImageAttachment[]>([]);
  const [uploadBusy, setUploadBusy] = React.useState(false);
  const [contentType, setContentType] = React.useState<FeedContentType>("mix");
  const [textMode, setTextMode] = React.useState(true);
  const [designDraft, setDesignDraft] = React.useState(initialFeedDesign);
  const draftDesign = draftFeedDesign(designDraft, attachments);
  const designReady = readyFeedDesign(designDraft, draftDesign);
  const [cancelling, setCancelling] = React.useState(false);
  const stopFeed = React.useRef<string | null>(null);
  const attachment = attachments[0];
  const [feed, setFeed] = React.useState<FeedView | null>(null); const [history, setHistory] = React.useState<History[]>([]);
  const [loading, setLoading] = React.useState(true); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState("");
  const [planning, setPlanning] = React.useState(false); const [headline, setHeadline] = React.useState("");
  const [marketingReady, setMarketingReady] = React.useState(!marketingCampaignId);
  const [marketingImportBusy, setMarketingImportBusy] = React.useState(false);
  const [selected, setSelected] = React.useState<number | null>(null); const [feedback, setFeedback] = React.useState(""); const [downloading, setDownloading] = React.useState(false);
  const [activeSlot, setActiveSlot] = React.useState<number | null>(null);
  const alive = React.useRef(true), lock = React.useRef(false), createId = React.useRef("");
  const currentFeed = React.useRef<FeedView | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (selected === null) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key !== "Tab") return;
      const nodes = [...document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled),[role="dialog"] textarea:not(:disabled)')];
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [selected]);
  const patch = (key: keyof FeedBrief, value: string) => { if (key === "language") languageTouched.current = true; setBrief(b => ({ ...b, [key]: value })); };
  const remember = React.useCallback((value: FeedView, open = true) => {
    if (!alive.current) return;
    const previous = currentFeed.current;
    if (previous?.id === value.id && value.tiles.some(tile => tile.version > previous.tiles[tile.slot].version)) setError("");
    currentFeed.current = value;
    setHistory(rows => {
      const entry: History = { id: value.id, name: value.design?.name, format: value.design?.format, contentType: value.contentType, brand: value.brand, createdAt: value.createdAt, refunded: value.refunded, cancelled: value.cancelled, done: value.tiles.filter(tile => tile.url).length, cover: value.tiles.find(tile => tile.url)?.url, running: Boolean(value.active) };
      return [...rows.filter(row => row.id !== value.id), entry].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
    if (open) setTab("feed");
    setFeed(value); if (open && !marketingCampaignId) { const url = new URL(window.location.href); url.searchParams.set("feed", value.id); window.history.replaceState(null, "", url); }
  }, [marketingCampaignId]);
  const preparationState = { brief, brain, category, contentType, textMode, designDraft, attachments };
  const preparation = useFeedPreparation({ enabled: !apps && !marketingCampaignId, userId: user!.id, workspaceId, state: preparationState,
    restore: (saved, restored) => { setBrief(saved.brief); setBrain(saved.brain); setCategory(saved.category); setContentType(saved.contentType); setTextMode(saved.textMode); setDesignDraft(saved.designDraft); updateAttachments(restored); languageTouched.current = true; },
    recovered: value => { remember(value); createId.current = ""; void refreshProfile(); }, error: setError,
  });
  React.useEffect(() => {
    if (apps || !brain) { setBrainState({ loading: false, ready: false }); return; }
    let active = true; setBrainState({ loading: true, ready: false });
    void fetchBrainProfile(userId, workspaceId).then(profile => {
      if (!active) return;
      const name = profile.brand.name ?? "", description = profile.brand.description ?? "";
      setBrainState({ loading: false, ready: Boolean(name.trim() && description.trim().length >= 8), name, description });
      if (!languageTouched.current) setBrief(value => ({ ...value, language: /english|anglisht|^en$/i.test(profile.brand.language ?? "") ? "en" : "sq" }));
    }).catch(error => { if (active) setBrainState({ loading: false, ready: false, error: feedMessage(error.message) }); });
    return () => { active = false; };
  }, [apps, brain, userId, workspaceId]);

  React.useEffect(() => {
    if (!marketingCampaignId) return;
    let live = true;
    void marketingJson<{ campaign: MarketingCampaign }>(`/api/marketing?workspaceId=${encodeURIComponent(workspaceId)}&campaignId=${marketingCampaignId}`).then(({ campaign }) => {
      if (!live || !campaign.plan) return;
      const next: FeedBrief = { ...initialBrief, brand: campaign.brand, description: campaign.brief.focus, goal: campaign.brief.goal === "launch" ? "launch" : campaign.brief.goal === "engagement" ? "engagement" : "sales", language: campaign.brief.language, notes: campaign.brief.offer };
      setBrief(next); setBrain(true); setAppDraft(d => ({ ...d, brief: next, useBrain: true })); setMarketingReady(true);
    }).catch(e => { if (live) setError(marketingMessage(e.message)); });
    return () => { live = false; };
  }, [marketingCampaignId, workspaceId]);
  React.useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const data = await feedJson<{ feeds: History[] }>(`${api}?workspaceId=${encodeURIComponent(workspaceId)}${marketingCampaignId ? `&marketingCampaignId=${marketingCampaignId}` : ""}`);
        if (!live) return; setHistory(data.feeds);
        const requested = new URL(window.location.href).searchParams.get("feed");
        const id = data.feeds.find(f => f.id === requested)?.id ?? (apps ? data.feeds.find(f => !f.refunded)?.id : undefined);
        if (id) { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${id}`); if (live) remember(data.feed); }
      } catch (err) { if (live) setError(feedMessage((err as Error).message)); }
      finally { if (live) setLoading(false); }
    })(); return () => { live = false; };
  }, [workspaceId, remember, api, marketingCampaignId, apps]);
  React.useEffect(() => {
    if (!feed?.active || busy) return;
    const timer = setInterval(() => { void feedJson<{ feed: FeedView }>(`${api}?feedId=${feed.id}`).then(data => { if (alive.current) remember(data.feed, false); }).catch(() => undefined); }, 6000);
    return () => clearInterval(timer);
  }, [feed?.id, feed?.active, busy, remember, api]);
  function updateAttachments(value: PrivateImageAttachment[]) { attachmentRef.current = value; setAttachments(value); }
  function addBrainReferences(selection: FeedBrainSelection[]) {
    if (working || uploadBusy) return;
    const { attachments: merged, additions } = mergeFeedBrainAssets(attachmentRef.current, selection);
    updateAttachments(merged);
    setDesignDraft(draft => ({ ...draft, assignments: undefined, assets: { ...draft.assets, ...Object.fromEntries(additions.map(({ attachment, role }) => [attachment.id, { role, label: attachment.name.slice(0, 100) }])) } }));
  }
  async function upload(files: File[]) {
    if (!files.length || busy || uploadBusy) return;
    if (attachmentRef.current.length + files.length > FEED_MAX_REFERENCES) { setError(feedMessage("too_many_references")); return; }
    setError(""); setUploadBusy(true);
    const items = files.map(file => createPrivateImageAttachment(file, crypto.randomUUID(), true));
    setDesignDraft(draft => ({ ...draft, assignments: undefined }));
    updateAttachments([...attachmentRef.current, ...items]);
    for (const item of items) {
      if (item.error) continue;
      let ready: PrivateImageAttachment;
      try { ready = await uploadOrResolvePrivateAttachment(item); }
      catch { ready = { ...item, status: "upload-error", error: "Ngarkimi nuk u përfundua. Hiqe dhe provo përsëri." }; }
      if (alive.current) updateAttachments(attachmentRef.current.map(current => current.id === ready.id ? ready : current));
    }
    if (alive.current) setUploadBusy(false);
  }
  async function retryPreview(id: string) {
    const item = attachmentRef.current.find(value => value.id === id); if (!item?.storageRef || busy || uploadBusy) return;
    setUploadBusy(true);
    try { const restored = await uploadOrResolvePrivateAttachment(item); if (alive.current) updateAttachments(attachmentRef.current.map(value => value.id === id ? restored : value)); }
    finally { if (alive.current) setUploadBusy(false); }
  }
  function previewError(id: string, url: string) {
    if (!alive.current) return;
    updateAttachments(attachmentRef.current.map(item => item.id === id && item.previewUrl === url && item.status === "ready" ? { ...item, status: "preview-error", error: "Pamja private nuk u hap. Rihape foton." } : item));
  }
  function resetPreparation() {
    if (busy || preparation.pending) return;
    preparation.clear(); updateAttachments([]); setBrief(initialBrief); setBrain(false); setCategory("drinks"); setContentType("mix"); setTextMode(true); setDesignDraft(initialFeedDesign); setError(""); languageTouched.current = false; createId.current = "";
  }
  function openPreparation() {
    setTab("prepare");
    if (!apps && !marketingCampaignId) { const url = new URL(window.location.href); url.searchParams.delete("feed"); window.history.replaceState(null, "", url); }
  }
  async function complete(value: FeedView) {
    let current = value;
    while (alive.current && !current.refunded && !current.cancelRequested && !current.cancelled && stopFeed.current !== current.id && current.tiles.some(t => !t.url)) {
      if (current.active) { remember(current); return; }
      const slot = current.tiles.find(t => !t.url)!.slot; setActiveSlot(slot);
      const result = await feedStep({ feedId: current.id, requestId: crypto.randomUUID(), action: "next" }, studio);
      if (result.feed) { current = result.feed; remember(current); }
      if (result.error && !current.cancelRequested && !current.cancelled && stopFeed.current !== current.id) throw new Error(result.error);
      if (!result.feed) throw new Error("recovery_pending");
    }
  }
  async function run(work: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { await work(); }
    catch (err) {
      if (err instanceof Error && ["feed_plan_invalid", "optimizer_unavailable", "optimizer_input_too_long", "optimizer_budget_limit"].includes(err.message)) createId.current = "";
      if (alive.current) {
        setError(feedMessage((err as Error).message));
        // A lost response can still have completed server work. Refresh before offering another paid action.
        if (currentFeed.current) {
          try { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${currentFeed.current.id}`); remember(data.feed, false); }
          catch { /* Keep the saved feed and error available for an explicit refresh. */ }
        }
      }
    }
    finally { lock.current = false; if (alive.current) { setBusy(false); setActiveSlot(null); void refreshProfile(); } }
  }
  async function start() {
    if (!marketingReady || (!apps && (!preparation.ready || preparation.checking))) return;
    await run(async () => {
      if (!apps && (!attachments.length || attachments.some(item => !item.storageRef || item.status !== "ready"))) throw new Error("brief_incomplete");
      if (!apps && !designReady) throw new Error("design_incomplete");
      stopFeed.current = null;
      if (!apps && !marketingCampaignId) createId.current = preparation.begin(preparationState);
      else createId.current ||= crypto.randomUUID();
      if (!apps) setPlanning(true);
      const data = await feedJson<{ feed: FeedView }>(api, { requestId: createId.current, workspaceId, ...(marketingCampaignId ? { marketingCampaignId } : {}),
        ...(apps ? appDraftPayload(appDraft) : { references: attachments.map(item => item.storageRef!), contentType, textMode, category, useBrain: brain, design: draftDesign }), brief: apps ? appDraft.brief : brain ? { goal: brief.goal, language: brief.language, notes: brief.notes, ...(brief.colors ? { colors: brief.colors } : {}) } : brief }).catch(error => { if (!apps && !marketingCampaignId) preparation.failed(); throw error; }).finally(() => { if (alive.current) setPlanning(false); });
      remember(data.feed); createId.current = ""; if (!apps && !marketingCampaignId) preparation.finish();
      void refreshProfile(); await complete(data.feed);
    });
  }
  async function cancelFeed() {
    if (!feed || cancelling) return;
    stopFeed.current = feed.id; setCancelling(true); setError("");
    try {
      const data = await feedJson<{ feed: FeedView }>(`${api}/action`, { feedId: feed.id, requestId: crypto.randomUUID(), action: "cancel" });
      remember(data.feed); void refreshProfile();
    } catch (err) { setError(feedMessage((err as Error).message)); }
    finally { if (alive.current) setCancelling(false); }
  }
  async function regenerate() {
    if (!feed || selected === null) return;
    await run(async () => {
      setActiveSlot(selected); const result = await feedStep({ feedId: feed.id, requestId: crypto.randomUUID(), action: "regenerate", slot: selected, feedback, ...(!apps && feed.textMode && feed.tiles[selected].headline !== undefined ? { headline } : {}) }, studio);
      if (result.feed) remember(result.feed); if (result.error) throw new Error(result.error); setFeedback("");
    });
  }
  async function download(slot?: number) {
    if (!feed) return; setDownloading(true); setError("");
    try { await downloadFeed(feed.id, slot, studio); } catch (err) { setError(feedMessage((err as Error).message)); } finally { setDownloading(false); }
  }
  const done = feed?.tiles.filter(t => t.url).length ?? 0; const completeFeed = done === 9;
  const working = busy || Boolean(feed?.active) || !marketingReady || (!apps && (!preparation.ready || preparation.checking)); const active = activeSlot ?? feed?.active?.slot;
  const free = Math.max(0, 3 - (feed?.freeUsed ?? 0));
  const stopped = Boolean(feed?.cancelled || feed?.cancelRequested || feed?.refunded);
  const tiles: FeedView["tiles"] = feed?.tiles ?? roles.map((_, slot) => ({ slot, title: (apps ? appRole(slot, appDraft.contentType) : feedRole(slot, contentType)).title, url: null, version: 0 }));
  return <div className={`${b.studio} ${s.studio}`}>
    {apps ? <header className={s.lead}>
      <div><h1 className={s.wordmark} aria-label={apps ? "maroApps" : "maroFeed"}><Logo showWord wordClassName={s.maroWord} /><span>{apps ? "Apps" : "Feed"}</span></h1><h2>{apps ? "App-i yt. Reklama që e tregojnë." : "Nga referencat, te feed-i yt."}</h2><p>{apps ? "Screenshot-et e tua, pajisjet e fundit dhe drejtimi yt kreativ. Maro i lidh në një fushatë." : "Ti zgjedh drejtimin. Maro i lidh 9 postimet me brendin tënd."}</p></div>
      <div className={s.leadSteps} aria-label={apps ? "Si funksionon maroApps" : "Si funksionon maroFeed"}><span><ImagePlus size={20} /><small>01</small><strong>Ngarko</strong></span><span><SlidersHorizontal size={20} /><small>02</small><strong>Zgjedh</strong></span><span><Grid3X3 size={20} /><small>03</small><strong>Maro</strong></span></div>
    </header> : <FeedHero attachments={tab === "prepare" ? attachments : []} design={draftDesign} />}
    {marketingCampaignId && <div className={b.assistBar}><Sparkles size={20} /><div><strong>Imazhet e fushatës maroMarketing</strong><p>Çdo imazh ndjek postimin përkatës të planit. Ngarko produktin ose screenshot-et reale; pastaj ktheji imazhet te postimet për rishikim.</p></div>{done > 0 && onMarketingImport && <Button variant="brand" loading={marketingImportBusy} disabled={working} onClick={async () => { if (!feed) return; setMarketingImportBusy(true); try { await onMarketingImport(feed.id, studio); } catch (e) { setError(marketingMessage((e as Error).message)); } finally { if (alive.current) setMarketingImportBusy(false); } }}>Shto {done} imazhe te plani</Button>}</div>}
    <div className={b.layout}>
      <aside className={b.sidebar}>
        <div className={b.workspace}><span>Workspace</span><div className={`maro-input ${s.workspaceName}`}>{workspaceName}</div></div>
        <nav className={b.sectionNav} aria-label={apps ? "Seksionet e maroApps" : "Seksionet e maroFeed"}>
          <button type="button" disabled={working || uploadBusy} aria-current={tab === "prepare" ? "page" : undefined} onClick={() => { setTab("prepare"); if (!apps && !marketingCampaignId) { const url = new URL(window.location.href); url.searchParams.delete("feed"); window.history.replaceState(null, "", url); } }}><SlidersHorizontal size={18} /><span>Përgatitja</span></button>
          <button type="button" disabled={working || uploadBusy} aria-current={(apps ? tab === "feed" : tab === "history") ? "page" : undefined} onClick={() => setTab(apps ? "feed" : "history")}><Grid3X3 size={18} /><span>{apps ? "Reklamat e tua" : "Feed-at e tu"}</span><small>{apps ? `${done}/9` : history.length}</small></button>
          {!apps && feed && <button type="button" disabled={working || uploadBusy} aria-current={tab === "feed" ? "page" : undefined} onClick={() => setTab("feed")}><ImageIcon size={18} /><span>Feed-i aktual</span><small>{done}/9</small></button>}
          {apps && <button type="button" disabled={working || uploadBusy} aria-current={tab === "history" ? "page" : undefined} onClick={() => setTab("history")}><History size={18} /><span>Historiku</span><small>{history.length}</small></button>}
        </nav>
        <div className={b.sidebarProgress}><div className={b.row}><span>Postime të përfunduara</span><strong>{done}/9</strong></div><div className={b.progress}><span style={{ width: `${done / 9 * 100}%` }} /></div><p className={s.sidebarNote}>{apps ? "3 rigjenerime falas për fushatë." : "3 rigjenerime falas për feed."}<br />Pastaj 5 credits secili.</p></div>
      </aside>
      <main className={b.main}>
        {apps && <section className={apps ? b.hero : s.feedSummary} aria-label="Përmbledhja e feed-it">
          <div className={b.brandIdentity}><div className={b.heroLogo}>{attachment?.previewUrl ? <img src={attachment.previewUrl} alt="Produkti i ngarkuar" /> : <Grid3X3 size={24} />}</div><div><h2>{feed?.brand || (apps ? appDraft.brief.brand : brief.brand) || workspaceName}</h2><p>{apps ? "Fushatë për mobile app" : brain ? "Me kontekst nga maroBrain" : "Me informatat e brendit tënd"}</p></div></div>
          <div className={s.summary}><span>{feed?.cancelled ? `U ndal · ${done} imazhe` : feed?.cancelRequested ? "Po ndalet pas imazhit aktual…" : working ? "Po krijohet, një nga një…" : completeFeed ? (apps ? "Reklamat janë gati." : "Feed-i është gati.") : feed?.refunded ? "Credits u kthyen." : (apps ? `9 reklama · ${feed?.mobile?.format ?? appDraft.mobile.format}` : `9 imazhe · ${feed?.design?.format ?? "1:1"}`)}</span><strong>{done}/9</strong></div>
        </section>}
        {error && (apps || tab !== "prepare") && <div className={s.error} role="alert"><p>{error}</p><Button variant="ghost" size="icon" aria-label="Mbylle mesazhin" onClick={() => setError("")}><X size={16} /></Button></div>}
        {tab === "prepare" && <section className={b.editor} aria-label="Përgatitja e feed-it">
          <div className={b.sectionHeading}><div><h2>{apps ? "Përgatite fushatën e app-it" : "Përgatite feed-in"}</h2><p>{apps ? "Prej ndërfaqes reale, te reklama jote e ardhshme." : "Ngarko produktin dhe shto informatat që na duhen për brendin."}</p></div></div>
          {apps ? <AppsPreparation draft={appDraft} setDraft={setAppDraft} working={working} loading={loading} credits={credits} start={() => void start()} onUploadBusy={setUploadBusy} /> : <>
          <input ref={fileInput} type="file" multiple accept={IMAGE_REFERENCE_ACCEPT} className={s.hidden} onChange={event => { void upload(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          <FeedPreparation workspaceName={workspaceName} attachments={attachments} draft={designDraft} setDraft={setDesignDraft} designReady={designReady}
            remove={id => { updateAttachments(attachmentRef.current.filter(item => item.id !== id)); setDesignDraft(value => ({ ...value, assignments: undefined })); }} retry={id => void retryPreview(id)} previewError={previewError}
            pickFiles={() => fileInput.current?.click()} upload={files => void upload(files)} brainPicker={<FeedBrainPicker userId={user!.id} workspaceId={workspaceId} workspaceName={workspaceName} disabled={working || uploadBusy || Boolean(preparation.pending)} existingRefs={attachments.map(item => item.storageRef).filter((ref): ref is string => Boolean(ref))} attachmentCount={attachments.length} hasLogo={draftDesign.assets.some(asset => asset.role === "logo")} onAdd={addBrainReferences} />} uploadBusy={uploadBusy} working={working} loading={loading}
            draftReady={preparation.ready} draftSaved={preparation.saved} planning={planning} credits={credits} brain={brain} setBrain={setBrain} brainState={brainState}
            brief={brief} patch={patch} category={category} setCategory={setCategory} contentType={contentType} setContentType={setContentType} textMode={textMode} setTextMode={setTextMode}
            error={error} dismiss={() => setError("")} pending={preparation.pending} checking={preparation.checking} checkRequest={preparation.check} start={() => void start()} reset={resetPreparation} />
          </>}
        </section>}
        {apps && tab === "feed" && <section className={b.editor} aria-label="Feed-i me nëntë postime">
          {!apps && <div className={s.feedPicker}><Button variant="ghost" size="sm" disabled={working} onClick={() => setTab("history")}>← Feed-at e tu</Button><label className={b.field}><span>Feed-i i zgjedhur</span><select className="maro-input" value={feed?.id ?? ""} disabled={working} onChange={e => void run(async () => { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${e.target.value}`); remember(data.feed); })}>{history.map(item => <option key={item.id} value={item.id}>{item.name || item.brand} · {new Intl.DateTimeFormat("sq", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</option>)}</select></label></div>}
          <div className={b.sectionHeading}><div><h2>{apps ? "Reklamat e tua" : feed?.design?.name || feed?.brand || "Feed-i yt"}</h2><p>{feed?.cancelled ? `U mbajtën ${50 - feed.refundCredits} credits (5 + ${done} × 5). U kthyen ${feed.refundCredits} credits.` : feed?.cancelRequested ? "Po përfundon imazhi aktual; pastaj kthehen credits e papërdorura." : completeFeed ? `${free} rigjenerime falas të mbetura.` : "Postimet krijohen një nga një dhe ruhen automatikisht."}</p></div><span className={b.hint}>{apps ? appFormats[feed?.mobile?.format ?? appDraft.mobile.format] : feedFormats[feed?.design?.format ?? "1:1"]}</span></div>
          {working && <div className={`${b.progress} ${s.feedProgress}`} role="progressbar" aria-label="Postimet e përfunduara" aria-valuenow={done} aria-valuemin={0} aria-valuemax={9}><span style={{ width: `${done / 9 * 100}%` }} /></div>}
          <div className={s.grid}>{tiles.map(tile => <button type="button" key={tile.slot} className={`${b.sourceCard} ${s.tile}`} data-working={active === tile.slot && working} onClick={() => { if (tile.url) { setSelected(tile.slot); setFeedback(""); setHeadline(tile.headline ?? ""); } }} disabled={!tile.url} aria-label={`${tile.slot + 1}. ${tile.title}${tile.url ? ", hape imazhin" : ", ende pa u krijuar"}`}>
            <span className={s.tileImage} style={{ aspectRatio: (apps ? feed?.mobile?.format ?? appDraft.mobile.format : feed?.design?.format ?? "1:1").replace(":", "/") }}>{tile.url ? <img src={tile.url} alt={`${feed?.brand} · ${tile.title}`} /> : <ImageIcon size={28} strokeWidth={1.5} aria-hidden="true" />}{active === tile.slot && working && <span className={s.tileOverlay}><FeedPendingStatus startedAt={feed?.active?.startedAt} /></span>}</span>
            <span className={s.tileInfo}><strong>{String(tile.slot + 1).padStart(2, "0")} · {tile.title}</strong>{tile.url ? <span><Check size={12} />{tile.version > 1 ? `v${tile.version}` : "Gati"}</span> : null}</span>
          </button>)}</div>
          <div className={s.feedActions}>{completeFeed || (feed?.cancelled && done > 0) ? <Button variant="primary" disabled={downloading} onClick={() => void download()} icon={<ArrowDownToLine size={16} />}>{downloading ? "Po përgatitet…" : `Shkarko ${done} imazhet · ZIP`}</Button> : feed && !stopped ? <Button variant="brand" disabled={working} onClick={() => { stopFeed.current = null; void run(() => complete(feed)); }} icon={<Sparkles size={16} />}>{apps ? "Vazhdo fushatën · pa pagesë shtesë" : "Vazhdo feed-in · pa pagesë shtesë"}</Button> : <Button variant="secondary" onClick={() => setTab("prepare")}>{apps ? "Përgatite fushatën" : "Përgatite feed-in"}</Button>}</div>
          {feed && !completeFeed && !stopped && <div className={s.cancelRow}><p className={b.hint}>Në ndalim paguan 5 credits për nisjen + 5 për çdo imazh të përfunduar.</p><Button variant="secondary" disabled={cancelling} loading={cancelling} onClick={() => void cancelFeed()}>{working ? "Ndalo pas imazhit aktual" : (apps ? "Ndalo fushatën" : "Ndalo feed-in")}</Button></div>}
          {feed?.cancelRequested && !feed.cancelled && <p role="status" className={b.footnote}>Ndalimi u kërkua. Rezultati aktual ruhet; postimet e radhës nuk nisen.</p>}

        </section>}
        {apps && tab === "history" && <section className={b.editor} aria-label="Historiku i feed-ave"><div className={b.sectionHeading}><div><h2>{apps ? "Fushatat e tua" : "Feed-at e tu"}</h2><p>{apps ? "Progresi ruhet automatikisht." : "Zgjedhe kampanjën që dëshiron me hapë."}</p></div>{!apps && <Button variant="secondary" size="sm" onClick={() => setTab("prepare")}>Feed i ri</Button>}</div>{history.length ? <div className={apps ? s.history : s.feedLibrary}>{history.map(item => <button type="button" key={item.id} disabled={working} aria-pressed={item.id === feed?.id} onClick={() => void run(async () => { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${item.id}`); remember(data.feed); })}><Grid3X3 size={24} /><div><strong>{item.name || item.brand}</strong>{!apps && <p>{item.brand} · {item.format ?? "1:1"} · {contentLabels[item.contentType ?? "mix"]}</p>}<span>{new Intl.DateTimeFormat("sq", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</span>{!apps && (item.cancelled || item.refunded) && <small>U ndal</small>}</div><ArrowUpRight size={16} /></button>)}</div> : <div className={b.empty}><History size={24} /><h3>{apps ? "Fushata jote e parë po të pret." : "Ende nuk ke krijuar feed."}</h3><p>{apps ? "Fushatat e app-eve ruhen këtu." : "Feed-at që krijon do t’i gjesh këtu."}</p></div>}</section>}
        {!apps && tab === "feed" && <FeedResults feed={feed} history={history} working={working} activeSlot={activeSlot} downloading={downloading} cancelling={cancelling}
          open={slot => { setSelected(slot); setFeedback(""); setHeadline(feed?.tiles[slot].headline ?? ""); }} download={slot => void download(slot)} resume={() => { if (feed) { stopFeed.current = null; void run(() => complete(feed)); } }} cancel={() => void cancelFeed()}
          choose={id => void run(async () => { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${id}`); remember(data.feed); })} library={() => setTab("history")} prepare={openPreparation} />}
        {!apps && tab === "history" && <FeedLibrary items={history} selected={feed?.id} loading={loading} working={working} open={id => void run(async () => { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${id}`); remember(data.feed); })} prepare={openPreparation} />}
        <p className={b.footnote}>{apps ? "Screenshot-et gjenerohen si pjesë e reklamës. Kontrollo detajet e ndërfaqes para publikimit. " : ""}Kur të vijë <strong>maroMarketing</strong>, mundesh me kriju edhe captions për këto postime.</p>
      </main>
    </div>
    {selected !== null && feed?.tiles[selected]?.url && <div className={s.modalBackdrop} onClick={() => setSelected(null)}><section className={s.modal} role="dialog" aria-modal="true" aria-label={`Postimi ${selected + 1}`} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setSelected(null); }}><Button className={s.modalClose} variant="secondary" size="icon" autoFocus aria-label="Mbylle imazhin" onClick={() => setSelected(null)}><X size={20} /></Button><img src={feed.tiles[selected].url!} alt={`${feed.brand} · ${feed.tiles[selected].title}`} /><div className={s.modalInfo}><div><p className={b.hint}>Postimi {selected + 1} / 9</p><h2>{feed.tiles[selected].title}</h2></div>{error && <p role="alert" className={b.hint}>{error}</p>}<Button variant="secondary" disabled={downloading} onClick={() => void download(selected)} icon={<ArrowDownToLine size={16} />}>Shkarko PNG</Button>{completeFeed && !stopped && <>{!apps && feed.textMode && feed.tiles[selected].headline !== undefined && <label className={b.field}><span>Teksti për versionin e ri</span><textarea className="maro-input" value={headline} maxLength={60} rows={2} disabled={working} placeholder="Lëre bosh për pa tekst" onChange={e => setHeadline(e.target.value)} /><small className={b.hint}>Ndryshoje, ndaje në rreshta ose hiqe për versionin e ri. Fotoja rigjenerohet bashkë me tekstin.</small></label>}<label className={b.field}><span>Çka dëshiron me ndryshu? <small className={b.hint}>(opsionale)</small></span><textarea className="maro-input" value={feedback} maxLength={600} rows={3} disabled={working} placeholder="p.sh. Kënd tjetër, dritë më e ngrohtë…" onChange={e => setFeedback(e.target.value)} /></label><Button variant="brand" disabled={working || (!free && credits < 5)} onClick={() => void regenerate()} icon={working ? <LoaderCircle size={16} className={s.spin} /> : <RefreshCw size={16} />}>Rigjenero · {free ? `Falas · ${free} të mbetura` : "5 credits"}</Button><p className={b.hint}>Imazhi aktual mbetet deri sa të jetë gati versioni i ri.</p></>}</div></section></div>}
  </div>;
}

function FeedPendingStatus({ startedAt }: { startedAt?: string }) {
  const [start] = React.useState(() => startedAt ? Date.parse(startedAt) || Date.now() : Date.now());
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const elapsed = Math.max(0, Math.floor((now - start) / 1000));
  return <><LoaderCircle className={s.spin} size={24} /><strong>Po marohet…</strong><small>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</small>{elapsed >= 90 && <small>Ky imazh po merr më shumë kohë.</small>}</>;
}
