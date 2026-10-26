"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Check, Grid3X3, ImagePlus, LoaderCircle, RefreshCw, Sparkles, X, History, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { IMAGE_REFERENCE_ACCEPT, createPrivateImageAttachment, uploadOrResolvePrivateAttachment, type PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import { canUseFeed, categoryIds, defaults, roles, contentTypes, contentLabels, feedRole, FEED_MAX_REFERENCES, type FeedContentType, type FeedBrief, type FeedCategory, type FeedView } from "@/lib/feed/model";
import { downloadFeed, feedJson, feedMessage, feedStep } from "@/lib/feed/client";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Logo } from "@/components/ui/Logo";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./FeedWorkspace.module.css";
import { AppsPreparation, appDraftPayload, initialAppDraft } from "@/components/apps/AppsPreparation";
import { appRole, appFormats, canUseApps } from "@/lib/apps/model";
import { marketingJson, marketingMessage } from "@/lib/marketing/client";
import type { MarketingCampaign } from "@/lib/marketing/model";

export function FeedWorkspace({ studio = "feed", marketingCampaignId, onMarketingImport }: { studio?: "feed" | "apps"; marketingCampaignId?: string; onMarketingImport?: (feedId: string, studio: "feed" | "apps") => Promise<void> }) {
  const { user, ready } = useMaro(); const { activeWorkspace } = useWorkspace();
  if (!ready) return <div className={s.notice}>Duke hapur studion…</div>;
  if (!(studio === "apps" ? canUseApps : canUseFeed)(user?.email)) return <div className={s.notice}><Grid3X3 size={32} /><h1>{studio === "apps" ? "maroApps" : "maroFeed"}</h1><p>Në pilot privat. Diçka e mirë po përgatitet.</p><Link href="/">Kthehu në maro</Link></div>;
  if (!activeWorkspace) return <div className={s.notice}>Duke hapur workspace…</div>;
  return <FeedStudio key={`${studio}:${user!.id}:${activeWorkspace.id}:${marketingCampaignId ?? "standalone"}`} workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} studio={studio} marketingCampaignId={marketingCampaignId} onMarketingImport={onMarketingImport} />;
}
type History = { id: string; brand: string; createdAt: string; refunded: boolean };
const initialBrief: FeedBrief = { brand: "", description: "", audience: "", goal: "sales", language: "sq", colors: "", notes: "" };
function FeedStudio({ workspaceId, workspaceName, studio, marketingCampaignId, onMarketingImport }: { workspaceId: string; workspaceName: string; studio: "feed" | "apps"; marketingCampaignId?: string; onMarketingImport?: (feedId: string, studio: "feed" | "apps") => Promise<void> }) {
  const apps = studio === "apps", api = `/api/${studio}`;
  const [appDraft, setAppDraft] = React.useState(initialAppDraft);
  const { credits, refreshProfile } = useMaro();
  const [tab, setTab] = React.useState<"prepare" | "feed" | "history">("prepare");
  const [brief, setBrief] = React.useState(initialBrief); const [brain, setBrain] = React.useState(false);
  const [category, setCategory] = React.useState<FeedCategory>("drinks");
  const [attachments, setAttachments] = React.useState<PrivateImageAttachment[]>([]);
  const attachmentRef = React.useRef<PrivateImageAttachment[]>([]);
  const [uploadBusy, setUploadBusy] = React.useState(false);
  const [contentType, setContentType] = React.useState<FeedContentType>("mix");
  const [textMode, setTextMode] = React.useState(true);
  const [cancelling, setCancelling] = React.useState(false);
  const stopFeed = React.useRef<string | null>(null);
  const attachment = attachments[0];
  const [feed, setFeed] = React.useState<FeedView | null>(null); const [history, setHistory] = React.useState<History[]>([]);
  const [loading, setLoading] = React.useState(true); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState("");
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
  const patch = (key: keyof FeedBrief, value: string) => setBrief(b => ({ ...b, [key]: value }));
  const remember = React.useCallback((value: FeedView) => {
    if (!alive.current) return;
    currentFeed.current = value;
    setTab("feed");
    setFeed(value); if (!marketingCampaignId) { const url = new URL(window.location.href); url.searchParams.set("feed", value.id); window.history.replaceState(null, "", url); }
  }, [marketingCampaignId]);
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
        const id = data.feeds.find(f => f.id === requested)?.id ?? data.feeds.find(f => !f.refunded)?.id;
        if (id) { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${id}`); if (live) remember(data.feed); }
      } catch (err) { if (live) setError(feedMessage((err as Error).message)); }
      finally { if (live) setLoading(false); }
    })(); return () => { live = false; };
  }, [workspaceId, remember, api, marketingCampaignId]);
  React.useEffect(() => {
    if (!feed?.active || busy) return;
    const timer = setInterval(() => { void feedJson<{ feed: FeedView }>(`${api}?feedId=${feed.id}`).then(data => { if (alive.current) remember(data.feed); }).catch(() => undefined); }, 6000);
    return () => clearInterval(timer);
  }, [feed?.id, feed?.active, busy, remember, api]);
  function updateAttachments(value: PrivateImageAttachment[]) { attachmentRef.current = value; setAttachments(value); }
  async function upload(files: File[]) {
    if (!files.length || busy || uploadBusy) return;
    if (attachmentRef.current.length + files.length > FEED_MAX_REFERENCES) { setError(feedMessage("too_many_references")); return; }
    setError(""); setUploadBusy(true);
    const items = files.map(file => createPrivateImageAttachment(file, crypto.randomUUID(), true));
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
      if (alive.current) {
        setError(feedMessage((err as Error).message));
        // A lost response can still have completed server work. Refresh before offering another paid action.
        if (currentFeed.current) {
          try { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${currentFeed.current.id}`); remember(data.feed); }
          catch { /* Keep the saved feed and error available for an explicit refresh. */ }
        }
      }
    }
    finally { lock.current = false; if (alive.current) { setBusy(false); setActiveSlot(null); void refreshProfile(); } }
  }
  async function start() {
    if (!marketingReady) return;
    await run(async () => {
      if (!apps && (!attachments.length || attachments.some(item => !item.storageRef || item.status !== "ready"))) throw new Error("brief_incomplete");
      stopFeed.current = null;
      createId.current ||= crypto.randomUUID();
      const data = await feedJson<{ feed: FeedView }>(api, { requestId: createId.current, workspaceId, ...(marketingCampaignId ? { marketingCampaignId } : {}), references: attachments.map(item => item.storageRef!), contentType, textMode, category, useBrain: brain,
        ...(apps ? appDraftPayload(appDraft) : {}), brief: apps ? appDraft.brief : brain ? { goal: brief.goal, language: brief.language, notes: brief.notes, ...(brief.colors ? { colors: brief.colors } : {}) } : brief });
      remember(data.feed); createId.current = "";
      setHistory(rows => [{ id: data.feed.id, brand: data.feed.brand, createdAt: data.feed.createdAt, refunded: false }, ...rows.filter(f => f.id !== data.feed.id)]);
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
      setActiveSlot(selected); const result = await feedStep({ feedId: feed.id, requestId: crypto.randomUUID(), action: "regenerate", slot: selected, feedback }, studio);
      if (result.feed) remember(result.feed); if (result.error) throw new Error(result.error); setFeedback("");
    });
  }
  async function download(slot?: number) {
    if (!feed) return; setDownloading(true); setError("");
    try { await downloadFeed(feed.id, slot, studio); } catch (err) { setError(feedMessage((err as Error).message)); } finally { setDownloading(false); }
  }
  const done = feed?.tiles.filter(t => t.url).length ?? 0; const completeFeed = done === 9;
  const working = busy || Boolean(feed?.active) || !marketingReady; const active = activeSlot ?? feed?.active?.slot;
  const free = Math.max(0, 3 - (feed?.freeUsed ?? 0));
  const stopped = Boolean(feed?.cancelled || feed?.cancelRequested || feed?.refunded);
  const tiles = feed?.tiles ?? roles.map((_, slot) => ({ slot, title: (apps ? appRole(slot, appDraft.contentType) : feedRole(slot, contentType)).title, url: null, version: 0 }));
  return <div className={`${b.studio} ${s.studio}`}>
    <header className={s.lead}>
      <div><h1 className={s.wordmark} aria-label={apps ? "maroApps" : "maroFeed"}><Logo showWord wordClassName={s.maroWord} /><span>{apps ? "Apps" : "Feed"}</span></h1><h2>{apps ? "App-i yt. Reklama që e tregojnë." : "Nga referencat, te feed-i yt."}</h2><p>{apps ? "Screenshot-et e tua, pajisjet e fundit dhe drejtimi yt kreativ. Maro i lidh në një fushatë." : "Ti zgjedh drejtimin. Maro i lidh 9 postimet me brendin tënd."}</p></div>
      <div className={s.leadSteps} aria-label={apps ? "Si funksionon maroApps" : "Si funksionon maroFeed"}><span><ImagePlus size={20} /><small>01</small><strong>Ngarko</strong></span><span><SlidersHorizontal size={20} /><small>02</small><strong>Zgjedh</strong></span><span><Grid3X3 size={20} /><small>03</small><strong>Maro</strong></span></div>
    </header>
    {marketingCampaignId && <div className={b.assistBar}><Sparkles size={20} /><div><strong>Imazhet e fushatës maroMarketing</strong><p>Çdo imazh ndjek postimin përkatës të planit. Ngarko produktin ose screenshot-et reale; pastaj ktheji imazhet te postimet për rishikim.</p></div>{done > 0 && onMarketingImport && <Button variant="brand" loading={marketingImportBusy} disabled={working} onClick={async () => { if (!feed) return; setMarketingImportBusy(true); try { await onMarketingImport(feed.id, studio); } catch (e) { setError(marketingMessage((e as Error).message)); } finally { if (alive.current) setMarketingImportBusy(false); } }}>Shto {done} imazhe te plani</Button>}</div>}
    <div className={b.layout}>
      <aside className={b.sidebar}>
        <div className={b.workspace}><span>Workspace</span><div className={`maro-input ${s.workspaceName}`}>{workspaceName}</div></div>
        <nav className={b.sectionNav} aria-label={apps ? "Seksionet e maroApps" : "Seksionet e maroFeed"}>
          <button type="button" disabled={working || uploadBusy} aria-current={tab === "prepare" ? "page" : undefined} onClick={() => setTab("prepare")}><SlidersHorizontal size={18} /><span>Përgatitja</span></button>
          <button type="button" disabled={working || uploadBusy} aria-current={tab === "feed" ? "page" : undefined} onClick={() => setTab("feed")}><Grid3X3 size={18} /><span>{apps ? "Reklamat e tua" : "Feed-i yt"}</span><small>{done}/9</small></button>
          <button type="button" disabled={working || uploadBusy} aria-current={tab === "history" ? "page" : undefined} onClick={() => setTab("history")}><History size={18} /><span>Historiku</span><small>{history.length}</small></button>
        </nav>
        <div className={b.sidebarProgress}><div className={b.row}><span>Postime të përfunduara</span><strong>{done}/9</strong></div><div className={b.progress}><span style={{ width: `${done / 9 * 100}%` }} /></div><p className={s.sidebarNote}>{apps ? "3 rigjenerime falas për fushatë." : "3 rigjenerime falas për feed."}<br />Pastaj 5 credits secili.</p></div>
      </aside>
      <main className={b.main}>
        <section className={b.hero} aria-label="Përmbledhja e feed-it">
          <div className={b.brandIdentity}><div className={b.heroLogo}>{attachment?.previewUrl ? <img src={attachment.previewUrl} alt="Produkti i ngarkuar" /> : <Grid3X3 size={24} />}</div><div><h2>{feed?.brand || (apps ? appDraft.brief.brand : brief.brand) || workspaceName}</h2><p>{apps ? "Fushatë për mobile app" : brain ? "Me kontekst nga maroBrain" : "Me informatat e brendit tënd"}</p></div></div>
          <div className={s.summary}><span>{feed?.cancelled ? `U ndal · ${done} imazhe` : feed?.cancelRequested ? "Po ndalet pas imazhit aktual…" : working ? "Po krijohet, një nga një…" : completeFeed ? (apps ? "Reklamat janë gati." : "Feed-i është gati.") : feed?.refunded ? "Credits u kthyen." : (apps ? `9 reklama · ${feed?.mobile?.format ?? appDraft.mobile.format}` : "9 imazhe · format katror")}</span><strong>{done}/9</strong></div>
        </section>
        {error && <div className={s.error} role="alert"><p>{error}</p><Button variant="ghost" size="icon" aria-label="Mbylle mesazhin" onClick={() => setError("")}><X size={16} /></Button></div>}
        {tab === "prepare" && <section className={b.editor} aria-label="Përgatitja e feed-it">
          <div className={b.sectionHeading}><div><h2>{apps ? "Përgatite fushatën e app-it" : "Përgatite feed-in"}</h2><p>{apps ? "Prej ndërfaqes reale, te reklama jote e ardhshme." : "Ngarko produktin dhe shto informatat që na duhen për brendin."}</p></div></div>
          {apps ? <AppsPreparation draft={appDraft} setDraft={setAppDraft} working={working} loading={loading} credits={credits} start={() => void start()} onUploadBusy={setUploadBusy} /> : <div className={s.form}>
            <button className={`${b.dropZone} ${s.upload}`} type="button" onClick={() => fileInput.current?.click()} disabled={working || uploadBusy || attachments.length >= FEED_MAX_REFERENCES} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(Array.from(event.dataTransfer.files)); }}>
              {uploadBusy ? <LoaderCircle className={s.spin} size={24} /> : <ImagePlus size={28} />}
              <strong>{uploadBusy ? "Duke ngarkuar referencat…" : "Ngarko referencat"}</strong><small>PNG, JPG ose WebP · deri në 25 MB secila · {attachments.length}/{FEED_MAX_REFERENCES}</small>
            </button>
            <input ref={fileInput} type="file" multiple accept={IMAGE_REFERENCE_ACCEPT} className={s.hidden} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            {attachments.length > 0 && <div className={s.references}>{attachments.map((item, index) => <article key={item.id} className={b.sourceCard}>
              <button type="button" className={s.referencePreview} aria-label={`Bëje ${item.name} referencë kryesore`} aria-pressed={index === 0} disabled={working || uploadBusy || item.status !== "ready"} onClick={() => updateAttachments([item, ...attachmentRef.current.filter(current => current.id !== item.id)])}>{item.previewUrl ? <img src={item.previewUrl} alt={item.name} /> : item.status === "uploading" ? <LoaderCircle size={20} className={s.spin} /> : <ImageIcon size={20} />}</button>
              <div className={s.referenceInfo}><strong title={item.name}>{item.name}</strong><small>{item.error || (item.status === "ready" ? index === 0 ? "Referenca kryesore" : `Referenca ${index + 1}` : "Duke ngarkuar…")}</small><Button size="sm" variant="ghost" disabled={working || uploadBusy} aria-label={`Hiq ${item.name}`} onClick={() => updateAttachments(attachmentRef.current.filter(current => current.id !== item.id))}>Hiqe</Button></div>
            </article>)}</div>}
            <p className={b.hint}>E para është referenca kryesore. Kliko një tjetër për ta bërë kryesore.</p>
            <div className={s.contextRow}><div><strong>maroBrain</strong><p>{brain ? workspaceName : "Përdore kujtesën e brendit"}</p></div><Switch checked={brain} onChange={setBrain} disabled={working} aria-label="Përdor maroBrain" /></div>
            {brain ? <div className={b.hint}>Identiteti, audienca, ngjyrat dhe rregullat merren nga maroBrain i këtij workspace. <Link className={s.inlineLink} href="/brain">Hape maroBrain <ArrowUpRight size={14} /></Link></div> : <>
              <label className={b.field}><span>Emri i brendit</span><input className="maro-input" value={brief.brand} maxLength={120} disabled={working} placeholder="p.sh. NOMA" onChange={e => patch("brand", e.target.value)} /></label>
              <label className={b.field}><span>Çka shet / ofron?</span><textarea className="maro-input" value={brief.description} maxLength={1800} disabled={working} placeholder="Produkti, çka e bën të veçantë, për kë është…" rows={3} onChange={e => patch("description", e.target.value)} /></label>
              <label className={b.field}><span>Audienca <small className={b.hint}>(opsionale)</small></span><input className="maro-input" value={brief.audience} maxLength={300} disabled={working} placeholder="Kujt i drejtohet brendi yt?" onChange={e => patch("audience", e.target.value)} /></label>
            </>}
            <div className={s.fieldPair}><label className={b.field}><span>Kategoria</span><select className="maro-input" value={category} disabled={working} onChange={e => setCategory(e.target.value as FeedCategory)}>{categoryIds.map(id => <option key={id} value={id}>{defaults[id].label}</option>)}</select></label><label className={b.field}><span>Synimi</span><select className="maro-input" value={brief.goal} disabled={working} onChange={e => patch("goal", e.target.value)}><option value="sales">Shitje</option><option value="engagement">Engagement</option><option value="launch">Lansim</option></select></label></div>
            <label className={b.field}><span>Lloji i postimeve</span><select className="maro-input" value={contentType} disabled={working} onChange={e => setContentType(e.target.value as FeedContentType)}>{contentTypes.map(type => <option key={type} value={type}>{contentLabels[type]}</option>)}</select><small className={b.hint}>{contentType === "mix" ? "Një miks me 9 role të ndryshme, si një fushatë e vetme." : `9 postime të llojit “${contentLabels[contentType]}”, me kompozime të ndryshme.`}</small></label>
            <div className={s.contextRow}><div><strong>Tekst në imazhe</strong><p>{textMode ? "Me tituj dhe tekst të shkurtër sipas postimit." : "Pa tekst të shtuar. Etiketat dhe logoja e produktit ruhen."}</p></div><Switch checked={textMode} onChange={setTextMode} disabled={working} aria-label="Tekst në imazhe" /></div>
            <label className={b.field}><span>Gjuha në imazhe</span><select className="maro-input" value={brief.language} disabled={working || !textMode} onChange={e => patch("language", e.target.value)}><option value="sq">Shqip</option><option value="en">English</option></select></label>
            <details className={s.more}><summary className={b.promptSummary}>Më shumë drejtim (opsionale)</summary><div className={s.form}><label className={b.field}><span>Ngjyrat</span><input className="maro-input" value={brief.colors} maxLength={100} placeholder="p.sh. #233D2A, krem, portokalli" onChange={e => patch("colors", e.target.value)} disabled={working} /></label><label className={b.field}><span>Çka duhet me ditë?</span><textarea className="maro-input" value={brief.notes} maxLength={1200} rows={3} placeholder="Fushata, oferta e saktë, stili ose gjërat që duhen shmangur…" onChange={e => patch("notes", e.target.value)} disabled={working} /></label></div></details>
            <div className={s.formActions}><Button variant="brand" disabled={working || uploadBusy || loading || !attachments.length || attachments.some(item => item.status !== "ready") || credits < 50 || (!brain && (!brief.brand.trim() || brief.description.trim().length < 8))} onClick={() => void start()} icon={<Sparkles size={16} />}>Ma maro feed-in · 50 credits</Button><p className={b.hint}>9 imazhe · 3 rigjenerime falas.<br />Pastaj 5 credits për rigjenerim.</p></div>
            <p className={b.hint}>50 credits paguhen në nisje: 5 për përgatitjen + 5 për secilin imazh. Nëse e ndal në mes, pjesa e papërdorur kthehet automatikisht.</p>
          </div>}
        </section>}
        {tab === "feed" && <section className={b.editor} aria-label="Feed-i me nëntë postime">
          <div className={b.sectionHeading}><div><h2>{apps ? "Reklamat e tua" : "Feed-i yt"}</h2><p>{feed?.cancelled ? `U mbajtën ${50 - feed.refundCredits} credits (5 + ${done} × 5). U kthyen ${feed.refundCredits} credits.` : feed?.cancelRequested ? "Po përfundon imazhi aktual; pastaj kthehen credits e papërdorura." : completeFeed ? `${free} rigjenerime falas të mbetura.` : "Postimet krijohen një nga një dhe ruhen automatikisht."}</p></div><span className={b.hint}>{apps ? appFormats[feed?.mobile?.format ?? appDraft.mobile.format] : "1:1 · 1024 px"}</span></div>
          {working && <div className={`${b.progress} ${s.feedProgress}`} role="progressbar" aria-label="Postimet e përfunduara" aria-valuenow={done} aria-valuemin={0} aria-valuemax={9}><span style={{ width: `${done / 9 * 100}%` }} /></div>}
          <div className={s.grid}>{tiles.map(tile => <button type="button" key={tile.slot} className={`${b.sourceCard} ${s.tile}`} data-working={active === tile.slot && working} onClick={() => { if (tile.url) { setSelected(tile.slot); setFeedback(""); } }} disabled={!tile.url} aria-label={`${tile.slot + 1}. ${tile.title}${tile.url ? ", hape imazhin" : ", ende pa u krijuar"}`}>
            <span className={s.tileImage} style={apps ? { aspectRatio: (feed?.mobile?.format ?? appDraft.mobile.format).replace(":", "/") } : undefined}>{tile.url ? <img src={tile.url} alt={`${feed?.brand} · ${tile.title}`} /> : <ImageIcon size={28} strokeWidth={1.5} aria-hidden="true" />}{active === tile.slot && working && <span className={s.tileOverlay}><LoaderCircle className={s.spin} size={24} /><strong>Po marohet…</strong></span>}</span>
            <span className={s.tileInfo}><strong>{String(tile.slot + 1).padStart(2, "0")} · {tile.title}</strong>{tile.url ? <span><Check size={12} />{tile.version > 1 ? `v${tile.version}` : "Gati"}</span> : null}</span>
          </button>)}</div>
          <div className={s.feedActions}>{completeFeed || (feed?.cancelled && done > 0) ? <Button variant="primary" disabled={downloading} onClick={() => void download()} icon={<ArrowDownToLine size={16} />}>{downloading ? "Po përgatitet…" : `Shkarko ${done} imazhet · ZIP`}</Button> : feed && !stopped ? <Button variant="brand" disabled={working} onClick={() => { stopFeed.current = null; void run(() => complete(feed)); }} icon={<Sparkles size={16} />}>{apps ? "Vazhdo fushatën · pa pagesë shtesë" : "Vazhdo feed-in · pa pagesë shtesë"}</Button> : <Button variant="secondary" onClick={() => setTab("prepare")}>{apps ? "Përgatite fushatën" : "Përgatite feed-in"}</Button>}</div>
          {feed && !completeFeed && !stopped && <div className={s.cancelRow}><p className={b.hint}>Në ndalim paguan 5 credits për nisjen + 5 për çdo imazh të përfunduar.</p><Button variant="secondary" disabled={cancelling} loading={cancelling} onClick={() => void cancelFeed()}>{working ? "Ndalo pas imazhit aktual" : (apps ? "Ndalo fushatën" : "Ndalo feed-in")}</Button></div>}
          {feed?.cancelRequested && !feed.cancelled && <p role="status" className={b.footnote}>Ndalimi u kërkua. Rezultati aktual ruhet; postimet e radhës nuk nisen.</p>}

        </section>}
        {tab === "history" && <section className={b.editor} aria-label="Historiku i feed-ave"><div className={b.sectionHeading}><div><h2>{apps ? "Fushatat e tua" : "Feed-at e tu"}</h2><p>Progresi ruhet automatikisht.</p></div></div>{history.length ? <div className={s.history}>{history.map(item => <button type="button" key={item.id} disabled={working} aria-pressed={item.id === feed?.id} onClick={() => void run(async () => { const data = await feedJson<{ feed: FeedView }>(`${api}?feedId=${item.id}`); remember(data.feed); })}><Grid3X3 size={18} /><strong>{item.brand}</strong><span>{new Intl.DateTimeFormat("sq", { day: "numeric", month: "short" }).format(new Date(item.createdAt))}</span><ArrowUpRight size={16} /></button>)}</div> : <div className={b.empty}><History size={24} /><h3>{apps ? "Fushata jote e parë po të pret." : "Ende nuk ke krijuar feed."}</h3><p>{apps ? "Fushatat e app-eve ruhen këtu." : "Feed-at që krijon do t’i gjesh këtu."}</p></div>}</section>}
        <p className={b.footnote}>{apps ? "Screenshot-et gjenerohen si pjesë e reklamës. Kontrollo detajet e ndërfaqes para publikimit. " : ""}Kur të vijë <strong>maroMarketing</strong>, mundesh me kriju edhe captions për këto postime.</p>
      </main>
    </div>
    {selected !== null && feed?.tiles[selected]?.url && <div className={s.modalBackdrop} onClick={() => setSelected(null)}><section className={s.modal} role="dialog" aria-modal="true" aria-label={`Postimi ${selected + 1}`} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setSelected(null); }}><Button className={s.modalClose} variant="secondary" size="icon" autoFocus aria-label="Mbylle imazhin" onClick={() => setSelected(null)}><X size={20} /></Button><img src={feed.tiles[selected].url!} alt={`${feed.brand} · ${feed.tiles[selected].title}`} /><div className={s.modalInfo}><div><p className={b.hint}>Postimi {selected + 1} / 9</p><h2>{feed.tiles[selected].title}</h2></div>{error && <p role="alert" className={b.hint}>{error}</p>}<Button variant="secondary" disabled={downloading} onClick={() => void download(selected)} icon={<ArrowDownToLine size={16} />}>Shkarko PNG</Button>{completeFeed && !stopped && <><label className={b.field}><span>Çka dëshiron me ndryshu? <small className={b.hint}>(opsionale)</small></span><textarea className="maro-input" value={feedback} maxLength={600} rows={3} disabled={working} placeholder="p.sh. Më pak tekst, dritë më e ngrohtë…" onChange={e => setFeedback(e.target.value)} /></label><Button variant="brand" disabled={working || (!free && credits < 5)} onClick={() => void regenerate()} icon={working ? <LoaderCircle size={16} className={s.spin} /> : <RefreshCw size={16} />}>Rigjenero · {free ? `Falas · ${free} të mbetura` : "5 credits"}</Button><p className={b.hint}>Imazhi aktual mbetet deri sa të jetë gati versioni i ri.</p></>}</div></section></div>}
  </div>;
}
