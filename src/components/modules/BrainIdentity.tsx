"use client";
import * as React from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { BRAIN_CATEGORIES, BRAIN_BUSINESS_MODELS, type WorkspaceBrainProfile, type BrainTabId } from "@/lib/workspaces/brainTypes";
import { uploadSourceImage } from "@/lib/workspaces/brainService";
import { workspaceErrorMessage } from "@/lib/workspaces/request";
import { sectionFields, studioLabels } from "@/lib/brain-studio/prompts";
import { BrainLogo } from "./BrainLogo";
import { BrainChannels } from "./BrainChannels";
import styles from "./BrainStudio.module.css";

export function BrainIdentity({ profile, setProfile, workspaceId, onBusy }: { profile: WorkspaceBrainProfile; setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>; workspaceId: string; onBusy: (busy: boolean) => void }) {
  const b = profile.brand; const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false); const fileRef = React.useRef<HTMLInputElement>(null);
  const patch = (value: Partial<typeof b>) => setProfile(p => ({ ...p, brand: { ...p.brand, ...value } }));
  const upload = async (file?: File) => {
    if (!file || uploading) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { toast("Zgjidh PNG, JPG ose WebP deri në 5 MB.", "error"); return; }
    setUploading(true); onBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const saved = await uploadSourceImage(dataUrl, workspaceId); if (!saved) throw Error("Logoja nuk u ngarkua.");
      patch({ logoUrl: saved.url, logoStorageRef: saved.storageRef, logoBackdrop: "auto" });
    } catch (cause) { toast(workspaceErrorMessage(cause,cause instanceof Error ? cause.message : "Logoja nuk u ngarkua."), "error"); }
    finally { setUploading(false); onBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  return <div className={styles.identity}>
    <section className={styles.logoBox} aria-label="Identiteti vizual"><div className={styles.sectionHeading}><div><h2>Logoja e brendit</h2><p>Një sfond që e bën të dukshme, në çdo pamje.</p></div><Button variant="secondary" icon={<Upload size={16}/>} loading={uploading} onClick={() => fileRef.current?.click()}>Ngarko logo</Button><input ref={fileRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Skedari i logos" disabled={uploading} onChange={event => void upload(event.target.files?.[0])}/></div>
      <BrainLogo src={b.logoUrl} backdrop={b.logoBackdrop}/><div className={styles.logoControls}><span>Sfondi i parapamjes</span><div className={styles.actions}>{([['auto','Automatik'],['light','I çelët'],['dark','I errët']] as const).map(([value,label]) => <Button key={value} variant="secondary" aria-pressed={(b.logoBackdrop || 'auto') === value} onClick={() => patch({ logoBackdrop: value })}>{label}</Button>)}</div></div><p className={styles.hint}>Ngjyrat dhe transparenca e skedarit mbeten origjinale. Ndryshon vetëm sfondi i shfaqjes.</p>
    </section>
    <section className={styles.identityBlock}><h2>Informatat e brendit</h2><p className={styles.hint}>Kush je, çka ofron dhe ku të gjejnë.</p><div className={styles.identityGrid}>
      {sectionFields.brand.map(([key,label]) => <label key={key} className={`${styles.field} ${['description','offering','mission','values'].includes(key) ? styles.wideField : ''}`}><span>{label}</span>{key === 'category' || key === 'businessModel' || key === 'salesChannel' ? <select className="maro-input" value={String(b[key as keyof typeof b] || '')} onChange={event => patch({ [key]: event.target.value })}><option value="">Zgjidh…</option>{(key === 'category' ? BRAIN_CATEGORIES : key === 'businessModel' ? BRAIN_BUSINESS_MODELS : ['ONLINE','FIZIKISHT','HYBRID']).map(value => <option key={value}>{value}</option>)}</select> : ['description','offering','mission','values'].includes(key) ? <textarea className="maro-input" rows={3} maxLength={4000} value={String(b[key as keyof typeof b] ?? '')} onChange={event => patch({ [key]: event.target.value })}/> : <input className="maro-input" maxLength={4000} value={String(b[key as keyof typeof b] ?? '')} onChange={event => patch({ [key]: event.target.value })}/>}</label>)}
    </div></section>
    {Boolean(b.colors?.length) && <section className={styles.identityBlock}><h3>Paleta e brendit</h3><div className={styles.colorList}>{b.colors?.map(color => <span key={color}><i style={{ backgroundColor: color }}/>{color}<Button size="icon" variant="ghost" aria-label={`Hiq ngjyrën ${color}`} onClick={() => patch({ colors: b.colors?.filter(item => item !== color) })}><Trash2 size={14}/></Button></span>)}</div></section>}
    <BrainChannels channels={b.channels} onChange={channels => patch({ channels })}/>
  </div>;
}
const hints: Record<string, string> = { buyingTriggers: "P.sh. një nevojë, një moment ose një arsye që e shtyn klientin të veprojë.", objections: "Çmimi, besimi, koha apo pyetjet që duhen sqaruar para blerjes.", timeframe: "Afate reale dhe çka ka përparësi tani.", pricing: "Intervalet e çmimeve, paketat dhe kushtet. Shëno vetëm atë që është e saktë.", proof: "Vlerësime reale, certifikime, rezultate ose përvojë që mund të dëshmohen.", cta: "P.sh. Rezervo një takim, porosit online ose na shkruaj.", examples: "Shembuj të tu që tregojnë si flet brendi." };
export function BrainDetails({ section, profile, setProfile }: { section: Exclude<BrainTabId,'brand'|'sources'>; profile: WorkspaceBrainProfile; setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>> }) {
  return <div className={styles.detailFields}><div><h2>{studioLabels[section]}</h2><p className={styles.hint}>Plotëso çka di. Fushat janë opsionale dhe mund t’i ndryshosh kurdo.</p></div>{sectionFields[section].map(([key,label]) => <label className={styles.field} key={key}><span>{label}</span>{hints[key] && <small className={styles.hint}>{hints[key]}</small>}<textarea className="maro-input" rows={3} maxLength={4000} value={String((profile[section] as unknown as Record<string,unknown>)[key] ?? '')} onChange={event => setProfile(p => ({ ...p, [section]: { ...p[section], [key]: event.target.value } }))}/></label>)}</div>;
}
