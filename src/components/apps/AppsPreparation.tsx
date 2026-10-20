"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { ImagePlus, LoaderCircle, Smartphone, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { IMAGE_REFERENCE_ACCEPT, createPrivateImageAttachment, uploadOrResolvePrivateAttachment, type PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import { contentTypes, type FeedBrief, type FeedContentType } from "@/lib/feed/model";
import { appBriefSchema, appReferences, deviceCatalog, deviceIds, appFormats, appGoals, appContentLabels, appRoles, environments, moods, styles, createAppSchema, type AppBrief } from "@/lib/apps/model";
import b from "@/components/modules/BrainStudio.module.css";
import s from "@/components/feed/FeedWorkspace.module.css";

type Upload = PrivateImageAttachment & { purpose: "screenshot" | "icon" | "style"; platform: "ios" | "android"; feature: string };
export type AppDraft = { brief: FeedBrief; mobile: Omit<AppBrief, "screenshots" | "icon" | "styleReference">; uploads: Upload[]; contentType: FeedContentType; textMode: boolean; useBrain: boolean };
export const initialAppDraft: AppDraft = {
  brief: { brand: "", description: "", audience: "", goal: "launch", language: "sq", colors: "", notes: "" },
  mobile: { devices: ["iphone-18-pro"], benefit: "", features: "", problem: "", goal: "installs", availability: "live", environment: "studio", environmentNotes: "", mood: "premium", style: "minimal", format: "4:5", appStoreUrl: "", playStoreUrl: "" },
  uploads: [], contentType: "mix", textMode: true, useBrain: false,
};
export function appDraftPayload(draft: AppDraft) {
  const mobile = { ...draft.mobile,
    screenshots: draft.uploads.filter(u => u.purpose === "screenshot").map(u => ({ reference: u.storageRef ?? "", platform: u.platform, feature: u.feature })),
    ...(draft.uploads.find(u => u.purpose === "icon")?.storageRef ? { icon: draft.uploads.find(u => u.purpose === "icon")!.storageRef } : {}),
    ...(draft.uploads.find(u => u.purpose === "style")?.storageRef ? { styleReference: draft.uploads.find(u => u.purpose === "style")!.storageRef } : {}),
  };
  const parsed = appBriefSchema.safeParse(mobile);
  return { brief: draft.brief, mobile, references: parsed.success ? appReferences(parsed.data) : [], contentType: draft.contentType, textMode: draft.textMode, useBrain: draft.useBrain, category: "tech" as const };
}
export function AppsPreparation({ draft, setDraft, working, loading, credits, start, onUploadBusy }: { draft: AppDraft; setDraft: React.Dispatch<React.SetStateAction<AppDraft>>; working: boolean; loading: boolean; credits: number; start: () => void; onUploadBusy: (busy: boolean) => void }) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");
  const uploadLock = React.useRef(false), alive = React.useRef(true);
  const input = React.useRef<HTMLInputElement>(null);
  const purpose = React.useRef<Upload["purpose"]>("screenshot");
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const brief = (key: keyof FeedBrief, value: string) => setDraft(d => ({ ...d, brief: { ...d.brief, [key]: value } }));
  const mobile = <K extends keyof AppDraft["mobile"]>(key: K, value: AppDraft["mobile"][K]) => setDraft(d => ({ ...d, mobile: { ...d.mobile, [key]: value } }));
  function choose(kind: Upload["purpose"]) { purpose.current = kind; input.current?.click(); }
  async function upload(files: File[], kind = purpose.current) {
    if (working || uploadLock.current || !files.length) return;
    const count = draft.uploads.filter(u => u.purpose === kind).length;
    if (count + files.length > (kind === "screenshot" ? 6 : 1)) { setUploadError(kind === "screenshot" ? "Mund të ngarkosh deri në 6 screenshots." : "Hiqe imazhin ekzistues para se ta zëvendësosh."); return; }
    uploadLock.current = true; setUploading(true); onUploadBusy(true); setUploadError("");
    const platform = deviceCatalog[draft.mobile.devices[0] ?? "iphone-18-pro"].platform;
    const items = files.map(file => ({ ...createPrivateImageAttachment(file, crypto.randomUUID(), true), purpose: kind, platform, feature: "" }));
    setDraft(d => ({ ...d, uploads: [...d.uploads, ...items] }));
    try {
      for (const item of items) {
        if (item.error) continue;
        let result: PrivateImageAttachment;
        try { result = await uploadOrResolvePrivateAttachment(item); }
        catch { result = { ...item, status: "upload-error", error: "Ngarkimi dështoi. Hiqe dhe provo përsëri." }; }
        if (alive.current) setDraft(d => ({ ...d, uploads: d.uploads.map(u => u.id === item.id ? { ...u, ...result } : u) }));
      }
    } finally { uploadLock.current = false; if (alive.current) { setUploading(false); onUploadBusy(false); } }
  }
  const payload = appDraftPayload(draft);
  const validation = createAppSchema.safeParse({ ...payload, requestId: "11111111-1111-4111-8111-111111111111", workspaceId: "preview" });
  const ready = validation.success && draft.uploads.every(u => u.status === "ready");
  const screenshots = draft.uploads.filter(u => u.purpose === "screenshot");
  const missingPlatforms = [...new Set(draft.mobile.devices.map(id => deviceCatalog[id].platform))].filter(platform => !screenshots.some(u => u.platform === platform && u.status === "ready"));
  const requirements = [
    !draft.brief.brand.trim() && "emri i app-it", draft.brief.description.trim().length < 8 && "çka bën app-i",
    !draft.brief.audience.trim() && "audienca", draft.mobile.benefit.trim().length < 8 && "përfitimi kryesor",
    draft.mobile.features.trim().length < 8 && "veçoritë reale", !draft.mobile.devices.length && "së paku një pajisje",
    ...missingPlatforms.map(p => `screenshot ${p === "ios" ? "iOS" : "Android"}`),
  ].filter(Boolean);
  function uploadCard(item: Upload, index: number) { return <article key={item.id} className={b.sourceCard}>
    <div className={s.referencePreview}>{item.previewUrl ? <img src={item.previewUrl} alt={item.name} /> : item.error ? <ImagePlus size={20} /> : <LoaderCircle size={20} className={s.spin} />}</div>
    <div className={s.referenceInfo}><strong title={item.name}>{item.name}</strong><small>{item.error || (item.status === "ready" ? item.purpose === "screenshot" ? `Screenshot ${index + 1}` : item.purpose === "icon" ? "Ikona e app-it" : "Vetëm stil / atmosferë" : "Duke ngarkuar…")}</small>
      {item.purpose === "screenshot" && <><label className={b.field}><span>Platforma</span><select aria-label={`Platforma e screenshot ${index + 1}`} className="maro-input" value={item.platform} disabled={working || uploading} onChange={e => setDraft(d => ({ ...d, uploads: d.uploads.map(u => u.id === item.id ? { ...u, platform: e.target.value as Upload["platform"] } : u) }))}><option value="ios">iOS</option><option value="android">Android</option></select></label><input aria-label={`Veçoria në screenshot ${index + 1}`} className="maro-input" maxLength={100} placeholder="Çka shihet? p.sh. Kalendari" value={item.feature} disabled={working || uploading} onChange={e => setDraft(d => ({ ...d, uploads: d.uploads.map(u => u.id === item.id ? { ...u, feature: e.target.value } : u) }))} /></>}
      <Button size="sm" variant="ghost" disabled={working || uploading} onClick={() => setDraft(d => ({ ...d, uploads: d.uploads.filter(u => u.id !== item.id) }))} icon={<X size={12} />}>Hiqe</Button>
    </div></article>; }
  return <div className={s.form}>
    <div className={b.sectionHeading}><div><h3>01 · App-i dhe vlera e tij</h3><p>Një reklamë e mirë tregon çka zgjidh app-i, për kë është dhe pse ia vlen.</p></div></div>
    <label className={b.field}><span>Emri i app-it</span><input className="maro-input" value={draft.brief.brand} maxLength={120} disabled={working} placeholder="p.sh. Planly" onChange={e => brief("brand", e.target.value)} /></label>
    <label className={b.field}><span>Çka bën app-i?</span><textarea className="maro-input" value={draft.brief.description} maxLength={1800} rows={3} disabled={working} placeholder="Planifikon detyrat dhe kalendarin në një vend…" onChange={e => brief("description", e.target.value)} /></label>
    <label className={b.field}><span>Për kë është?</span><input className="maro-input" value={draft.brief.audience} maxLength={300} disabled={working} placeholder="p.sh. Freelancerë që menaxhojnë disa projekte" onChange={e => brief("audience", e.target.value)} /></label>
    <label className={b.field}><span>Përfitimi kryesor</span><input className="maro-input" value={draft.mobile.benefit} maxLength={400} disabled={working} placeholder="p.sh. E sheh krejt ditën tënde me një shikim" onChange={e => mobile("benefit", e.target.value)} /></label>
    <label className={b.field}><span>Veçoritë që app-i i ka realisht</span><textarea className="maro-input" value={draft.mobile.features} maxLength={1200} rows={3} disabled={working} placeholder="Një për rresht: Kalendar · Lista detyrash · Përkujtime…" onChange={e => mobile("features", e.target.value)} /><small className={b.hint}>Reklamat ndërtohen mbi këto veçori dhe screenshot-et e tua.</small></label>
    <div className={s.fieldPair}><label className={b.field}><span>Synimi i reklamës</span><select className="maro-input" value={draft.mobile.goal} disabled={working} onChange={e => mobile("goal", e.target.value as AppBrief["goal"])}>{Object.entries(appGoals).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className={b.field}><span>Disponueshmëria</span><select className="maro-input" value={draft.mobile.availability} disabled={working} onChange={e => mobile("availability", e.target.value as AppBrief["availability"])}><option value="live">App-i është live</option><option value="coming-soon">Së shpejti / waitlist</option></select></label></div>
    <div className={b.sectionHeading}><div><h3>02 · Pajisjet dhe screenshot-et</h3><p>Zgjedh pajisjet e fushatës. Për secilën platformë duhet screenshot-i përkatës.</p></div></div>
    <fieldset className={s.deviceOptions} disabled={working}><legend className={b.hint}>Modelet aktuale · tetor 2026</legend>{deviceIds.map(id => <label key={id} className={s.deviceOption}><input type="checkbox" checked={draft.mobile.devices.includes(id)} onChange={e => mobile("devices", e.target.checked ? [...draft.mobile.devices, id] : draft.mobile.devices.filter(d => d !== id))} /><Smartphone size={18} /><span>{deviceCatalog[id].label}</span></label>)}</fieldset>
    <button className={`${b.dropZone} ${s.upload}`} type="button" disabled={working || uploading || screenshots.length >= 6} onClick={() => choose("screenshot")} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(Array.from(e.dataTransfer.files), "screenshot"); }}>
      {uploading ? <LoaderCircle className={s.spin} size={24} /> : <ImagePlus size={28} />}<strong>{uploading ? "Duke ngarkuar…" : "Ngarko screenshot-et e app-it"}</strong><small>PNG, JPG ose WebP · deri 25 MB secili · {screenshots.length}/6</small>
    </button>
    <input ref={input} type="file" multiple accept={IMAGE_REFERENCE_ACCEPT} className={s.hidden} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    {uploadError && <p className={b.hint} role="alert">{uploadError}</p>}
    {screenshots.length > 0 && <div className={s.references}>{screenshots.map(uploadCard)}</div>}
    {missingPlatforms.length > 0 && screenshots.length > 0 && <p role="status" className={b.hint}>Për pajisjet e zgjedhura mungon: {missingPlatforms.map(p => p === "ios" ? "screenshot iOS" : "screenshot Android").join(", ")}. Platformën e zgjedh poshtë secilit screenshot.</p>}
    <p className={b.hint}>Përdor screenshot-e të pastra, pa kornizë telefoni. Ndërfaqja dhe gjuha e app-it ruhen si në origjinal. Kontrolloje tekstin në ekran edhe në rezultatin final.</p>
    <div className={s.fieldPair}>{(["icon", "style"] as const).map(kind => <div key={kind}><Button variant="secondary" disabled={working || uploading || draft.uploads.some(u => u.purpose === kind)} onClick={() => choose(kind)} icon={<ImagePlus size={16} />}>{kind === "icon" ? "Shto ikonën e app-it" : "Shto referencë stili"}</Button><p className={b.hint}>{kind === "icon" ? "Opsionale · identiteti yt origjinal" : "Opsionale · atmosferë, ngjyra, kompozim"}</p></div>)}</div>
    {draft.uploads.some(u => u.purpose !== "screenshot") && <div className={s.references}>{draft.uploads.filter(u => u.purpose !== "screenshot").map(uploadCard)}</div>}
    <div className={b.sectionHeading}><div><h3>03 · Drejtimi kreativ</h3><p>Një fushatë me 9 reklama të veçanta, të lidhura me të njëjtin identitet.</p></div></div>
    <div className={s.fieldPair}><label className={b.field}><span>Ambienti</span><select className="maro-input" value={draft.mobile.environment} disabled={working} onChange={e => mobile("environment", e.target.value as AppBrief["environment"])}>{Object.entries(environments).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className={b.field}><span>Mood</span><select className="maro-input" value={draft.mobile.mood} disabled={working} onChange={e => mobile("mood", e.target.value as AppBrief["mood"])}>{Object.entries(moods).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    {draft.mobile.environment === "custom" && <label className={b.field}><span>Përshkruaje ambientin</span><input className="maro-input" maxLength={400} value={draft.mobile.environmentNotes} disabled={working} onChange={e => mobile("environmentNotes", e.target.value)} placeholder="p.sh. Një tren modern me dritë të mëngjesit" /></label>}
    <div className={s.fieldPair}><label className={b.field}><span>Stili</span><select className="maro-input" value={draft.mobile.style} disabled={working} onChange={e => mobile("style", e.target.value as AppBrief["style"])}>{Object.entries(styles).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className={b.field}><span>Formati i fushatës</span><select className="maro-input" value={draft.mobile.format} disabled={working} onChange={e => mobile("format", e.target.value as AppBrief["format"])}>{Object.entries(appFormats).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    <div className={s.fieldPair}><label className={b.field}><span>Lloji i reklamave</span><select className="maro-input" value={draft.contentType} disabled={working} onChange={e => setDraft(d => ({ ...d, contentType: e.target.value as FeedContentType }))}>{contentTypes.map(id => <option key={id} value={id}>{appContentLabels[id]}</option>)}</select></label><label className={b.field}><span>Gjuha e reklamës</span><select className="maro-input" value={draft.brief.language} disabled={working} onChange={e => brief("language", e.target.value)}><option value="sq">Shqip</option><option value="en">English</option></select></label></div>
    <div className={s.contextRow}><div><strong>Tekst në reklamë</strong><p>{draft.textMode ? "Hook i shkurtër + thirrje për veprim" : "Vetëm pamje; teksti origjinal në app ruhet"}</p></div><Switch checked={draft.textMode} onChange={value => setDraft(d => ({ ...d, textMode: value }))} disabled={working} aria-label="Tekst në reklamë" /></div>
    <details className={s.more}><summary className={b.hint}>Më shumë kontekst dhe identitet</summary><div className={s.form}>
      <label className={b.field}><span>Çfarë problemi zgjidh? (opsionale)</span><input className="maro-input" maxLength={400} value={draft.mobile.problem} disabled={working} onChange={e => mobile("problem", e.target.value)} /></label>
      <label className={b.field}><span>Ngjyrat e brendit (opsionale)</span><input className="maro-input" maxLength={100} value={draft.brief.colors} disabled={working} onChange={e => brief("colors", e.target.value)} placeholder="#121212, #B8F98D" /></label>
      <label className={b.field}><span>Link App Store (opsionale)</span><input type="url" className="maro-input" maxLength={600} value={draft.mobile.appStoreUrl} disabled={working} onChange={e => mobile("appStoreUrl", e.target.value)} placeholder="https://apps.apple.com/…" /></label>
      <label className={b.field}><span>Link Google Play (opsionale)</span><input type="url" className="maro-input" maxLength={600} value={draft.mobile.playStoreUrl} disabled={working} onChange={e => mobile("playStoreUrl", e.target.value)} placeholder="https://play.google.com/store/apps/…" /></label>
      <label className={b.field}><span>Udhëzime shtesë (opsionale)</span><textarea className="maro-input" maxLength={1200} rows={3} value={draft.brief.notes} disabled={working} onChange={e => brief("notes", e.target.value)} placeholder="Çka të theksohet ose të shmanget…" /></label>
      <div className={s.contextRow}><div><strong>maroBrain</strong><p>Përdor identitetin e workspace-it si kontekst shtesë.</p></div><Switch checked={draft.useBrain} onChange={value => setDraft(d => ({ ...d, useBrain: value }))} disabled={working} aria-label="Përdor maroBrain" /></div>
    </div></details>
    <details className={s.more}><summary className={b.hint}>Çka do të krijohet?</summary><div className={s.campaignPlan}>{(draft.contentType === "mix" ? appRoles : [{ title: appContentLabels[draft.contentType], layout: "9 kompozime të ndryshme të këtij lloji." }]).map((r, i) => <div key={r.title}><small>{String(i + 1).padStart(2, "0")}</small><strong>{r.title}</strong><p>{draft.contentType === "mix" ? ["Prezantimi i app-it", "Një rast përdorimi", "Funksion real nga ekrani", "Pse ia vlen", "Njoftim për app-in", "Një moment përdorimi", "Atmosfera e app-it", "Nevoja e audiencës", "Ftesë për veprim"][i] : r.layout}</p></div>)}</div></details>
    {requirements.length > 0 && <p className={b.hint}>Për me nis, plotëso: {requirements.join(", ")}.</p>}
    {!ready && !requirements.length && !uploading && validation.error && <p role="status" className={b.hint}>{validation.error.issues.map(i => i.message).filter((v, i, a) => a.indexOf(v) === i).join(" ")}</p>}
    <div className={s.formActions}><Button variant="brand" disabled={working || uploading || loading || !ready || !draft.brief.audience.trim() || credits < 50} onClick={start} icon={<Sparkles size={16} />}>Ma maro app-in · 50 credits</Button><p className={b.hint}>9 reklama · 3 rigjenerime falas.<br />Pastaj 5 credits për rigjenerim.</p></div>
    <p className={b.hint}>50 credits në nisje: 5 për përgatitjen + 5 për imazh. Në ndalim, credits e papërdorura kthehen. Këto janë reklama për rrjete sociale; kontrolloji para publikimit.</p>
  </div>;
}
