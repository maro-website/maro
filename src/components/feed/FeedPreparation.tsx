"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, ImagePlus, LoaderCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { categoryIds, contentLabels, contentTypes, defaults, FEED_MAX_REFERENCES, type FeedBrief, type FeedCategory, type FeedContentType } from "@/lib/feed/model";
import { feedFonts, feedFormats } from "@/lib/feed/campaign";
import { feedMessage } from "@/lib/feed/client";
import type { PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import type { PendingFeedRequest } from "@/lib/feed/draft";
import { FeedBrandSettings, draftFeedDesign, type FeedDesignDraft } from "./FeedBrandSettings";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./FeedWorkspace.module.css";

export type FeedBrainState = { loading: boolean; ready: boolean; name?: string; description?: string; error?: string };
export function FeedElapsed({ startedAt }: { startedAt?: number }) {
  const start = useRef(startedAt ?? Date.now()), [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.floor((now - start.current) / 1000));
  return <span className={s.elapsed}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>;
}
type Props = {
  workspaceName: string; attachments: PrivateImageAttachment[]; draft: FeedDesignDraft; setDraft: (value: FeedDesignDraft) => void; designReady: boolean;
  remove: (id: string) => void; retry: (id: string) => void; previewError: (id: string, url: string) => void;
  pickFiles: () => void; upload: (files: File[]) => void; brainPicker: ReactNode;
  uploadBusy: boolean; working: boolean; loading: boolean; draftReady: boolean; draftSaved: boolean; planning: boolean; credits: number;
  brain: boolean; setBrain: (value: boolean) => void; brainState: FeedBrainState; brief: FeedBrief; patch: (key: keyof FeedBrief, value: string) => void;
  category: FeedCategory; setCategory: (value: FeedCategory) => void; contentType: FeedContentType; setContentType: (value: FeedContentType) => void;
  textMode: boolean; setTextMode: (value: boolean) => void; error: string; dismiss: () => void;
  pending: PendingFeedRequest | null; checking: boolean; checkRequest: () => void; start: () => void; reset: () => void;
};
export function FeedPreparation(p: Props) {
  const design = draftFeedDesign(p.draft, p.attachments), products = design.assets.filter(asset => asset.role === "product"), logo = design.assets.some(asset => asset.role === "logo");
  const referencesReady = p.attachments.length > 0 && p.attachments.every(item => item.status === "ready") && products.length > 0;
  const brandReady = p.brain ? p.brainState.ready : Boolean(p.brief.brand.trim() && p.brief.description.trim().length >= 8);
  const choicesReady = Boolean(p.draft.font && p.draft.format && p.designReady);
  const missing = !p.draftReady || p.loading ? "Po hapet përgatitja…" : p.uploadBusy ? "Prit sa të ngarkohen fotot." : !referencesReady ? "Shto së paku një produkt dhe kontrollo fotot që s’u hapën." : !brandReady ? p.brainState.loading && p.brain ? "Po lexohet maroBrain…" : "Plotëso brendin dhe përshkrimin, ose lidhe një maroBrain të plotësuar." : !choicesReady ? "Zgjedhe fontin dhe formatin; çdo produkt duhet të ketë vend në plan." : p.credits < 50 ? "Për këtë feed duhen 50 credits." : "";
  const disabled = p.working || p.checking || Boolean(missing);
  const locked = p.working || Boolean(p.pending);
  const atReferences = [feedMessage("too_many_references"), feedMessage("invalid_asset")].includes(p.error);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (p.error) errorRef.current?.scrollIntoView({ block: "nearest" }); }, [p.error]);
  const error = p.error && <div className={s.error} role="alert" ref={errorRef}><p>{p.error}</p><Button type="button" variant="ghost" size="icon" aria-label="Mbylle mesazhin" onClick={p.dismiss}><X size={16} /></Button></div>;
  const settings = { draft: p.draft, setDraft: p.setDraft, attachments: p.attachments, remove: p.remove, disabled: locked || p.uploadBusy || !p.draftReady, contentType: p.contentType, textMode: p.textMode };
  return <div className={s.form}>
    <section id="feed-references" className={s.formStep}>
      <div className={s.stepHeading}><span>1</span><div><h3>Produktet dhe referencat</h3><p>Zgjedh nga maroBrain ose ngarko foto të reja. Mundesh me i kombinu.</p></div><small>{p.attachments.length}/{FEED_MAX_REFERENCES}</small></div>
      {atReferences && error}
      <div className={s.referenceSources}>
        {p.brainPicker}
        <button className={s.referenceChoice} type="button" onClick={p.pickFiles} disabled={locked || p.uploadBusy || !p.draftReady || p.attachments.length >= FEED_MAX_REFERENCES} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!locked && !p.uploadBusy && p.draftReady) p.upload(Array.from(event.dataTransfer.files)); }}>{p.uploadBusy ? <LoaderCircle size={24} className={s.spin} /> : <ImagePlus size={24} />}<span><strong>{p.uploadBusy ? "Duke ngarkuar…" : "Ngarko të reja"}</strong><small>PNG, JPG, WebP · deri në 25 MB secila</small></span></button>
      </div>
      <FeedBrandSettings {...settings} section="references" retry={p.retry} retryDisabled={p.working || p.uploadBusy} previewError={p.previewError} />
    </section>
    <section id="feed-brand" className={s.formStep}>
      <div className={s.stepHeading}><span>2</span><div><h3>Brendi dhe drejtimi</h3><p>Trego çka ofron dhe çfarë fushate dëshiron.</p></div></div>
      <div className={s.contextRow}><div><strong>maroBrain</strong><p>{p.brain ? p.brainState.name || p.workspaceName : "Merri informatat e brendit automatikisht"}</p></div><Switch checked={p.brain} onChange={p.setBrain} disabled={locked || !p.draftReady} aria-label="Përdor maroBrain" /></div>
      {p.brain ? <div className={s.brainSummary} aria-live="polite">{p.brainState.loading ? <p>Po lexohet maroBrain…</p> : p.brainState.ready ? <><strong>{p.brainState.name}</strong><p>{p.brainState.description}</p></> : <><p>{p.brainState.error || "Plotëso emrin dhe përshkrimin në maroBrain, ose vazhdo me mini-formularin."}</p><Button type="button" variant="ghost" size="sm" onClick={() => p.setBrain(false)}>Plotëso vetë</Button></>}<Link className={s.inlineLink} href="/brain">Hape maroBrain <ArrowUpRight size={14} /></Link></div> : <>
        <label className={b.field}><span>Emri i brendit *</span><input className="maro-input" value={p.brief.brand} maxLength={120} disabled={locked || !p.draftReady} placeholder="p.sh. NOMA" onChange={event => p.patch("brand", event.target.value)} /></label>
        <label className={b.field}><span>Çka shet / ofron? *</span><textarea className="maro-input" value={p.brief.description} maxLength={1800} rows={3} disabled={locked || !p.draftReady} placeholder="Produkti, çka e bën të veçantë, për kë është…" onChange={event => p.patch("description", event.target.value)} /></label>
      </>}
      <div className={s.fieldPair}><label className={b.field}><span>Kategoria</span><select className="maro-input" value={p.category} disabled={locked} onChange={event => p.setCategory(event.target.value as FeedCategory)}>{categoryIds.map(id => <option key={id} value={id}>{defaults[id].label}</option>)}</select></label><label className={b.field}><span>Synimi</span><select className="maro-input" value={p.brief.goal} disabled={locked} onChange={event => p.patch("goal", event.target.value)}><option value="sales">Shitje</option><option value="engagement">Engagement</option><option value="launch">Lansim</option></select></label></div>
      <label className={b.field}><span>Drejtimi i fushatës</span><textarea className="maro-input" value={p.brief.notes} maxLength={1200} rows={3} placeholder="p.sh. Christmas themed: atmosferë festive, drita të ngrohta dhe skena dimërore…" disabled={locked} onChange={event => p.patch("notes", event.target.value)} /><small className={b.hint}>Tema dhe kërkesat që vlejnë për të gjitha postimet. Pretendimet dhe ofertat shkruaji vetëm nëse janë të sakta.</small></label>
      <details className={s.more}><summary className={b.promptSummary}>Audienca dhe ngjyrat · opsionale</summary><div className={s.form}>{!p.brain && <label className={b.field}><span>Audienca</span><input className="maro-input" value={p.brief.audience} maxLength={300} disabled={locked} placeholder="Kujt i drejtohet brendi yt?" onChange={event => p.patch("audience", event.target.value)} /></label>}<label className={b.field}><span>Ngjyrat</span><input className="maro-input" value={p.brief.colors} maxLength={100} disabled={locked} placeholder="p.sh. #233D2A, krem, portokalli" onChange={event => p.patch("colors", event.target.value)} /></label></div></details>
    </section>
    <section id="feed-appearance" className={s.formStep}>
      <div className={s.stepHeading}><span>3</span><div><h3>Pamja e postimeve</h3><p>Zgjedh formatin, fontin dhe llojin e përmbajtjes.</p></div></div>
      <FeedBrandSettings {...settings} section="appearance" />
      <label className={b.field}><span>Lloji i postimeve</span><select className="maro-input" value={p.contentType} disabled={locked} onChange={event => p.setContentType(event.target.value as FeedContentType)}>{contentTypes.map(type => <option key={type} value={type}>{contentLabels[type]}</option>)}</select><small className={b.hint}>{p.contentType === "mix" ? "9 koncepte me role të ndryshme: produkti, përdorimi, detajet dhe më shumë." : `9 postime “${contentLabels[p.contentType]}”, me kompozime të ndryshme.`}</small></label>
      <div className={s.contextRow}><div><strong>Tekst në imazhe</strong><p>{p.textMode ? "Tekst i shkurtër, kur i shërben kompozimit." : "Vetëm imazhe; ruhen etiketat e produktit dhe logoja."}</p></div><Switch checked={p.textMode} onChange={p.setTextMode} disabled={locked} aria-label="Tekst në imazhe" /></div>
      {p.textMode && <label className={b.field}><span>Gjuha në imazhe</span><select className="maro-input" value={p.brief.language} disabled={locked} onChange={event => p.patch("language", event.target.value)}><option value="sq">Shqip</option><option value="en">English</option></select></label>}
      <FeedBrandSettings {...settings} section="plan" />
    </section>
    <section className={s.reviewCard} aria-label="Përmbledhja para gjenerimit">
      <div className={s.reviewHeading}><div><h3>9 postime për feed-in tënd</h3><p>{p.draft.format ? feedFormats[p.draft.format] : "Zgjedh formatin"} · {p.draft.font ? feedFonts[p.draft.font] : "Zgjedh fontin"} · {p.textMode ? "Me tekst" : "Pa tekst"}{logo ? " · Me logo" : ""}</p></div><strong>50 <small>credits</small></strong></div>
      <ul className={s.readiness}>{([[referencesReady, "Referencat", "feed-references"], [brandReady, "Brendi", "feed-brand"], [choicesReady, "Pamja", "feed-appearance"]] as const).map(([ok, label, id]) => <li key={id} data-ready={ok}>{ok ? <CheckCircle2 size={16} /> : <Circle size={16} />}<a href={`#${id}`}>{label}</a></li>)}</ul>
      {p.pending && !p.planning && <div className={s.pendingRequest} role="status"><p>{p.checking ? "Po kontrollohet kërkesa e fundit…" : "Kërkesa e fundit ende nuk u verifikua. Kontrolloje ose riprovoje me të njëjtat zgjedhje; ruhet e njëjta kërkesë."}</p>{!p.checking && <Button type="button" variant="ghost" size="sm" onClick={p.checkRequest}>Kontrollo kërkesën</Button>}</div>}
      {p.planning || p.checking ? <div className={s.planningStatus} role="status"><LoaderCircle size={20} className={s.spin} /><div><strong>{p.planning ? "Po përgatitet plani i feed-it…" : "Po verifikohet kërkesa…"}</strong><p>{p.planning ? "Po lidhen produktet, 9 konceptet dhe stili i përbashkët." : "Po kontrollohet nëse feed-i është krijuar."}</p></div><FeedElapsed key={p.planning ? "planning" : "checking"} startedAt={p.checking ? p.pending?.startedAt : undefined} /></div> : null}
      {!atReferences && error}
      {missing && !p.planning && !p.checking && <p className={s.nextStep} id="feed-readiness" role="status">{missing}{p.credits < 50 && referencesReady && brandReady && choicesReady && <> <Link href="/pricing">Shto credits</Link></>}</p>}
      <div className={s.formActions}><Button type="button" variant="brand" disabled={disabled} aria-describedby={missing ? "feed-readiness" : undefined} onClick={p.start} icon={p.planning ? <LoaderCircle size={16} className={s.spin} /> : <Sparkles size={16} />}>{p.planning ? "Po përgatitet plani i feed-it…" : p.pending ? "Riprovo kërkesën · 50 credits" : "Ma maro feed-in · 50 credits"}</Button><Button type="button" variant="ghost" size="sm" disabled={locked || p.checking || Boolean(p.pending)} onClick={p.reset}>Pastro formularin</Button></div>
      <p className={b.hint}>3 rigjenerime falas për feed. Pastaj 5 credits secili.{p.draftSaved && <> Përgatitja ruhet në këtë tab.</>}</p>
      <details className={s.priceDetails}><summary>Si paguhet dhe si funksionon ndalimi?</summary><p>50 credits merren pasi të përgatitet plani: 5 për nisjen + 9 × 5 për imazhet. Nëse e ndal, ruhet imazhi që po përfundon dhe kthehen credits e imazheve që s’u krijuan.</p></details>
    </section>
  </div>;
}
