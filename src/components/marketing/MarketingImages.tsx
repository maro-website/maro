"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { ImagePlus, Check, Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Input } from "@/components/ui/Input";
import { useMaro } from "@/context/store";
import { marketingJson, marketingMessage } from "@/lib/marketing/client";
import { feedJson, feedStep, feedMessage, downloadFeed } from "@/lib/feed/client";
import { FEED_MAX_REFERENCES, type FeedView, type FeedBrief, type FeedCategory } from "@/lib/feed/model";
import { type AppBrief } from "@/lib/apps/model";
import { IMAGE_REFERENCE_ACCEPT, createPrivateImageAttachment, uploadOrResolvePrivateAttachment } from "@/lib/services/privateImageAttachment";
import s from "./MarketingWorkspace.module.css";

type Reference = { id: string; name: string; ref: string; url: string | null };
type Preparation = { references: Reference[]; brief: FeedBrief; category: FeedCategory };
type Studio = "feed" | "apps";
type Session = { studio: Studio; feed: FeedView };
export function MarketingImages({ workspaceId, campaignId, count, onImport, onBusyChange }: { workspaceId: string; campaignId: string; count: number; onImport: (id: string, studio: Studio) => Promise<void>; onBusyChange: (busy: boolean) => void }) {
  const { refreshProfile } = useMaro();
  const [open, setOpen] = React.useState(false), [preparation, setPreparation] = React.useState<Preparation | null>(null);
  const [session, setSession] = React.useState<Session | null>(null), [studio, setStudio] = React.useState<Studio>("feed");
  const [chosen, setChosen] = React.useState<string[]>([]), [busy, setBusy] = React.useState(false), [loading, setLoading] = React.useState(true), [uploading, setUploading] = React.useState(false), [error, setError] = React.useState("");
  const [platform, setPlatform] = React.useState<"ios" | "android">("ios"), [benefit, setBenefit] = React.useState("");
  const alive = React.useRef(true), lock = React.useRef(false), stopped = React.useRef(false), createId = React.useRef("");
  const fileInput = React.useRef<HTMLInputElement>(null), importer = React.useRef(onImport), busyCallback = React.useRef(onBusyChange);
  importer.current = onImport; busyCallback.current = onBusyChange;
  const remember = React.useCallback(async (next: Session) => {
    if (!alive.current) return;
    setSession(next);
    if (next.feed.tiles.some(t => t.url)) await importer.current(next.feed.id, next.studio);
  }, []);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; stopped.current = true; }; }, []);
  React.useEffect(() => {
    void (async () => {
      try {
        const results = await Promise.all((["feed", "apps"] as const).map(async imageStudio => {
          const { feeds } = await feedJson<{ feeds: { id: string; createdAt: string; refunded: boolean }[] }>(`/api/${imageStudio}?workspaceId=${encodeURIComponent(workspaceId)}&marketingCampaignId=${campaignId}`);
          return feeds.filter(f => !f.refunded).map(f => ({ ...f, studio: imageStudio }));
        }));
        const latest = results.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (latest && alive.current) {
          const { feed } = await feedJson<{ feed: FeedView }>(`/api/${latest.studio}?feedId=${latest.id}`);
          await remember({ studio: latest.studio, feed });
        }
      } catch (e) { if (alive.current) setError(feedMessage((e as Error).message)); }
      finally { if (alive.current) setLoading(false); }
    })();
  }, [workspaceId, campaignId, remember]);
  React.useEffect(() => {
    if (!session?.feed.active || busy) return;
    const timer = setInterval(() => { void feedJson<{ feed: FeedView }>(`/api/${session.studio}?feedId=${session.feed.id}`).then(({ feed }) => remember({ studio: session.studio, feed })).catch(e => { if (alive.current) setError(feedMessage(e.message)); }); }, 6000);
    return () => clearInterval(timer);
  }, [session, busy, remember]);
  async function show() {
    setOpen(true); setError("");
    if (preparation || session) return;
    try { const data = await marketingJson<Preparation>(`/api/marketing/images?workspaceId=${encodeURIComponent(workspaceId)}&campaignId=${campaignId}`); if (alive.current) setPreparation(data); }
    catch (e) { if (alive.current) setError(marketingMessage((e as Error).message)); }
  }
  async function upload(files: File[]) {
    if (!files.length || busy || uploading || !preparation) return;
    if (chosen.length + files.length > FEED_MAX_REFERENCES) { setError(feedMessage("too_many_references")); return; }
    setUploading(true); setError("");
    try {
      for (const file of files) {
        const attachment = createPrivateImageAttachment(file, crypto.randomUUID(), true);
        if (attachment.error) throw new Error(attachment.error);
        const ready = await uploadOrResolvePrivateAttachment(attachment);
        if (!ready.storageRef || ready.status !== "ready") throw new Error(ready.error || "Ngarkimi nuk u përfundua. Provo përsëri.");
        if (!alive.current) return;
        const ref = ready.storageRef;
        setPreparation(p => p && ({ ...p, references: [...p.references, { id: ready.id, name: ready.name, ref, url: ready.previewUrl }] }));
        setChosen(v => [...v, ref]);
      }
      createId.current = "";
    } catch (e) { if (alive.current) setError((e as Error).message); }
    finally { if (alive.current) setUploading(false); }
  }
  async function generate() {
    if (lock.current) return;
    lock.current = true; stopped.current = false; setBusy(true); busyCallback.current(true); setError("");
    let current = session;
    try {
      if (!current) {
        if (!preparation || !chosen.length) return;
        const refs = studio === "apps" ? chosen.slice(0, 6) : chosen;
        const mobile: AppBrief | undefined = studio === "apps" ? { screenshots: refs.map(reference => ({ reference, platform, feature: "" })), devices: [platform === "ios" ? "iphone-18-pro" : "galaxy-s26"], benefit, features: benefit, problem: "", goal: "awareness", availability: "coming-soon", environment: "studio", environmentNotes: "", mood: "bold", style: "minimal", format: "1:1", appStoreUrl: "", playStoreUrl: "" } : undefined;
        const requestId = createId.current ||= crypto.randomUUID();
        const { feed } = await feedJson<{ feed: FeedView }>(`/api/${studio}`, { workspaceId, requestId, marketingCampaignId: campaignId, references: refs, category: mobile ? "tech" : preparation.category, useBrain: true, contentType: "mix", textMode: true, brief: preparation.brief, ...(mobile ? { mobile } : {}) });
        current = { studio, feed }; await remember(current);
      }
      while (alive.current && !stopped.current && !current.feed.cancelled && !current.feed.refunded && current.feed.tiles.some(t => !t.url)) {
        if (current.feed.active) throw new Error("feed_busy");
        const result = await feedStep({ feedId: current.feed.id, requestId: crypto.randomUUID(), action: "next" }, current.studio);
        if (result.feed) { current = { ...current, feed: result.feed }; await remember(current); }
        if (result.error) throw new Error(result.error);
        if (!result.feed) throw new Error("recovery_pending");
      }
    } catch (e) {
      if (alive.current) setError(feedMessage((e as Error).message));
      if (current && alive.current) {
        try { const { feed } = await feedJson<{ feed: FeedView }>(`/api/${current.studio}?feedId=${current.feed.id}`); await remember({ ...current, feed }); } catch { /* The saved feed is restored on reload. */ }
      }
    } finally { lock.current = false; if (alive.current) { setBusy(false); busyCallback.current(false); void refreshProfile(); } }
  }
  async function cancel() {
    if (!session) return;
    stopped.current = true;
    try { const { feed } = await feedJson<{ feed: FeedView }>(`/api/${session.studio}/action`, { feedId: session.feed.id, requestId: crypto.randomUUID(), action: "cancel" }); await remember({ ...session, feed }); void refreshProfile(); }
    catch (e) { if (alive.current) setError(feedMessage((e as Error).message)); }
  }
  const ready = session?.feed.tiles.filter(t => t.url).length ?? count;
  const complete = ready === 9, cancelled = session?.feed.cancelled || session?.feed.refunded || session?.feed.cancelRequested;
  const changeSelection = (ref: string) => { setChosen(v => v.includes(ref) ? v.filter(r => r !== ref) : v.length < (studio === "apps" ? 6 : FEED_MAX_REFERENCES) ? [...v, ref] : v); createId.current = ""; };
  return <div className={s.imageAction}>
    <Button variant={complete ? "secondary" : "brand"} disabled={loading} onClick={() => void show()}><ImagePlus size={18} />{busy ? `Po gjenerohet ${Math.min(ready + 1, 9)}/9…` : complete ? "Imazhet janë gati" : session ? "Vazhdo imazhet" : "Gjenero imazhet"}</Button>
    <span className={s.muted} role="status">{ready}/9 imazhe</span>
    {error && !open && <p className={s.inlineError} role="alert">{error}</p>}
    <Modal open={open} onClose={() => setOpen(false)} size="lg" aria-label="Gjenero imazhet e planit"><div className={s.modal}>
      <div><h2>{session ? complete ? "Imazhet janë gati" : "Imazhet e planit" : "Zgjedhi fotot e brendit"}</h2><p className={s.muted}>{session ? "Çdo imazh ruhet vetë te postimi përkatës." : "Brain-i dhe plani janë lidhur. Duhet vetëm fotoja reale e produktit ose shërbimit."}</p></div>
      {error && <p className={s.inlineError} role="alert">{error}</p>}
      {session ? <>
        <progress className={s.progress} value={ready} max={9} aria-label="Imazhe të përfunduara" /><p className={s.muted}>{ready}/9 të përfunduara{session.feed.active ? " · Një imazh po përgatitet…" : ""}</p>
        <div className={s.imagePreviews}>{session.feed.tiles.filter(t => t.url).map(t => <img key={t.slot} src={t.url!} alt={`Postimi ${t.slot + 1}`} />)}</div>
        {cancelled && <p className={s.muted}>Gjenerimi u ndal. {session.feed.refundCredits} credits u kthyen; imazhet e përfunduara ruhen.</p>}
        <div className={s.actions}>{!complete && !cancelled && <Button variant="brand" loading={busy} disabled={Boolean(session.feed.active) && !busy} onClick={() => void generate()}>Vazhdo gjenerimin</Button>}{ready > 0 && <Button variant="secondary" onClick={() => void downloadFeed(session.feed.id, undefined, session.studio).catch(e => setError(feedMessage(e.message)))}><Download size={16} />Shkarko imazhet</Button>}{!complete && !cancelled && <Button variant="ghost" onClick={() => void cancel()}>Ndalo & kthe credits e papërdorura</Button>}</div>
      </> : preparation ? <>
        <div className={s.referenceGrid}>{preparation.references.map(r => <button className={s.reference} type="button" key={r.ref} aria-pressed={chosen.includes(r.ref)} disabled={busy || uploading} onClick={() => changeSelection(r.ref)}>{r.url && <img src={r.url} alt={r.name} />}<span>{r.name}</span>{chosen.includes(r.ref) && <Check size={18} />}</button>)}<Button className={s.uploadButton} variant="secondary" disabled={busy || uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={22} />{uploading ? "Po ngarkohet…" : "Ngarko foto"}</Button></div>
        <input ref={fileInput} type="file" multiple accept={IMAGE_REFERENCE_ACCEPT} hidden onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <details className={s.details}><summary>Po promovon një app?</summary><div className={s.form}><Field label="Lloji"><Select value={studio} disabled={busy} onChange={e => { setStudio(e.target.value as Studio); setChosen([]); createId.current = ""; }}><option value="feed">Produkt ose shërbim · maroFeed</option><option value="apps">App me screenshots · maroApps</option></Select></Field>{studio === "apps" && <><Field label="Screenshots janë nga"><Select value={platform} disabled={busy} onChange={e => { setPlatform(e.target.value as typeof platform); createId.current = ""; }}><option value="ios">iOS · iPhone</option><option value="android">Android · Samsung</option></Select></Field><Field label="Çka bën app-i?" hint="Një veçori ose përfitim real që shihet në screenshots."><Input value={benefit} minLength={8} maxLength={400} disabled={busy} onChange={e => { setBenefit(e.target.value); createId.current = ""; }} /></Field></>}</div></details>
        <p className={s.muted}>9 imazhe · 50 credits gjithsej. Imazhet shtohen vetë në plan.</p>
        <div className={s.actions}><Button variant="brand" loading={busy} disabled={!chosen.length || uploading || (studio === "apps" && (benefit.trim().length < 8 || !preparation.brief.audience))} onClick={() => void generate()}>Gjenero 9 imazhe · 50 credits</Button><Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}><X size={16} />Mbyll</Button></div>
      </> : <><p className={s.muted} role="status">Po hapen fotot e Brain-it…</p>{error && <Button variant="secondary" onClick={() => void show()}>Provo përsëri</Button>}</>}
    </div></Modal>
  </div>;
}
