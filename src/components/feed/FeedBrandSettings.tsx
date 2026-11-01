"use client";
/* eslint-disable @next/next/no-img-element */
import type { PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import { feedFonts, feedFormats, feedLogoPositions, feedDesignSchema, planFeedProducts, type FeedAsset, type FeedDesign } from "@/lib/feed/campaign";
import { feedRole, type FeedContentType } from "@/lib/feed/model";
import { Button } from "@/components/ui/Button";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./FeedWorkspace.module.css";

export type FeedDesignDraft = {
  name?: string;
  headlines?: string[];
  font: FeedDesign["font"] | ""; format: FeedDesign["format"] | "";
  logoPosition: FeedDesign["logoPosition"];
  assets: Record<string, { role: FeedAsset["role"]; label: string }>;
  assignments?: number[][];
};
export const initialFeedDesign: FeedDesignDraft = { font: "", format: "", logoPosition: "bottom-right", assets: {} };
export function draftFeedDesign(draft: FeedDesignDraft, attachments: PrivateImageAttachment[]): FeedDesign {
  const assets = attachments.map((item, index) => ({ index, role: draft.assets[item.id]?.role ?? "product", label: (draft.assets[item.id]?.label ?? item.name).trim().slice(0, 100) || `Produkti ${index + 1}` }));
  return { version: 1, name: draft.name?.trim(), headlines: draft.headlines, textRendering: "native", font: draft.font || "inter", format: draft.format || "1:1", typeScale: "medium", logoPosition: draft.logoPosition, assets, assignments: draft.assignments ?? planFeedProducts(assets) };
}
export function readyFeedDesign(draft: FeedDesignDraft, design: FeedDesign) {
  return Boolean(draft.font && draft.format && feedDesignSchema.safeParse(design).success);
}

export function FeedBrandSettings({ draft, setDraft, attachments, remove, disabled, contentType, textMode, section = "all", retry, retryDisabled, previewError }: {
  draft: FeedDesignDraft; setDraft: (value: FeedDesignDraft) => void; attachments: PrivateImageAttachment[];
  remove: (id: string) => void; disabled: boolean; contentType: FeedContentType; textMode: boolean;
  section?: "all" | "references" | "appearance" | "plan"; retry?: (id: string) => void; retryDisabled?: boolean; previewError?: (id: string, url: string) => void;
}) {
  const design = draftFeedDesign(draft, attachments), products = design.assets.filter(a => a.role === "product");
  const logo = design.assets.find(a => a.role === "logo");
  function asset(id: string, patch: Partial<FeedDesignDraft["assets"][string]>) {
    const item = attachments.find(a => a.id === id)!;
    setDraft({ ...draft, assignments: patch.role ? undefined : draft.assignments, assets: { ...draft.assets, [id]: { ...(draft.assets[id] ?? { role: "product", label: item.name.slice(0, 100) }), ...patch } } });
  }
  return <>
    {(section === "all" || section === "references") && <>
    <p className={b.hint}>Çdo produkt e ka vendin e vet në plan. Shëno logon veçmas; referenca e stilit përdoret vetëm për drejtimin vizual.</p>
    {attachments.length > 0 && <div className={s.references}>{attachments.map((item, index) => <article key={item.id} className={b.sourceCard}>
      <div className={s.referencePreview}>{item.previewUrl && <img src={item.previewUrl} alt={item.name} onError={() => previewError?.(item.id, item.previewUrl)} />}</div>
      <div className={s.referenceInfo}><strong title={item.name}>{item.name}</strong>
        <label className={b.field}><span>Lloji i referencës {index + 1}</span><select className="maro-input" value={design.assets[index].role} disabled={disabled} onChange={e => asset(item.id, { role: e.target.value as FeedAsset["role"] })}><option value="product">Produkt / shërbim</option><option value="logo" disabled={Boolean(logo && logo.index !== index)}>Logo</option><option value="style">Referencë stili</option></select></label>
        <label className={b.field}><span>Emri në plan</span><input className="maro-input" value={draft.assets[item.id]?.label ?? item.name.slice(0, 100)} maxLength={100} disabled={disabled} onChange={e => asset(item.id, { label: e.target.value })} /></label>
        {item.status !== "ready" && <small role={item.error ? "alert" : "status"}>{item.error || "Duke ngarkuar…"}</small>}
        {item.status !== "ready" && item.storageRef && retry && <Button type="button" size="sm" variant="ghost" disabled={retryDisabled ?? disabled} onClick={() => retry(item.id)}>Rihape foton</Button>}
        <Button size="sm" variant="ghost" disabled={disabled} aria-label={`Hiq ${item.name}`} onClick={() => remove(item.id)}>Hiqe</Button>
      </div>
    </article>)}</div>}
    {attachments.length > 0 && !products.length && <p className={s.validation} role="alert">Së paku një referencë duhet me qenë Produkt / shërbim.</p>}
    </>}
    {(section === "all" || section === "appearance") && <>
    {section === "all" && <div className={s.designHeading}><h3>I njëjti stil. Çdo herë.</h3><p>Zgjedhe fontin dhe formatin e imazheve.</p></div>}
    <label className={b.field}><span>Emri i feed-it <small>(opsionale)</small></span><input className="maro-input" value={draft.name ?? ""} maxLength={100} placeholder="p.sh. Mr. Clean · Koleksioni i nëntorit" disabled={disabled} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
    <div className={s.fieldPair}>
      <label className={b.field}><span>Fonti *</span><select required className="maro-input" value={draft.font} disabled={disabled} onChange={e => setDraft({ ...draft, font: e.target.value as FeedDesignDraft["font"] })}><option value="" disabled>Zgjedhe fontin</option>{Object.entries(feedFonts).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className={b.field}><span>Formati i imazheve *</span><select required className="maro-input" value={draft.format} disabled={disabled} onChange={e => setDraft({ ...draft, format: e.target.value as FeedDesignDraft["format"] })}><option value="" disabled>Zgjedhe formatin</option>{Object.entries(feedFormats).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {logo && <label className={b.field}><span>Pozicioni i logos</span><select className="maro-input" value={draft.logoPosition} disabled={disabled} onChange={e => setDraft({ ...draft, logoPosition: e.target.value as FeedDesign["logoPosition"] })}>{Object.entries(feedLogoPositions).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}
    </div>
    {draft.font && <div className={s.fontSample} data-font={draft.font}><span>{feedFonts[draft.font]}</span><p>Një brend. Nëntë ide.</p><small>{textMode ? "Një familje shkronjash për krejt kampanjën." : "Pa tekst të shtuar; zgjedhja ruhet në identitetin e kampanjës."}</small></div>}
    {logo && <p className={b.hint}>Logoja ruan formën, madhësinë dhe pozicionin. Përshtatet me sfondin që të lexohet; PNG transparente jep rezultatin më të pastër.</p>}
    </>}
    {(section === "all" || section === "plan") && products.length > 0 && <details className={s.planDetails}>
      <summary><span>Personalizim opsional</span><strong>{products.length} {products.length === 1 ? "produkt" : "produkte"} · 9 postime</strong><small>Ndrysho shpërndarjen ose tekstet</small></summary>
      <p className={b.hint}>Shpërndarje e balancuar. Mundesh me ndërru produktin e çdo postimi para nisjes.</p>
      <div className={s.productPlan}>{design.assignments.map((row, slot) => <label key={slot} className={b.field}><span><small>{String(slot + 1).padStart(2, "0")}</small> {feedRole(slot, contentType).title}</span><select className="maro-input" disabled={disabled} aria-label={`Produkti për postimin ${slot + 1}`} value={row.length > 1 ? "all" : String(row[0])} onChange={e => setDraft({ ...draft, assignments: design.assignments.map((current, index) => index === slot ? e.target.value === "all" ? products.map(p => p.index) : [Number(e.target.value)] : current) })}>{products.map(p => <option key={p.index} value={p.index}>{p.label}</option>)}{products.length > 1 && <option value="all">Koleksioni · krejt produktet</option>}</select></label>)}</div>
      {textMode && <><p className={b.hint}>Teksti krijohet brenda dizajnit, sipas temës së fushatës. Vetëm nëse dëshiron fjalë të sakta, shkruaji këtu.</p><div className={s.productPlan}>{design.assignments.map((_, slot) => <label key={slot} className={b.field}><span>Teksti i postimit {slot + 1} · opsional</span><input className="maro-input" maxLength={60} disabled={disabled} value={draft.headlines?.[slot] ?? ""} placeholder="Tekst i saktë, nëse dëshiron" onChange={e => setDraft({ ...draft, headlines: Array.from({ length: 9 }, (_, index) => index === slot ? e.target.value : draft.headlines?.[index] ?? "") })} /></label>)}</div></>}
      {products.some(p => !design.assignments.some(row => row.includes(p.index))) && <p className={s.validation} role="alert">Çdo produkt duhet me u përfshi në së paku një postim.</p>}
    </details>}
  </>;
}
