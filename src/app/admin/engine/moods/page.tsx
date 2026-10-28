"use client";
import * as React from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Input";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { MoodCover } from "@/components/moods/MoodCover";
import { StyleForm } from "@/components/moods/StyleForm";
import { STYLE_STATUS_LABELS, canUseMoods, type AdminMood } from "@/lib/moods/model";
import { moodRequest, notifyMoodsChanged } from "@/lib/moods/client";
import "@/components/moods/moods.css";
export default function AdminMoodsPage() {
  const { user, ready } = useMaro(), { toast } = useToast();
  const [result, setResult] = React.useState<{ owner: string; items: AdminMood[]; hasMore: boolean }>({ owner: "", items: [], hasMore: false });
  const [status, setStatus] = React.useState("pending"), [page, setPage] = React.useState(0), [refresh, setRefresh] = React.useState(0);
  const [loading, setLoading] = React.useState(true), [error, setError] = React.useState("");
  const [editor, setEditor] = React.useState<AdminMood | "new" | null>(null), [rejecting, setRejecting] = React.useState<AdminMood | null>(null);
  const [reason, setReason] = React.useState(""), [busy, setBusy] = React.useState(false), pending = React.useRef(false);
  const eligible = canUseMoods(user?.email), userId = user?.id;
  React.useEffect(() => { setEditor(null); setRejecting(null); setPage(0); }, [userId]);
  React.useEffect(() => {
    if (!eligible || !userId) return;
    const controller = new AbortController(); setLoading(true); setError("");
    void Promise.all(Array.from({ length: page + 1 }, (_, index) => moodRequest<{ items: AdminMood[]; hasMore: boolean }>(`/api/admin/moods?status=${status}&page=${index}`, { signal: controller.signal }))).then(pages => {
      if (!controller.signal.aborted) setResult({ owner: userId, items: pages.flatMap(p => p.items), hasMore: pages.at(-1)?.hasMore ?? false });
    }).catch(err => { if (!controller.signal.aborted) setError((err as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [eligible, userId, status, page, refresh]);
  const items = result.owner === userId ? result.items : [];
  async function review(item: AdminMood, decision: "approved" | "rejected") {
    if (pending.current) return; pending.current = true; setBusy(true);
    try {
      await moodRequest("/api/admin/moods", { method: "PATCH", body: { id: item.id, updated_at: item.updated_at, decision, ...(decision === "rejected" ? { reason } : {}) } });
      setRejecting(null); setReason(""); notifyMoodsChanged(); setRefresh(n => n + 1); toast(decision === "approved" ? "Stili u aprovua." : "Stili u refuzua.");
    } catch (err) { toast((err as Error).message, "error"); }
    finally { pending.current = false; setBusy(false); }
  }
  if (!ready) return <p className="py-12 text-center text-ink-3">Duke ngarkuar…</p>;
  if (!eligible) return <p className="py-12 text-center text-ink-2">maroStyles është në pilot privat.</p>;
  return <div className="styles-admin">
    <AdminPageHeader title="maroStyles" description="Krahaso kërkesën e përdoruesit me promptin e gjeneruar nga Maro dhe kontrollo thumbnail-in para aprovimit." />
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="styles-tabs" role="group" aria-label="Statusi i stileve">{[{ id: "pending", label: "Për aprovim" }, { id: "approved", label: "Të aprovuara" }, { id: "rejected", label: "Të refuzuara" }, { id: "all", label: "Të gjitha" }].map(t => <button type="button" key={t.id} aria-pressed={status === t.id} onClick={() => { setStatus(t.id); setPage(0); setResult({ owner: "", items: [], hasMore: false }); }}>{t.label}</button>)}</div><Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditor("new")}>Krijo stil nga Maro</Button></div>
    {error ? <div role="alert" className="moods-empty"><p>{error}</p><Button variant="secondary" onClick={() => setRefresh(n => n + 1)}>Provo përsëri</Button></div> : loading ? <p role="status" className="py-10 text-ink-3">Duke ngarkuar…</p> : !items.length ? <div className="moods-empty"><Check className="h-8 w-8" /><h2>{status === "pending" ? "Nuk ka kërkesa në pritje." : "Nuk ka stile në këtë kategori."}</h2></div> : <div className="space-y-4">{items.map(item => <article key={item.id} className="style-review"><MoodCover mood={item} className="style-review-cover" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-bold text-ink">{item.title}</h2><span className="style-source">{item.source === "platform" ? "Maro" : "Komuniteti"}</span><span className="text-xs text-ink-3">{item.visibility === "private" ? "Privat" : "Publik"}</span></div><p className="mt-2 text-sm text-ink-3">Nga {item.publisher_name} · {item.status && STYLE_STATUS_LABELS[item.status]}</p><div className="style-review-prompts">
      <section className="style-original" aria-labelledby={`style-input-${item.id}`}>
        <h3 id={`style-input-${item.id}`}>Kërkesa e përdoruesit</h3>
        <p>{item.input_text || "Kërkesa origjinale nuk është ruajtur."}</p>
      </section>
      <section className="style-original" aria-labelledby={`style-prompt-${item.id}`}>
        <h3 id={`style-prompt-${item.id}`}>Prompti i gjeneruar nga Maro</h3>
        <p>{item.generated_prompt || (item.status === "processing" ? "Prompti është duke u përgatitur." : item.status === "failed" ? "Përgatitja dështoi. Nuk ka prompt për këtë kërkesë." : "Prompti nuk është i disponueshëm.")}</p>
      </section>
    </div>{item.rejection_reason && <p className="mt-3 text-sm text-ink-2">Arsyeja: {item.rejection_reason}</p>}<div className="mt-4 flex flex-wrap gap-2">{["pending", "approved", "rejected"].includes(item.status ?? "") && <>{item.status !== "approved" && <Button size="sm" disabled={busy} icon={<Check className="h-4 w-4" />} onClick={() => void review(item, "approved")}>Aprovo</Button>}{item.status !== "rejected" && <Button variant="secondary" size="sm" disabled={busy} icon={<X className="h-4 w-4" />} onClick={() => { setRejecting(item); setReason(""); }}>Refuzo</Button>}</>}{item.created_by === userId && <Button size="sm" variant="secondary" disabled={busy || (item.status === "processing" && Date.parse(item.updated_at) > Date.now() - 120_000)} icon={<Pencil className="h-4 w-4" />} onClick={() => setEditor(item)}>Ndrysho</Button>}</div></div></article>)}</div>}
    {result.hasMore && <div className="mt-6 text-center"><Button variant="secondary" disabled={loading} onClick={() => setPage(n => n + 1)}>Shfaq më shumë</Button></div>}
    {editor && <StyleForm platform item={editor === "new" ? undefined : { ...editor, saved: false }} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setRefresh(n => n + 1); }} />}
    <Modal open={Boolean(rejecting)} onClose={() => { if (!busy) setRejecting(null); }} size="sm"><ModalHeader title="Refuzo stilin" description={rejecting?.title} /><form className="space-y-4 px-6 pb-6" onSubmit={event => { event.preventDefault(); if (rejecting) void review(rejecting, "rejected"); }}><Field label="Arsyeja për krijuesin"><Textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder="Çfarë duhet të ndryshojë krijuesi?" disabled={busy} /></Field><div className="flex justify-end gap-3"><Button type="button" variant="secondary" disabled={busy} onClick={() => setRejecting(null)}>Anulo</Button><Button type="submit" variant="danger" loading={busy} disabled={!reason.trim()}>Refuzo</Button></div></form></Modal>
  </div>;
}