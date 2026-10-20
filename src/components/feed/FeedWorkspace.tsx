"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Check, Grid3X3, ImagePlus, LoaderCircle, RefreshCw, Sparkles, X, History, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { IMAGE_REFERENCE_ACCEPT, createPrivateImageAttachment, uploadOrResolvePrivateAttachment, type PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import { canUseFeed, categoryIds, defaults, roles, type FeedBrief, type FeedCategory, type FeedView } from "@/lib/feed/model";
import { downloadFeed, feedJson, feedMessage, feedStep } from "@/lib/feed/client";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Logo } from "@/components/ui/Logo";
import b from "@/components/modules/BrainStudio.module.css";
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
  const [tab, setTab] = React.useState<"prepare" | "feed" | "history">("prepare");
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
    setTab("feed");
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
  return <div className={`${b.studio} ${s.studio}`}>
    <header className={b.header}>
      <div className={b.mastheadCopy}>
        <h1 className={s.wordmark} aria-label="maroFeed"><Logo showWord wordClassName={s.maroWord} /><span>Feed</span></h1>
        <p>Krijo 9 postime me identitetin e brendit tënd.</p>
        <div className={b.saveStatus}><span role="status" className={b.hint}><Check size={14} aria-hidden="true" />Pilot privat · 9 imazhe · 50 credits</span></div>
      </div>
      <div className={b.mastheadArt} aria-hidden="true">
        <svg viewBox="0 0 340 180" fill="none"><path d="M14 42H82Q108 42 126 66L170 90M0 130H76Q110 130 132 111L170 90M326 33H265Q239 33 220 60L170 90M340 141H262Q231 141 214 117L170 90" /><circle cx="14" cy="42" r="4" /><circle cx="0" cy="130" r="3" /><circle cx="326" cy="33" r="3" /><circle cx="340" cy="141" r="4" /></svg>
        <span className={s.headerIcon}><Grid3X3 size={40} strokeWidth={1.5} /></span>
      </div>
    </header>
    <div className={b.layout}>
      <aside className={b.sidebar}>
        <div className={b.workspace}><span>Workspace</span><div className={`maro-input ${s.workspaceName}`}>{workspaceName}</div></div>
        <nav className={b.sectionNav} aria-label="Seksionet e maroFeed">
          <button type="button" aria-current={tab === "prepare" ? "page" : undefined} onClick={() => setTab("prepare")}><SlidersHorizontal size={18} /><span>Përgatitja</span></button>
          <button type="button" aria-current={tab === "feed" ? "page" : undefined} onClick={() => setTab("feed")}><Grid3X3 size={18} /><span>Feed-i yt</span><small>{done}/9</small></button>
          <button type="button" aria-current={tab === "history" ? "page" : undefined} onClick={() => setTab("history")}><History size={18} /><span>Historiku</span><small>{history.length}</small></button>
        </nav>
        <div className={b.sidebarProgress}><div className={b.row}><span>Postime të përfunduara</span><strong>{done}/9</strong></div><div className={b.progress}><span style={{ width: `${done / 9 * 100}%` }} /></div><p className={s.sidebarNote}>3 rigjenerime falas për feed.<br />Pastaj 5 credits secili.</p></div>
      </aside>
      <main className={b.main}>
        <section className={b.hero} aria-label="Përmbledhja e feed-it">
          <div className={b.brandIdentity}><div className={b.heroLogo}>{attachment?.previewUrl ? <img src={attachment.previewUrl} alt="Produkti i ngarkuar" /> : <Grid3X3 size={24} />}</div><div><h2>{feed?.brand || brief.brand || workspaceName}</h2><p>{brain ? "Me kontekst nga maroBrain" : "Me informatat e brendit tënd"}</p></div></div>
          <div className={s.summary}><span>{working ? "Po krijohet, një nga një…" : completeFeed ? "Feed-i është gati." : feed?.refunded ? "Credits u kthyen." : "9 imazhe · format katror"}</span><strong>{done}/9</strong></div>
        </section>
        {error && <div className={s.error} role="alert"><p>{error}</p><Button variant="ghost" size="icon" aria-label="Mbylle mesazhin" onClick={() => setError("")}><X size={16} /></Button></div>}
        {tab === "prepare" && <section className={b.editor} aria-label="Përgatitja e feed-it">
          <div className={b.sectionHeading}><div><h2>Përgatite feed-in</h2><p>Ngarko produktin dhe shto informatat që na duhen për brendin.</p></div></div>
          <div className={s.form}>
            <button className={`${b.dropZone} ${s.upload}`} type="button" onClick={() => fileInput.current?.click()} disabled={working}>
              {attachment?.previewUrl ? <img src={attachment.previewUrl} alt="Produkti i ngarkuar" /> : attachment?.status === "uploading" ? <LoaderCircle className={s.spin} size={24} /> : <ImagePlus size={28} />}
              <strong>{attachment?.name ?? "Ngarko produktin ose brendin"}</strong><small>{attachment?.status === "ready" ? "U ngarkua · kliko për ta ndërruar" : "PNG, JPG ose WebP · deri në 25 MB"}</small>
            </button>
            <input ref={fileInput} type="file" accept={IMAGE_REFERENCE_ACCEPT} className={s.hidden} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
            {attachment && <div className={b.actions}><Button variant="ghost" size="sm" disabled={working} onClick={() => { setAttachment(null); setError(""); }}>Hiqe imazhin</Button></div>}
            <div className={s.contextRow}><div><strong>maroBrain</strong><p>{brain ? workspaceName : "Përdore kujtesën e brendit"}</p></div><Switch checked={brain} onChange={setBrain} disabled={working} aria-label="Përdor maroBrain" /></div>
            {brain ? <div className={b.hint}>Identiteti, audienca, ngjyrat dhe rregullat merren nga maroBrain i këtij workspace. <Link className={s.inlineLink} href="/brain">Hape maroBrain <ArrowUpRight size={14} /></Link></div> : <>
              <label className={b.field}><span>Emri i brendit</span><input className="maro-input" value={brief.brand} maxLength={120} disabled={working} placeholder="p.sh. NOMA" onChange={e => patch("brand", e.target.value)} /></label>
              <label className={b.field}><span>Çka shet / ofron?</span><textarea className="maro-input" value={brief.description} maxLength={1800} disabled={working} placeholder="Produkti, çka e bën të veçantë, për kë është…" rows={3} onChange={e => patch("description", e.target.value)} /></label>
              <label className={b.field}><span>Audienca <small className={b.hint}>(opsionale)</small></span><input className="maro-input" value={brief.audience} maxLength={300} disabled={working} placeholder="Kujt i drejtohet brendi yt?" onChange={e => patch("audience", e.target.value)} /></label>
            </>}
            <div className={s.fieldPair}><label className={b.field}><span>Kategoria</span><select className="maro-input" value={category} disabled={working} onChange={e => setCategory(e.target.value as FeedCategory)}>{categoryIds.map(id => <option key={id} value={id}>{defaults[id].label}</option>)}</select></label><label className={b.field}><span>Synimi</span><select className="maro-input" value={brief.goal} disabled={working} onChange={e => patch("goal", e.target.value)}><option value="sales">Shitje</option><option value="engagement">Engagement</option><option value="launch">Lansim</option></select></label></div>
            <label className={b.field}><span>Gjuha në imazhe</span><select className="maro-input" value={brief.language} disabled={working} onChange={e => patch("language", e.target.value)}><option value="sq">Shqip</option><option value="en">English</option></select></label>
            <details className={s.more}><summary className={b.promptSummary}>Më shumë drejtim (opsionale)</summary><div className={s.form}><label className={b.field}><span>Ngjyrat</span><input className="maro-input" value={brief.colors} maxLength={100} placeholder="p.sh. #233D2A, krem, portokalli" onChange={e => patch("colors", e.target.value)} disabled={working} /></label><label className={b.field}><span>Çka duhet me ditë?</span><textarea className="maro-input" value={brief.notes} maxLength={1200} rows={3} placeholder="Fushata, oferta e saktë, stili ose gjërat që duhen shmangur…" onChange={e => patch("notes", e.target.value)} disabled={working} /></label></div></details>
            <div className={s.formActions}><Button variant="brand" disabled={working || loading || attachment?.status !== "ready" || credits < 50 || (!brain && (!brief.brand.trim() || brief.description.trim().length < 8))} onClick={() => void start()} icon={<Sparkles size={16} />}>Ma maro feed-in · 50 credits</Button><p className={b.hint}>9 imazhe · 3 rigjenerime falas.<br />Pastaj 5 credits për rigjenerim.</p></div>
          </div>
        </section>}
        {tab === "feed" && <section className={b.editor} aria-label="Feed-i me nëntë postime">
          <div className={b.sectionHeading}><div><h2>Feed-i yt</h2><p>{completeFeed ? `${free} rigjenerime falas të mbetura.` : "Postimet krijohen një nga një dhe ruhen automatikisht."}</p></div><span className={b.hint}>1:1 · 1024 px</span></div>
          {working && <div className={`${b.progress} ${s.feedProgress}`} role="progressbar" aria-label="Postimet e përfunduara" aria-valuenow={done} aria-valuemin={0} aria-valuemax={9}><span style={{ width: `${done / 9 * 100}%` }} /></div>}
          <div className={s.grid}>{tiles.map(tile => <button type="button" key={tile.slot} className={`${b.sourceCard} ${s.tile}`} data-working={active === tile.slot && working} onClick={() => { if (tile.url) { setSelected(tile.slot); setFeedback(""); } }} disabled={!tile.url} aria-label={`${tile.slot + 1}. ${tile.title}${tile.url ? ", hape imazhin" : ", ende pa u krijuar"}`}>
            <span className={s.tileImage}>{tile.url ? <img src={tile.url} alt={`${feed?.brand} · ${tile.title}`} /> : <ImageIcon size={28} strokeWidth={1.5} aria-hidden="true" />}{active === tile.slot && working && <span className={s.tileOverlay}><LoaderCircle className={s.spin} size={24} /><strong>Po marohet…</strong></span>}</span>
            <span className={s.tileInfo}><strong>{String(tile.slot + 1).padStart(2, "0")} · {tile.title}</strong>{tile.url ? <span><Check size={12} />{tile.version > 1 ? `v${tile.version}` : "Gati"}</span> : null}</span>
          </button>)}</div>
          <div className={s.feedActions}>{completeFeed ? <Button variant="primary" disabled={downloading} onClick={() => void download()} icon={<ArrowDownToLine size={16} />}>{downloading ? "Po përgatitet…" : "Shkarko 9 imazhet · ZIP"}</Button> : feed && !feed.refunded ? <Button variant="brand" disabled={working} onClick={() => void run(() => complete(feed))} icon={<Sparkles size={16} />}>Vazhdo feed-in · pa pagesë shtesë</Button> : <Button variant="secondary" onClick={() => setTab("prepare")}>Përgatite feed-in</Button>}</div>
          {feed && !done && !working && !feed.refunded && feed.lastError && <Button variant="ghost" onClick={() => void run(async () => { const data = await feedJson<{ feed: FeedView }>("/api/feed/action", { feedId: feed.id, requestId: crypto.randomUUID(), action: "refund" }); remember(data.feed); })}>Anulo feed-in dhe kthe 50 credits</Button>}
        </section>}
        {tab === "history" && <section className={b.editor} aria-label="Historiku i feed-ave"><div className={b.sectionHeading}><div><h2>Feed-at e tu</h2><p>Progresi ruhet automatikisht.</p></div></div>{history.length ? <div className={s.history}>{history.map(item => <button type="button" key={item.id} disabled={working} aria-pressed={item.id === feed?.id} onClick={() => void run(async () => { const data = await feedJson<{ feed: FeedView }>(`/api/feed?feedId=${item.id}`); remember(data.feed); })}><Grid3X3 size={18} /><strong>{item.brand}</strong><span>{new Intl.DateTimeFormat("sq", { day: "numeric", month: "short" }).format(new Date(item.createdAt))}</span><ArrowUpRight size={16} /></button>)}</div> : <div className={b.empty}><History size={24} /><h3>Ende nuk ke krijuar feed.</h3><p>Feed-at që krijon do t’i gjesh këtu.</p></div>}</section>}
        <p className={b.footnote}>Kur të vijë <strong>maroMarketing</strong>, mundesh me kriju edhe captions për këto postime.</p>
      </main>
    </div>
    {selected !== null && feed?.tiles[selected]?.url && <div className={s.modalBackdrop} onClick={() => setSelected(null)}><section className={s.modal} role="dialog" aria-modal="true" aria-label={`Postimi ${selected + 1}`} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setSelected(null); }}><Button className={s.modalClose} variant="secondary" size="icon" autoFocus aria-label="Mbylle imazhin" onClick={() => setSelected(null)}><X size={20} /></Button><img src={feed.tiles[selected].url!} alt={`${feed.brand} · ${roles[selected].title}`} /><div className={s.modalInfo}><div><p className={b.hint}>Postimi {selected + 1} / 9</p><h2>{roles[selected].title}</h2></div>{error && <p role="alert" className={b.hint}>{error}</p>}<Button variant="secondary" disabled={downloading} onClick={() => void download(selected)} icon={<ArrowDownToLine size={16} />}>Shkarko PNG</Button>{completeFeed && <><label className={b.field}><span>Çka dëshiron me ndryshu? <small className={b.hint}>(opsionale)</small></span><textarea className="maro-input" value={feedback} maxLength={600} rows={3} disabled={working} placeholder="p.sh. Më pak tekst, dritë më e ngrohtë…" onChange={e => setFeedback(e.target.value)} /></label><Button variant="brand" disabled={working || (!free && credits < 5)} onClick={() => void regenerate()} icon={working ? <LoaderCircle size={16} className={s.spin} /> : <RefreshCw size={16} />}>Rigjenero · {free ? `Falas · ${free} të mbetura` : "5 credits"}</Button><p className={b.hint}>Imazhi aktual mbetet deri sa të jetë gati versioni i ri.</p></>}</div></section></div>}
  </div>;
}
