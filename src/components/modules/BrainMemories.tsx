"use client";
import * as React from "react";
import { Archive, Plus, RotateCcw, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { requestMemories } from "@/lib/brain-studio/client";
import { emptyMemoryMetadata, memoryMetadataSchema, memoryKinds, memoryScopes, isMemoryExpired, encodeMemoryCard, type BrainMemory, type MemoryMetadata } from "@/lib/brain-studio/memories";
import styles from "./BrainStudio.module.css";

export function BrainMemories({ workspaceId, resetAt, memories, onChange, onRefresh, loading, error }: { workspaceId: string; resetAt: string | null; memories: BrainMemory[]; onChange: (items: BrainMemory[]) => void; onRefresh: () => void; loading: boolean; error: string }) {
  const { toast } = useToast();
  const [editor, setEditor] = React.useState<{ key: string; revision: number; metadata: MemoryMetadata; content: string } | null>(null);
  const [busy, setBusy] = React.useState(false); const busyRef = React.useRef(false);
  const [saveError, setSaveError] = React.useState("");
  const [query, setQuery] = React.useState(""); const [filter, setFilter] = React.useState("active"); const [limit, setLimit] = React.useState(20);
  const shown = memories.filter(memory => filter === "archived" ? memory.metadata.archived : filter === "expired" ? !memory.metadata.archived && isMemoryExpired(memory) : !memory.metadata.archived && !isMemoryExpired(memory)).filter(memory => `${memory.metadata.title} ${memory.content} ${memory.metadata.subject} ${memory.metadata.keywords}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const newCard = () => { setSaveError(""); setEditor({ key: `memory_${crypto.randomUUID()}`, revision: 0, metadata: emptyMemoryMetadata(), content: "" }); };
  async function save(item: NonNullable<typeof editor>, archive?: boolean) {
    if (busyRef.current) return;
    const metadata = { ...item.metadata, ...(archive !== undefined ? { archived: archive } : {}) };
    const parsed = memoryMetadataSchema.safeParse(metadata);
    if (!parsed.success || !item.content.trim() || item.content.length > 4000) { setSaveError(parsed.success ? "Shkruaje përmbajtjen, deri në 4000 karaktere." : parsed.error.issues[0].message); return; }
    try { encodeMemoryCard(item.content, parsed.data); } catch (cause) { setSaveError(cause instanceof Error ? cause.message : "Shkurtoje përmbajtjen."); return; }
    busyRef.current = true; setBusy(true); setSaveError("");
    try { const items = await requestMemories(workspaceId, { key: item.key, expectedRevision: item.revision, metadata: parsed.data, content: item.content, resetAt }); onChange(items); setEditor(null); toast(archive === true ? "Memorja u arkivua." : archive === false ? "Memorja u aktivizua." : "Memorja u ruajt."); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Memorja nuk u ruajt."; setSaveError(message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const patch = (value: Partial<MemoryMetadata>) => setEditor(previous => previous ? { ...previous, metadata: { ...previous.metadata, ...value } } : previous);
  const latest = editor ? memories.find(item => item.key === editor.key && item.revision !== editor.revision) : undefined;
  const closeEditor = () => { if (!busy) { setEditor(null); setSaveError(""); } };
  return <div>
    <div className={styles.sectionHeading}><div><h2>Memorjet</h2><p>Detaje, preferenca dhe gjëra që s’kanë një fushë të vetën.</p></div><Button variant="brand" icon={<Plus size={16} />} onClick={newCard} disabled={loading || Boolean(error) || busy}>Shto memorje</Button></div>
    {loading ? <p role="status" className={styles.hint}>Duke ngarkuar memorjet…</p> : error ? <div role="alert"><p className="text-sm text-danger">{error}</p><Button variant="secondary" onClick={onRefresh}>Provo përsëri</Button></div> : <>
      <div className={styles.memoryControls}><label className={styles.field}><span>Kërko memorje</span><input className="maro-input" value={query} onChange={event => { setQuery(event.target.value); setLimit(20); }} placeholder="Titulli, produkti ose përmbajtja…" /></label><label className={styles.field}><span>Shfaq</span><select className="maro-input" value={filter} onChange={event => { setFilter(event.target.value); setLimit(20); }}><option value="active">Aktive</option><option value="archived">Arkivuara</option><option value="expired">Të skaduara</option></select></label></div>
      {!shown.length && <div className={styles.empty}><NotebookPen size={24} aria-hidden="true" /><h3>{memories.length ? "Asnjë memorje për këtë kërkim." : "Detajet e vogla kanë vend këtu."}</h3><p>{memories.length ? "Provo një kërkim ose kategori tjetër." : "P.sh. emrat e produkteve që nuk përkthehen, kushtet e një oferte ose një preferencë e brendit."}</p></div>}
      <div className={styles.memoryGrid}>{shown.slice(0, limit).map(memory => <article className={styles.memoryCard} key={memory.key}>
        <div className={styles.row}><span className={styles.memoryKind}>{memoryKinds[memory.metadata.kind]}</span><span className={styles.hint}>{memory.metadata.archived ? "Arkivuar" : isMemoryExpired(memory) ? "Skaduar" : memory.metadata.expiresOn ? `Deri më ${memory.metadata.expiresOn}` : "Pa afat"}</span></div>
        <h3>{memory.metadata.title}</h3><p className={styles.memoryText}>{memory.content}</p><small>{memoryScopes[memory.metadata.scope]}{memory.metadata.subject ? ` · ${memory.metadata.subject}` : ""}</small>
        <div className={styles.memoryCardActions}><Button variant="ghost" onClick={() => { setSaveError(""); setEditor({ key: memory.key, revision: memory.revision, content: memory.content, metadata: { ...memory.metadata } }); }} disabled={busy}>Ndrysho</Button><Button variant="ghost" size="icon" aria-label={memory.metadata.archived ? `Aktivizo ${memory.metadata.title}` : `Arkivo ${memory.metadata.title}`} disabled={busy} onClick={() => void save({ key: memory.key, revision: memory.revision, content: memory.content, metadata: memory.metadata }, !memory.metadata.archived)}>{memory.metadata.archived ? <RotateCcw size={16} /> : <Archive size={16} />}</Button></div>
      </article>)}</div>{shown.length > limit && <Button variant="secondary" onClick={() => setLimit(value => value + 20)}>Shfaq edhe 20</Button>}
    </>}
    {saveError && !editor && <p role="alert" className="mt-4 text-sm text-danger">{saveError} <button type="button" onClick={onRefresh} className="underline">Rifresko listën</button></p>}
    <Modal open={Boolean(editor)} onClose={closeEditor} aria-label={editor?.revision ? "Ndrysho memorjen" : "Shto memorje"}>
      <ModalHeader title={editor?.revision ? "Ndrysho memorjen" : "Shto memorje"} />
      {editor && <form noValidate onSubmit={event => { event.preventDefault(); void save(editor); }}><fieldset disabled={busy} className={styles.memoryForm}>
        <p className={styles.hint}>Shkruaje detajin që Maro duhet ta mbajë mend. Poshtë zgjedh ku dhe sa gjatë vlen.</p>
        <label className={styles.field}><span>Titulli</span><input className="maro-input" required maxLength={120} value={editor.metadata.title} onChange={event => patch({ title: event.target.value })} placeholder="P.sh. Emrat e produkteve mbeten në origjinal" /></label>
        <label className={styles.field}><span>Përmbajtja</span><textarea className="maro-input" required rows={5} maxLength={4000} value={editor.content} onChange={event => setEditor(previous => previous ? { ...previous, content: event.target.value } : previous)} /></label>
        <fieldset className={styles.memorySettings}><legend>Si ta përdorë Maro?</legend><div className={styles.memoryOptions}>
          <fieldset><legend className={styles.hint}>Lloji i memorjes</legend><div className={styles.kindChoices}>{Object.entries(memoryKinds).map(([value, label]) => <label key={value}><input type="radio" name="memory-kind" value={value} checked={editor.metadata.kind === value} onChange={() => patch({ kind: value as MemoryMetadata["kind"] })}/><span>{label}</span></label>)}</div><p className={styles.hint}>Fakt = informacion · Rregull = preferencë · Ofertë = promocion · Mësim = përvojë.</p></fieldset>
          <label className={styles.field}><span>Vlen për</span><select className="maro-input" value={editor.metadata.scope} onChange={event => patch({ scope: event.target.value as MemoryMetadata["scope"] })}>{Object.entries(memoryScopes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {editor.metadata.scope !== "brand" && <label className={styles.field}><span>{editor.metadata.scope === "product" ? "Produkti / shërbimi" : "Fushata"}</span><input className="maro-input" required maxLength={160} value={editor.metadata.subject} onChange={event => patch({ subject: event.target.value })} /></label>}
          <label className={styles.field}><span>Fjalë kyçe, të ndara me presje</span><input className="maro-input" maxLength={240} value={editor.metadata.keywords} onChange={event => patch({ keywords: event.target.value })} /></label>
          <label className={styles.field}><span>Data e skadimit (opsionale)</span><input type="date" className="maro-input" value={editor.metadata.expiresOn} onChange={event => patch({ expiresOn: event.target.value })} /><small className={styles.hint}>Bosh = pa afat. Me datë, përdoret deri në fund të asaj dite, sipas orës së Shqipërisë.</small></label>
        </div></fieldset>
        {editor.revision > 0 && <p className={styles.hint}>Burimi: {memories.find(item => item.key === editor.key)?.source || "Manual"} · {new Date(memories.find(item => item.key === editor.key)?.createdAt || Date.now()).toLocaleDateString("sq-AL")}</p>}
        {saveError && <p role="alert" className="text-sm text-danger">{saveError} <button type="button" onClick={onRefresh} className="underline">Rifresko listën</button></p>}
        {latest && <div className={styles.conflict}><p>Versioni i fundit: <strong>{latest.metadata.title}</strong></p><p>{latest.content}</p><div className={styles.actions}><Button variant="secondary" onClick={() => { setEditor({ key: latest.key, revision: latest.revision, metadata: { ...latest.metadata }, content: latest.content }); setSaveError(""); }}>Ngarko versionin e fundit</Button><Button variant="secondary" onClick={() => void save({ ...editor, revision: latest.revision })}>Ruaje draftin tim si ndryshim të ri</Button></div></div>}
      </fieldset><ModalFooter><Button type="button" variant="ghost" disabled={busy} onClick={closeEditor}>Anulo</Button><Button type="submit" variant="brand" loading={busy}>Ruaje memorjen</Button></ModalFooter></form>}
    </Modal>
  </div>;
}
