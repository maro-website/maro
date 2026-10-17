"use client";
import * as React from "react";
import { FolderPlus, Folder, Images, Upload, Search, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { WorkspaceSource, BrainSourceFolder } from "@/lib/workspaces/brainTypes";
import type { AccountPolicy } from "@/lib/workspaces/accountPolicy";
import { notifyStorageChanged, STORAGE_CHANGED_EVENT } from "@/lib/workspaces/accountPolicy";
import { fetchAccountPolicy } from "@/lib/workspaces/accountPolicyClient";
import { uploadSourceImage } from "@/lib/workspaces/brainService";
import { workspaceErrorMessage } from "@/lib/workspaces/request";
import { resolvePrivateAssetRefs } from "@/lib/services/projectAssetService";
import { requestLibrary } from "@/lib/brain-studio/libraryClient";
import type { LibraryOperation } from "@/lib/brain-studio/operations";
import { BrainLogo } from "./BrainLogo";
import styles from "./BrainStudio.module.css";

type Editor = { kind: "folder"; id?: string; name: string } | { kind: "source"; id: string; name: string; keywords: string };
export function BrainLibrary({ userId, workspaceId, resetAt, sources, onRefresh, onBusy }: { userId: string; workspaceId: string; resetAt: string | null; sources: WorkspaceSource[]; onRefresh: () => Promise<void>; onBusy: (busy: boolean) => void }) {
  const { toast } = useToast();
  const [folders,setFolders] = React.useState<BrainSourceFolder[]>([]), [filter,setFilter] = React.useState("all"), [query,setQuery] = React.useState("");
  const [selected,setSelected] = React.useState<string[]>([]), [editor,setEditor] = React.useState<Editor | null>(null), [preview,setPreview] = React.useState<WorkspaceSource | null>(null);
  const [deleting,setDeleting] = React.useState<{ ids?: string[]; folderId?: string } | null>(null), [ack,setAck] = React.useState(false);
  const [busy,setBusy] = React.useState(false), [status,setStatus] = React.useState(""), [error,setError] = React.useState(""), [loading,setLoading] = React.useState(true);
  const [keywords,setKeywords] = React.useState(""), [dragging,setDragging] = React.useState(false), [policy,setPolicy] = React.useState<AccountPolicy | null>(null), [attempt,setAttempt] = React.useState(0);
  const [showUpload,setShowUpload] = React.useState(sources.length === 0);
  const [limit,setLimit] = React.useState(48), [resolved,setResolved] = React.useState<Record<string,string>>({}), [previewError,setPreviewError] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null), busyRef = React.useRef(false), alive = React.useRef(true);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const start = () => { busyRef.current = true; setBusy(true); onBusy(true); setError(""); };
  const finish = () => { busyRef.current = false; if (alive.current) { setBusy(false); onBusy(false); } };
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void requestLibrary(workspaceId,resetAt,undefined,controller.signal).then(result => { if (!controller.signal.aborted) setFolders(result.folders); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [workspaceId,resetAt,attempt]);
  React.useEffect(() => {
    let active = true;
    const refresh = () => { void fetchAccountPolicy(userId,workspaceId).then(value => { if (active) setPolicy(value); }).catch(() => { if (active) setPolicy(null); }); };
    refresh(); window.addEventListener(STORAGE_CHANGED_EVENT,refresh);
    return () => { active = false; window.removeEventListener(STORAGE_CHANGED_EVENT,refresh); };
  }, [userId,workspaceId]);
  React.useEffect(() => setSelected(previous => previous.filter(id => sources.some(source => source.id === id))), [sources]);
  const shown = sources.filter(item => (filter === "all" || (filter === "root" ? !item.folderId : item.folderId === filter)) && `${item.name} ${item.keywords}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  React.useEffect(() => setLimit(48), [filter,query]);
  const displayed = shown.slice(0,limit);
  const refsKey = JSON.stringify([...new Set(displayed.filter(item => item.fileUrl.startsWith("storage:")).map(item => item.storageRef).filter((ref): ref is string => Boolean(ref && !resolved[ref])))].slice(0,50));
  React.useEffect(() => {
    const refs: string[] = JSON.parse(refsKey); if (!refs.length) return;
    let active = true;
    const timer = setTimeout(() => { void resolvePrivateAssetRefs(refs).then(urls => { if (active) { setResolved(previous => ({ ...previous,...urls })); setPreviewError(refs.some(ref => !urls[ref]) ? "Disa parapamje nuk u ngarkuan. Rifresko listën." : ""); } }).catch(() => { if (active) setPreviewError("Parapamjet nuk u ngarkuan. Rifresko listën."); }); }, 160);
    return () => { active = false; clearTimeout(timer); };
  }, [refsKey,attempt]);
  const imageUrl = (source: WorkspaceSource) => source.storageRef && resolved[source.storageRef] || source.fileUrl;
  const run = async (operation: LibraryOperation) => {
    const result = await requestLibrary(workspaceId,resetAt,operation);
    if (alive.current) setFolders(result.folders);
    await onRefresh(); notifyStorageChanged();
    if (result.cleanupPending) toast("Burimet u hoqën. Lirimi i hapësirës vazhdon në sfond.");
  };
  const mutate = async (operation: LibraryOperation) => { if (busyRef.current) return; start(); try { await run(operation); setSelected([]); setEditor(null); setDeleting(null); if (operation.action === "delete_folder" && operation.folderId === filter) setFilter("root"); if (operation.action === "delete_sources" || operation.action === "delete_folder") requestAnimationFrame(() => searchRef.current?.focus()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Veprimi nuk përfundoi."); } finally { finish(); } };
  const upload = async (files: FileList | File[]) => {
    if (busyRef.current || loading || !files.length) return;
    const list = Array.from(files); if (list.length > 20) { setError("Ngarko deri në 20 foto për një herë."); return; }
    if (list.some(file => !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)) { setError("Zgjidh vetëm PNG, JPG ose WebP, deri në 5 MB secila."); return; }
    start(); let completed = 0;
    try {
      for (const file of list) {
        if (!alive.current) break;
        setStatus(`Duke ngarkuar ${completed + 1} nga ${list.length}…`);
        const dataUrl = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
        const uploaded = await uploadSourceImage(dataUrl,workspaceId); if (!uploaded) throw Error("Fotoja nuk u ngarkua.");
        await run({ action: "add_source", id: `src_${crypto.randomUUID()}`, name: file.name.replace(/\.[^.]+$/,"").slice(0,160) || "Foto", keywords: keywords.trim(), storageRef: uploaded.storageRef, mimeType: file.type as "image/png" | "image/jpeg" | "image/webp", folderId: ["all","root"].includes(filter) ? null : filter });
        completed += 1;
      }
      setStatus(`${completed} foto u shtuan.`);
      if (completed === list.length) setShowUpload(false);
    } catch (cause) { if (alive.current) { setStatus(`${completed} nga ${list.length} foto u shtuan.`); setError(workspaceErrorMessage(cause,cause instanceof Error ? cause.message : "Ngarkimi nuk përfundoi.")); } }
    finally { finish(); if (fileRef.current) fileRef.current.value = ""; }
  };
  const openDelete = (value: NonNullable<typeof deleting>) => { setAck(false); setError(""); setDeleting(value); };
  const folder = folders.find(item => item.id === filter);
  return <div className={styles.library}>
    <div className={styles.sectionHeading}><div><h2>Burimet</h2><p>Fotot dhe produktet e brendit, në vendin e vet.</p></div><div className={styles.actions}><Button variant="brand" icon={<Upload size={16}/>} disabled={busy || loading} aria-expanded={showUpload} onClick={() => setShowUpload(value => !value)}>{showUpload ? "Mbyll ngarkimin" : "Ngarko foto"}</Button><Button variant="secondary" icon={<FolderPlus size={16}/>} onClick={() => { setError(""); setEditor({ kind: "folder", name: "" }); }} disabled={busy || loading}>Dosje e re</Button></div></div>
    <div className={styles.storageNote}><strong>Hapësira e llogarisë</strong><span>{policy ? `${storageSize(policy.usedBytes)}${policy.limitBytes !== null ? ` / ${storageSize(policy.limitBytes)}` : " të përdorura"}` : "Hapësira nuk u verifikua."}</span><p>Burimet dhe logoja llogariten bashkë me skedarët e tjerë të llogarisë, në të gjitha workspace-t.</p>{policy && policy.limitBytes !== null && policy.limitBytes > 0 && <progress aria-label="Storage i përdorur" value={Math.min(policy.usedBytes,policy.limitBytes)} max={policy.limitBytes}/>}</div>
    <nav className={styles.folderStrip} aria-label="Dosjet e burimeve">{[{id:"all",name:"Të gjitha"},{id:"root",name:"Pa dosje"},...folders].map(item => <button type="button" key={item.id} aria-current={filter === item.id ? "page" : undefined} onClick={() => { setFilter(item.id); setSelected([]); }}><Folder size={16}/><span>{item.name}</span><small>{item.id === "all" ? sources.length : sources.filter(source => item.id === "root" ? !source.folderId : source.folderId === item.id).length}</small></button>)}</nav>
    {showUpload && <fieldset disabled={busy || loading} className={styles.libraryTools}>
      <div className={styles.dropZone} data-dragging={dragging} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files); }}><Upload size={24} aria-hidden="true"/><strong>Lësho fotot këtu</strong><p>PNG, JPG ose WebP · deri në 5 MB për foto</p><Button variant="brand" onClick={() => fileRef.current?.click()} icon={<Upload size={16}/>}>Zgjidh fotot</Button><input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Ngarko burime" onChange={event => { if (event.target.files) void upload(event.target.files); }}/><small>{folder ? `Ngarkohen te “${folder.name}”.` : "Ngarkohen pa dosje. Mund t’i zhvendosësh më pas."}</small></div>
      <label className={styles.field}><span>Fjalë kyçe për fotot e reja (opsionale)</span><input className="maro-input" maxLength={500} placeholder="P.sh. produkti, koleksioni, fushata" value={keywords} onChange={event => setKeywords(event.target.value)}/><small className={styles.hint}>Ndaji me presje. Ndihmojnë që referenca të gjendet kur shkruan promptin.</small></label>
    </fieldset>}
    <div className={styles.libraryToolbar}><label className={styles.librarySearch}><Search size={18}/><input ref={searchRef} className="maro-input" aria-label="Kërko burime" placeholder="Kërko emrin ose fjalët kyçe…" value={query} onChange={event => { setQuery(event.target.value); setSelected([]); }}/></label>{folder && <><Button size="icon" variant="ghost" aria-label="Riemërto dosjen" disabled={busy} onClick={() => setEditor({kind:"folder",id:folder.id,name:folder.name})}><Pencil size={16}/></Button><Button size="icon" variant="ghost" aria-label="Hiq dosjen" disabled={busy} onClick={() => openDelete({folderId:folder.id})}><Trash2 size={16}/></Button></>}</div>
    {loading && <p role="status">Duke ngarkuar bibliotekën…</p>}{status && <p role="status" className={styles.hint}>{status}</p>}{(error || previewError) && !editor && !deleting && <div role="alert" className="text-sm text-danger">{error || previewError} <Button variant="ghost" onClick={() => { setAttempt(value => value + 1); void onRefresh().catch(() => {}); }}>Rifresko listën</Button></div>}
    {shown.length > 0 && <div className={styles.selectionBar}><label><input type="checkbox" disabled={busy} checked={shown.length > 0 && displayed.slice(0,200).every(item => selected.includes(item.id))} onChange={event => setSelected(event.target.checked ? displayed.slice(0,200).map(item => item.id) : [])}/><span>{selected.length ? `${selected.length} të zgjedhura` : displayed.length > 200 ? "Zgjidh 200 fotot e para" : "Zgjidh fotot"}</span></label>{selected.length > 0 && <><select className="maro-input" aria-label="Zhvendos të zgjedhurat" value="" disabled={busy} onChange={event => { if (event.target.value) void mutate({action:"move_sources",ids:selected,folderId:event.target.value === "root" ? null : event.target.value}); }}><option value="">Zhvendos në…</option><option value="root">Pa dosje</option>{folders.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><Button variant="ghost" icon={<Trash2 size={16}/>} disabled={busy} onClick={() => openDelete({ids:selected})}>Fshi</Button><Button size="icon" variant="ghost" aria-label="Hiq përzgjedhjen" onClick={() => setSelected([])}><X size={16}/></Button></>}</div>}
    <div className={styles.sourceGrid}>{displayed.map(source => <article className={styles.sourceCard} key={source.id}><div className={styles.sourceImage}><button type="button" aria-label={`Hap ${source.name}`} onClick={() => setPreview(source)}><BrainLogo src={imageUrl(source)} alt={source.name} lazy/></button><label className={styles.sourceSelect}><input type="checkbox" aria-label={`Zgjidh ${source.name}`} checked={selected.includes(source.id)} disabled={busy || (!selected.includes(source.id) && selected.length >= 200)} onChange={event => setSelected(previous => event.target.checked ? [...previous,source.id] : previous.filter(id => id !== source.id))}/></label></div><div className={styles.sourceInfo}><strong>{source.name}</strong><p>{source.keywords || "Pa fjalë kyçe"}</p><div className={styles.row}><small>{folders.find(item => item.id === source.folderId)?.name || "Pa dosje"}</small><Button variant="ghost" size="icon" aria-label={`Ndrysho ${source.name}`} disabled={busy} onClick={() => { setError(""); setEditor({kind:"source",id:source.id,name:source.name,keywords:source.keywords}); }}><Pencil size={16}/></Button></div></div></article>)}</div>
    {shown.length > limit && <Button variant="secondary" disabled={busy} onClick={() => setLimit(value => value + 48)}>Shfaq edhe 48</Button>}
    {!shown.length && !loading && <div className={styles.empty}><Images size={24}/><h3>{query ? "Nuk u gjet asnjë foto." : "Vendi për referencat e tua."}</h3><p>{query ? "Provo një emër ose fjalë kyçe tjetër." : "Ndaji sipas produkteve, koleksioneve ose fushatave. Dosjet shërbejnë për organizim; fjalët kyçe për përzgjedhjen e referencave."}</p></div>}
    <Modal open={Boolean(editor)} onClose={() => { if (!busy) setEditor(null); }} aria-label={editor?.kind === "source" ? "Ndrysho burimin" : "Dosja e burimeve"}><ModalHeader title={editor?.kind === "source" ? "Detajet e fotos" : editor?.id ? "Riemërto dosjen" : "Dosje e re"}/>{editor && <form onSubmit={event => { event.preventDefault(); void mutate(editor.kind === "source" ? {action:"edit_source",ids:[editor.id],name:editor.name,keywords:editor.keywords} : editor.id ? {action:"rename_folder",folderId:editor.id,name:editor.name} : {action:"create_folder",id:`folder_${crypto.randomUUID()}`,name:editor.name}); }}><fieldset disabled={busy} className={styles.confirmBody}><label className={styles.field}><span>Emri</span><input className="maro-input" required maxLength={editor.kind === "folder" ? 80 : 160} value={editor.name} onChange={event => setEditor(value => value ? {...value,name:event.target.value} : null)}/></label>{editor.kind === "source" && <label className={styles.field}><span>Fjalët kyçe</span><input className="maro-input" maxLength={500} value={editor.keywords} onChange={event => setEditor(value => value?.kind === "source" ? {...value,keywords:event.target.value} : value)}/></label>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}</fieldset><ModalFooter><Button variant="ghost" disabled={busy} onClick={() => setEditor(null)}>Anulo</Button><Button type="submit" variant="brand" disabled={!editor.name.trim()} loading={busy}>Ruaje</Button></ModalFooter></form>}</Modal>
    <Modal open={Boolean(deleting)} onClose={() => { if (!busy) setDeleting(null); }} aria-label="Konfirmo fshirjen"><ModalHeader title={deleting?.folderId ? "Hiq dosjen?" : `Fshi ${deleting?.ids?.length || 0} burime?`} description={deleting?.folderId ? "Fotot mbeten te “Pa dosje”. Hiqet vetëm dosja." : "Fotot e zgjedhura hiqen nga ky maroBrain dhe storage. Ky veprim nuk kthehet mbrapa."}/><div className={styles.confirmBody}><label className={styles.confirmCheck}><input type="checkbox" checked={ack} disabled={busy} onChange={event => setAck(event.target.checked)}/><span>{deleting?.folderId ? "Dua ta heq vetëm dosjen." : "E kuptoj që këto foto fshihen përgjithmonë."}</span></label>{error && <p role="alert" className="text-sm text-danger">{error}</p>}</div><ModalFooter><Button variant="ghost" disabled={busy} onClick={() => setDeleting(null)}>Anulo</Button><Button variant="danger" disabled={!ack} loading={busy} onClick={() => { if (deleting) void mutate(deleting.folderId ? {action:"delete_folder",folderId:deleting.folderId} : {action:"delete_sources",ids:deleting.ids || []}); }}>Konfirmo</Button></ModalFooter></Modal>
    <Modal open={Boolean(preview)} onClose={() => setPreview(null)} size="lg" aria-label="Parapamja e burimit"><ModalHeader title={preview?.name || "Burimi"}/><div className={styles.confirmBody}><BrainLogo src={preview ? imageUrl(preview) : null} alt={preview?.name}/><p className={styles.hint}>{preview?.keywords}</p></div></Modal>
  </div>;
}


function storageSize(bytes: number) { const unit = bytes >= 1e9 ? "GB" : bytes >= 1e6 ? "MB" : bytes >= 1e3 ? "KB" : "B"; const divisor = { GB: 1e9, MB: 1e6, KB: 1e3, B: 1 }[unit]; return `${(bytes / divisor).toLocaleString("sq-AL", { maximumFractionDigits: 2 })} ${unit}`; }
