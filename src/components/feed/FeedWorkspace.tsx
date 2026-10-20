"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Check, Grid3X3, ImagePlus, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { IMAGE_REFERENCE_ACCEPT, createPrivateImageAttachment, uploadOrResolvePrivateAttachment, type PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import { canUseFeed, categoryIds, defaults, roles, type FeedBrief, type FeedCategory, type FeedView } from "@/lib/feed/model";
import { downloadFeed, feedJson, feedMessage, feedStep } from "@/lib/feed/client";
import s from "./FeedWorkspace.module.css";

export function FeedWorkspace() {
  const { user, ready } = useMaro(); const { activeWorkspace } = useWorkspace();
  if (!ready) return <div className={s.notice}>Duke hapur studion…</div>;
  if (!canUseFeed(user?.email)) return <div className={s.notice}><Grid3X3 size={32} /><h1>maroFeed</h1><p>Në pilot privat. Diçka e mirë po përgatitet.</p><Link href="/">Kthehu në maro</Link></div>;
  if (!activeWorkspace) return <div className={s.notice}>Duke hapur workspace…</div>;
  return <FeedStudio key={`${user!.id}:${activeWorkspace.id}`} workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} />;
}
type History = { id: string; brand: string; createdAt: string; refunded: boolean };
const initialBrief: FeedBrief = { brand: "", description: "", audience: "", goal: "sales", language: "sq", colors: "", notes: "" };
function FeedStudio({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const { credits, refreshProfile } = useMaro();
  const [brief, setBrief] = React.useState(initialBrief); const [brain, setBrain] = React.useState(false);
  const [category, setCategory] = React.useState<FeedCategory>("drinks");
  const [attachment, setAttachment] = React.useState<PrivateImageAttachment | null>(null);
  const [feed, setFeed] = React.useState<FeedView | null>(null); const [history, setHistory] = React.useState<History[]>([]);
  const [loading, setLoading] = React.useState(true); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState("");
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
    setFeed(value); const url = new URL(window.location.href); url.searchParams.set("feed", value.id); window.history.replaceState(null, "", url);
  }, []);
  React.useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const data = await feedJson<{ feeds: History[] }>(`/api/feed?workspaceId=${encodeURIComponent(workspaceId)}`);
        if (!live) return; setHistory(data.feeds);
        const requested = new URL(window.location.href).searchParams.get("feed");
        const id = data.feeds.find(f => f.id === requested)?.id ?? data.feeds.find(f => !f.refunded)?.id;
        if (id) { const data = await feedJson<{ feed: FeedView }>(`/api/feed?feedId=${id}`); if (live) remember(data.feed); }
      } catch (err) { if (live) setError(feedMessage((err as Error).message)); }
      finally { if (live) setLoading(false); }
    })(); return () => { live = false; };
  }, [workspaceId, remember]);
  React.useEffect(() => {
    if (!feed?.active || busy) return;
    const timer = setInterval(() => { void feedJson<{ feed: FeedView }>(`/api/feed?feedId=${feed.id}`).then(data => { if (alive.current) remember(data.feed); }).catch(() => undefined); }, 6000);
    return () => clearInterval(timer);
  }, [feed?.id, feed?.active, busy, remember]);
  async function upload(file?: File) {
    if (!file || busy) return; setError("");
    const next = createPrivateImageAttachment(file, crypto.randomUUID(), true); setAttachment(next);
    if (next.error) { setError(next.error); return; }
    try { const ready = await uploadOrResolvePrivateAttachment(next); if (alive.current) setAttachment(ready); }
    catch { if (alive.current) { setAttachment({ ...next, status: "upload-error" }); setError("Ngarkimi nuk u përfundua. Provo përsëri."); } }
  }
  async function complete(value: FeedView) {
    let current = value;
    while (alive.current && !current.refunded && current.tiles.some(t => !t.url)) {
      if (current.active) { remember(current); return; }
      const slot = current.tiles.find(t => !t.url)!.slot; setActiveSlot(slot);
      const result = await feedStep({ feedId: current.id, requestId: crypto.randomUUID(), action: "next" });
      if (result.feed) { current = result.feed; remember(current); }
      if (result.error) throw new Error(result.error);
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
          try { const data = await feedJson<{ feed: FeedView }>(`/api/feed?feedId=${currentFeed.current.id}`); remember(data.feed); }
          catch { /* Keep the saved feed and error available for an explicit refresh. */ }
        }
      }
    }
    finally { lock.current = false; if (alive.current) { setBusy(false); setActiveSlot(null); void refreshProfile(); } }
  }
  async function start() {
    await run(async () => {
      if (!attachment?.storageRef || attachment.status !== "ready") throw new Error("brief_incomplete");
      createId.current ||= crypto.randomUUID();
      const data = await feedJson<{ feed: FeedView }>("/api/feed", { requestId: createId.current, workspaceId, reference: attachment.storageRef, category, useBrain: brain,
        brief: brain ? { goal: brief.goal, language: brief.language, notes: brief.notes, ...(brief.colors ? { colors: brief.colors } : {}) } : brief });
      remember(data.feed); createId.current = "";
      setHistory(rows => [{ id: data.feed.id, brand: data.feed.brand, createdAt: data.feed.createdAt, refunded: false }, ...rows.filter(f => f.id !== data.feed.id)]);
      void refreshProfile(); await complete(data.feed);
    });
  }
  async function regenerate() {
    if (!feed || selected === null) return;
    await run(async () => {
      setActiveSlot(selected); const result = await feedStep({ feedId: feed.id, requestId: crypto.randomUUID(), action: "regenerate", slot: selected, feedback });
      if (result.feed) remember(result.feed); if (result.error) throw new Error(result.error); setFeedback("");
    });
  }
  async function download(slot?: number) {
    if (!feed) return; setDownloading(true); setError("");
    try { await downloadFeed(feed.id, slot); } catch (err) { setError(feedMessage((err as Error).message)); } finally { setDownloading(false); }
  }
  const done = feed?.tiles.filter(t => t.url).length ?? 0; const completeFeed = done === 9;
  const working = busy || Boolean(feed?.active); const active = activeSlot ?? feed?.active?.slot;
  const free = Math.max(0, 3 - (feed?.freeUsed ?? 0));
  const tiles = feed?.tiles ?? roles.map((r, slot) => ({ slot, title: r.title, url: null, version: 0 }));
  return <div className={s.studio}>
    <header className={s.header}><div className={s.wordmark}><span className={s.mark}><Grid3X3 size={25} /></span><span>maro<span className={s.feedWord}>Feed</span></span><span className={s.pilot}>PILOT PRIVAT</span></div><span className={s.small}>Një brend. Nëntë momente.</span></header>
    <div className={s.intro}><div><span className={s.eyebrow}>NGA PRODUKTI, TE FEED-I YT I RADHËS</span><h1>9 postime.<br /><span>Një identitet.</span></h1><p>Ngarko produktin. Jepi pak kontekst.<br />Lëre maroFeed me e lidhë krejt historinë.</p></div><div className={s.stamp}><Sparkles size={20} /><span>CRAFTED AS A FEED<br /><strong>jo thjesht 9 imazhe.</strong></span></div></div>
    <div className={s.workspace}>
      <aside className={s.setup}>
        <div className={s.panelHeading}><span className={s.step}>01</span><h2>Pak prej teje.</h2></div>
        <button className={s.upload} type="button" onClick={() => fileInput.current?.click()} disabled={working}>
          {attachment?.previewUrl ? <img src={attachment.previewUrl} alt="Produkti i ngarkuar" /> : attachment?.status === "uploading" ? <LoaderCircle className={s.spin} size={28} /> : <ImagePlus size={30} />}
          <strong>{attachment?.name ?? "Ngarko produktin ose brendin"}</strong><span>{attachment?.status === "ready" ? "U ngarkua · kliko për ta ndërruar" : "PNG, JPG ose WebP · deri në 25 MB"}</span>
        </button>
        <input ref={fileInput} type="file" accept={IMAGE_REFERENCE_ACCEPT} className={s.hidden} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        {attachment && <button type="button" className={s.textButton} disabled={working} onClick={() => { setAttachment(null); setError(""); }}>Hiqe imazhin</button>}
        <button className={`${s.brainToggle} ${brain ? s.brainOn : ""}`} type="button" role="switch" aria-checked={brain} disabled={working} onClick={() => setBrain(v => !v)}><span><strong>maroBrain</strong><small>{brain ? workspaceName : "Përdore kujtesën e brendit"}</small></span><span className={s.switch}><span /></span></button>
        {brain ? <div className={s.brainInfo}>Identiteti, audienca, ngjyrat dhe rregullat merren nga maroBrain i këtij workspace. <Link href="/brain">Hape maroBrain <ArrowUpRight size={12} /></Link></div> : <div className={s.fields}>
          <label>Emri i brendit<input value={brief.brand} maxLength={120} disabled={working} placeholder="p.sh. NOMA" onChange={e => patch("brand", e.target.value)} /></label>
          <label>Çka shet / ofron?<textarea value={brief.description} maxLength={1800} disabled={working} placeholder="Produkti, çka e bën të veçantë, për kë është…" rows={3} onChange={e => patch("description", e.target.value)} /></label>
          <label>Audienca <span>opsionale</span><input value={brief.audience} maxLength={300} disabled={working} placeholder="Kush dëshiron me të pa?" onChange={e => patch("audience", e.target.value)} /></label>
        </div>}
        <div className={s.fields}><label>Kategoria<select value={category} disabled={working} onChange={e => setCategory(e.target.value as FeedCategory)}>{categoryIds.map(id => <option key={id} value={id}>{defaults[id].label}</option>)}</select></label>
          <div className={s.fieldPair}><label>Synimi<select value={brief.goal} disabled={working} onChange={e => patch("goal", e.target.value)}><option value="sales">Shitje</option><option value="engagement">Engagement</option><option value="launch">Lansim</option></select></label><label>Gjuha në imazhe<select value={brief.language} disabled={working} onChange={e => patch("language", e.target.value)}><option value="sq">Shqip</option><option value="en">English</option></select></label></div>
          <details className={s.more}><summary>Pak më shumë drejtim <span>opsionale +</span></summary><label>Ngjyrat<input value={brief.colors} maxLength={100} placeholder="p.sh. #233D2A, krem, portokalli" onChange={e => patch("colors", e.target.value)} disabled={working} /></label><label>Çka duhet me ditë?<textarea value={brief.notes} maxLength={1200} rows={3} placeholder="Fushata, oferta e saktë, stili ose gjërat që duhen shmangur…" onChange={e => patch("notes", e.target.value)} disabled={working} /></label></details>
        </div>
        <button type="button" className={s.generate} disabled={working || loading || attachment?.status !== "ready" || credits < 50 || (!brain && (!brief.brand.trim() || brief.description.trim().length < 8))} onClick={() => void start()}><Sparkles size={17} /><span>Ma maro feed-in</span><strong>50 credits</strong></button>
        <p className={s.priceNote}>9 imazhe · 3 rigjenerime falas<br />Pastaj 5 credits për rigjenerim.</p>
      </aside>
      <section className={s.canvas} aria-label="Feed-i me nëntë postime">
        <div className={s.canvasTop}><div><span className={s.eyebrow}>02 / LET IT COME TOGETHER</span><h2>{feed?.brand ?? "Feed-i yt i ardhshëm."}</h2></div><span className={s.counter}>{done}<span>/09</span></span></div>
        <div className={s.toolbar}><span className={s.liveDot}>{working ? "Po krijohet, një nga një…" : completeFeed ? "Gati për feed-in tënd." : feed?.refunded ? "Credits u kthyen." : "Nëntë ide. Një drejtim."}</span><span>1:1 · 1024 px</span></div>
        {working && <div className={s.progress} role="progressbar" aria-label="Postimet e përfunduara" aria-valuenow={done} aria-valuemin={0} aria-valuemax={9}><span style={{ width: `${done / 9 * 100}%` }} /></div>}
        <div className={s.grid}>{tiles.map(tile => <button type="button" key={tile.slot} className={`${s.tile} ${s[`tone${tile.slot}`]} ${active === tile.slot && working ? s.tileWorking : ""}`} onClick={() => { if (tile.url) { setSelected(tile.slot); setFeedback(""); } }} disabled={!tile.url} aria-label={`${tile.slot + 1}. ${tile.title}${tile.url ? ", hape imazhin" : ", ende pa u krijuar"}`}>
          {tile.url ? <img src={tile.url} alt={`${feed?.brand} · ${tile.title}`} /> : <><span className={s.tileNumber}>{String(tile.slot + 1).padStart(2, "0")}</span><div className={s.tileArt}><span /><i /></div><span className={s.tileTitle}>{tile.title}</span></>}
          {active === tile.slot && working ? <span className={s.tileOverlay}><LoaderCircle className={s.spin} size={27} /><strong>Po marohet…</strong></span> : tile.url ? <span className={s.tileBadge}><Check size={12} /> {tile.version > 1 ? `v${tile.version}` : "Gati"}</span> : null}
        </button>)}</div>
        <div className={s.canvasBottom}><span><Grid3X3 size={15} />{completeFeed ? `${free} rigjenerime falas të mbetura` : "Kompozime të ndryshme. Stil i përbashkët."}</span>
          {completeFeed ? <button type="button" className={s.darkButton} disabled={downloading} onClick={() => void download()}><ArrowDownToLine size={15} />{downloading ? "Po përgatitet…" : "Shkarko 9 imazhet · ZIP"}</button> : feed && !feed.refunded ? <button type="button" className={s.darkButton} disabled={working} onClick={() => void run(() => complete(feed))}><Sparkles size={15} />Vazhdo feed-in · pa pagesë shtesë</button> : null}
        </div>
        {feed && !done && !working && !feed.refunded && feed.lastError && <button type="button" className={s.textButton} onClick={() => void run(async () => { const data = await feedJson<{ feed: FeedView }>("/api/feed/action", { feedId: feed.id, requestId: crypto.randomUUID(), action: "refund" }); remember(data.feed); })}>Anulo feed-in dhe kthe 50 credits</button>}
        <p className={s.marketingNote}>Kur të vijë <strong>maroMarketing</strong>, mundesh me kriju edhe captions për këto postime. <ArrowUpRight size={13} /></p>
      </section>
    </div>
    {error && <div className={s.error} role="alert">{error}<button type="button" aria-label="Mbylle mesazhin" onClick={() => setError("")}><X size={16} /></button></div>}
    {history.length > 0 && <section className={s.history}><h2>Feed-at e tu <span>Progresi ruhet automatikisht.</span></h2><div>{history.map(item => <button type="button" key={item.id} disabled={working} aria-pressed={item.id === feed?.id} onClick={() => void run(async () => { const data = await feedJson<{ feed: FeedView }>(`/api/feed?feedId=${item.id}`); remember(data.feed); })}><Grid3X3 size={16} /><strong>{item.brand}</strong><span>{new Intl.DateTimeFormat("sq", { day: "numeric", month: "short" }).format(new Date(item.createdAt))}</span><ArrowUpRight size={14} /></button>)}</div></section>}
    {selected !== null && feed?.tiles[selected]?.url && <div className={s.modalBackdrop} onClick={() => setSelected(null)}><section className={s.modal} role="dialog" aria-modal="true" aria-label={`Postimi ${selected + 1}`} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setSelected(null); }}><button className={s.modalClose} type="button" autoFocus aria-label="Mbylle imazhin" onClick={() => setSelected(null)}><X size={22} /></button><img src={feed.tiles[selected].url!} alt={`${feed.brand} · ${roles[selected].title}`} /><div className={s.modalInfo}><span className={s.eyebrow}>POSTIMI {String(selected + 1).padStart(2, "0")} / 09</span><h2>{roles[selected].title}</h2>{error && <p role="alert" className={s.brainInfo}>{error}</p>}<button type="button" className={s.darkButton} disabled={downloading} onClick={() => void download(selected)}><ArrowDownToLine size={16} />Shkarko PNG</button>{completeFeed && <><label className={s.revisionLabel}>Çka dëshiron me ndryshu? <span>opsionale</span><textarea value={feedback} maxLength={600} rows={3} disabled={working} placeholder="p.sh. Më pak tekst, dritë më e ngrohtë…" onChange={e => setFeedback(e.target.value)} /></label><button type="button" className={s.generate} disabled={working || (!free && credits < 5)} onClick={() => void regenerate()}>{working ? <LoaderCircle size={16} className={s.spin} /> : <RefreshCw size={16} />}Rigjenero <strong>{free ? `Falas · ${free} të mbetura` : "5 credits"}</strong></button><p className={s.priceNote}>Imazhi aktual mbetet deri sa të jetë gati versioni i ri.</p></>}</div></section></div>}
  </div>;
}
