"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import Link from "next/link";
import { BrainCircuit, Check, Image as ImageIcon, LoaderCircle } from "lucide-react";
import { fetchBrainProfile, fetchWorkspaceSources } from "@/lib/workspaces/brainService";
import { workspaceErrorMessage } from "@/lib/workspaces/request";
import { resolvePrivateAssetRefs, resolvePrivateAssetRefsStrict } from "@/lib/services/projectAssetService";
import { feedBrainAssets, type FeedBrainAsset, type FeedBrainSelection } from "@/lib/feed/brainAssets";
import { FEED_MAX_REFERENCES } from "@/lib/feed/model";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./FeedWorkspace.module.css";

export function FeedBrainPicker({ userId, workspaceId, workspaceName, disabled, existingRefs, attachmentCount, hasLogo, onAdd }: {
  userId: string; workspaceId: string; workspaceName: string; disabled: boolean; existingRefs: string[]; attachmentCount: number; hasLogo: boolean;
  onAdd: (selection: FeedBrainSelection[]) => void;
}) {
  const [open, setOpen] = React.useState(false), [loading, setLoading] = React.useState(false), [adding, setAdding] = React.useState(false);
  const [items, setItems] = React.useState<FeedBrainAsset[]>([]), [selected, setSelected] = React.useState<string[]>([]);
  const [previews, setPreviews] = React.useState<Record<string, string>>({}), [error, setError] = React.useState("");
  const [query, setQuery] = React.useState(""), [limit, setLimit] = React.useState(48), [attempt, setAttempt] = React.useState(0);
  const alive = React.useRef(true), importLock = React.useRef(false);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(""); setSelected([]); setPreviews({}); setItems([]); setQuery(""); setLimit(48);
    void Promise.all([fetchBrainProfile(userId, workspaceId), fetchWorkspaceSources(userId, workspaceId, { paged: true, resolveAssets: false })]).then(([profile, sources]) => {
      if (active) setItems(feedBrainAssets(userId, workspaceId, profile, sources));
    }).catch(cause => { if (active) setError(workspaceErrorMessage(cause, "Imazhet e Brain-it nuk u hapën. Provo përsëri ose ngarko të reja.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, userId, workspaceId, attempt]);
  const shown = items.filter(item => `${item.name} ${item.keywords}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const displayed = shown.slice(0, limit);
  const pendingRefs = JSON.stringify(displayed.map(item => item.storageRef).filter(ref => !previews[ref]).slice(0, 48));
  React.useEffect(() => {
    if (!open) return;
    const refs: string[] = JSON.parse(pendingRefs); if (!refs.length) return;
    let active = true;
    const timer = setTimeout(() => { void resolvePrivateAssetRefs(refs).then(urls => {
      if (active) { setPreviews(previous => ({ ...previous, ...urls })); if (refs.some(ref => !urls[ref])) setError("Disa parapamje nuk u hapën. Rifresko listën ose zgjedh imazhe të tjera."); }
    }).catch(() => { if (active) setError("Parapamjet nuk u hapën. Rifresko listën."); }); }, 160);
    return () => { active = false; clearTimeout(timer); };
  }, [open, pendingRefs, attempt]);
  const remaining = Math.max(0, FEED_MAX_REFERENCES - attachmentCount);
  function toggle(ref: string) {
    setSelected(current => current.includes(ref) ? current.filter(value => value !== ref) : current.length < remaining ? [...current, ref] : current);
  }
  async function add() {
    if (importLock.current || disabled || !selected.length) return;
    importLock.current = true; setAdding(true); setError("");
    try {
      const chosen = items.filter(item => selected.includes(item.storageRef));
      const urls = await resolvePrivateAssetRefsStrict(chosen.map(item => item.storageRef));
      if (!alive.current) return;
      onAdd(chosen.map(asset => ({ asset, previewUrl: urls[asset.storageRef] })));
      setOpen(false);
    } catch { if (alive.current) setError("Imazhet nuk u shtuan. Kontrollo përzgjedhjen dhe provo përsëri."); }
    finally { importLock.current = false; if (alive.current) setAdding(false); }
  }
  return <>
    <button type="button" className={`${b.dropZone} ${s.upload}`} disabled={disabled || !userId || !remaining} onClick={() => setOpen(true)}><BrainCircuit size={28} /><strong>Zgjedh nga maroBrain</strong><small>{workspaceName} · produktet dhe logoja e ruajtur</small></button>
    <Modal open={open} onClose={() => { if (!importLock.current) setOpen(false); }} closeOnBackdrop={!adding} size="lg" aria-label="Zgjedh imazhe nga maroBrain">
      <ModalHeader title="Nga maroBrain, në feed-in tënd" description={`Imazhet e ${workspaceName}. Mundesh me i kombinu edhe me ngarkime të reja.`} />
      <div className={s.brainPickerBody}>
        <label className={b.field}><span>Kërko produktin ose referencën</span><input type="search" className="maro-input" value={query} disabled={loading || adding} onChange={event => { setQuery(event.target.value); setLimit(48); }} placeholder="Emri ose fjalët kyçe…" /></label>
        {error && <div className={s.brainPickerError} role="alert"><p>{error}</p><Button variant="ghost" size="sm" disabled={adding || loading} onClick={() => setAttempt(value => value + 1)}>Rifresko listën</Button></div>}
        {loading ? <p role="status" className={s.brainPickerStatus}><LoaderCircle size={18} className={s.spin} /> Duke hapur imazhet e Brain-it…</p> : displayed.length ? <div className={s.brainAssetGrid}>{displayed.map(item => {
          const included = existingRefs.includes(item.storageRef), checked = selected.includes(item.storageRef);
          const logoBlocked = item.role === "logo" && hasLogo && !included;
          return <button type="button" key={item.storageRef} className={s.brainAsset} aria-pressed={included || checked} disabled={disabled || adding || included || logoBlocked || !previews[item.storageRef] || (!checked && selected.length >= remaining)} onClick={() => toggle(item.storageRef)} title={logoBlocked ? "Ke një logo në plan. Hiqe atë para se ta zgjedhësh këtë." : item.name}>
            <span className={s.brainAssetImage}>{previews[item.storageRef] ? <img src={previews[item.storageRef]} alt="" loading="lazy" /> : <ImageIcon size={24} />}{(included || checked) && <span className={s.brainAssetCheck}><Check size={14} /></span>}</span>
            <strong>{item.name}</strong><small>{included ? "E shtuar në feed" : logoBlocked ? "Një logo është zgjedhur" : item.role === "logo" ? "Logo e brendit" : "Referencë nga Brain"}</small>
          </button>;
        })}</div> : <div className={s.brainPickerStatus}><ImageIcon size={24} /><p>{items.length ? "Nuk u gjet asnjë imazh me këtë emër." : "Ky Brain ende nuk ka imazhe të ruajtura PNG, JPG ose WebP."}</p><Link href="/brain" className={s.inlineLink}>Hape maroBrain ↗</Link></div>}
        {!loading && shown.length > displayed.length && <Button variant="ghost" size="sm" disabled={adding} onClick={() => setLimit(value => value + 48)}>Shfaq më shumë</Button>}
      </div>
      <ModalFooter><div className={s.brainPickerFooter}><span className={b.hint}>{selected.length} të zgjedhura · {attachmentCount}/{FEED_MAX_REFERENCES} në feed</span><Button variant="secondary" disabled={adding} onClick={() => setOpen(false)}>Mbylle</Button><Button variant="brand" loading={adding} disabled={disabled || loading || adding || !selected.length || selected.length > remaining} onClick={() => void add()}>Shto në feed · {selected.length}</Button></div></ModalFooter>
    </Modal>
  </>;
}
