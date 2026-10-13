"use client";
import * as React from "react";
import { Moon, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { MoodCover } from "@/components/moods/MoodCollection";
import { canUseMoods, type AdminMood } from "@/lib/moods/model";
import { moodRequest, notifyMoodsChanged } from "@/lib/moods/client";

const empty = () => ({ title: "", description: "", prompt: "", cover_url: null as string | null, active: false, sort_order: 0 });
export default function AdminMoodsPage() {
  const { user, ready } = useMaro();
  const { toast } = useToast();
  const eligible = canUseMoods(user?.email);
  const [items, setItems] = React.useState<AdminMood[]>([]);
  const [draft, setDraft] = React.useState(empty);
  const [editing, setEditing] = React.useState<AdminMood | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<AdminMood | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await moodRequest<{ items: AdminMood[] }>("/api/admin/moods"); setItems(data.items); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { if (eligible) void load(); else setItems([]); }, [eligible, user?.id, load]);
  function edit(mood?: AdminMood) { setEditing(mood ?? null); setDraft(mood ? { title: mood.title, description: mood.description, prompt: mood.prompt, cover_url: mood.cover_url, active: mood.active, sort_order: mood.sort_order } : empty()); setOpen(true); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      await moodRequest("/api/admin/moods", { method: editing ? "PUT" : "POST", body: { ...draft, ...(editing ? { id: editing.id, updated_at: editing.updated_at } : {}) } });
      toast("Mood-i u ruajt."); setOpen(false); notifyMoodsChanged(); await load();
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!pendingDelete) return;
    setSaving(true);
    try { await moodRequest("/api/admin/moods", { method: "DELETE", body: { id: pendingDelete.id, updated_at: pendingDelete.updated_at } }); setPendingDelete(null); toast("Mood-i u fshi."); notifyMoodsChanged(); await load(); }
    catch (err) { toast((err as Error).message, "error"); }
    finally { setSaving(false); }
  }
  async function upload(file: File) {
    setUploading(true);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Përdor një imazh deri në 8 MB.");
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const { url } = await moodRequest<{ url: string }>("/api/admin/moods/upload", { method: "POST", body: { dataUrl } });
      setDraft(current => ({ ...current, cover_url: url }));
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setUploading(false); }
  }
  if (!ready) return <p className="py-12 text-center text-ink-3">Duke ngarkuar…</p>;
  if (!eligible) return <p className="py-12 text-center text-ink-2">maroMood nuk është i disponueshëm për këtë llogari.</p>;
  return <div>
    <AdminPageHeader title="maroMoods" description="Krijo tema që i shtohen idesë së përdoruesit. Beta private për erzen@nice.al." />
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3">{items.length} moods · {items.filter(item => item.active).length} aktive</p><Button icon={<Plus className="h-4 w-4" />} onClick={() => edit()}>Shto mood</Button></div>
    {error ? <div role="alert" className="rounded-maro16 bg-surface p-6 text-ink-2"><p>{error}</p><Button variant="secondary" className="mt-3" onClick={() => void load()}>Rifresko</Button></div> : loading ? <p role="status" className="py-12 text-center text-ink-3">Duke ngarkuar moods…</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(mood => <article key={mood.id} className="overflow-hidden rounded-maro20 border border-line bg-surface"><MoodCover mood={mood} /><div className="p-4"><div className="flex justify-between gap-3"><h2 className="font-bold text-ink">{mood.title}</h2><span className={mood.active ? "text-xs text-brand" : "text-xs text-ink-3"}>{mood.active ? "Aktiv" : "Draft"}</span></div><p className="mt-2 text-sm text-ink-3">{mood.description}</p><p className="mt-2 text-xs text-ink-3">Renditja: {mood.sort_order}</p><div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => edit(mood)}>Edito</Button><Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setPendingDelete(mood)}>Fshi</Button></div></div></article>)}</div>}
    {!loading && !error && !items.length && <p className="rounded-maro16 bg-surface p-8 text-center text-ink-3">Krijoje mood-in e parë.</p>}
    <Modal open={open} onClose={() => { if (!saving && !uploading) setOpen(false); }} size="lg" closeOnBackdrop={!saving && !uploading}>
      <ModalHeader title={editing ? "Edito mood" : "Shto mood"} icon={<Moon className="h-5 w-5" />} />
      <form onSubmit={event => void submit(event)} className="space-y-4 px-5 pb-6 sm:px-6">
        <Field label="Emri"><Input required maxLength={140} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="Halloween Mood" /></Field>
        <Field label="Përshkrimi"><Textarea maxLength={1000} rows={2} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></Field>
        <div className="flex items-center gap-4"><MoodCover mood={draft} className="h-24 w-24 shrink-0 rounded-maro16" /><div><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-maro12 bg-surface-2 px-4 text-sm font-semibold text-ink"><UploadCloud className="h-4 w-4" />{uploading ? "Duke ngarkuar…" : "Ngarko cover"}<input aria-label="Ngarko cover të mood-it" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || saving} className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></label><p className="mt-2 text-xs text-ink-3">PNG, JPG ose WebP. Rekomandohet 1:1.</p>{draft.cover_url && <button type="button" className="mt-2 text-xs text-ink-2 underline" disabled={uploading || saving} onClick={() => setDraft(current => ({ ...current, cover_url: null }))}>Hiq cover-in</button>}</div></div>
        <Field label="Prompti i mood-it"><Textarea required maxLength={6000} rows={6} value={draft.prompt} onChange={event => setDraft(current => ({ ...current, prompt: event.target.value }))} placeholder="Make the scenery look like Halloween…" /></Field>
        <p className="text-xs leading-relaxed text-ink-3">Maro e shton këtë prompt pas kërkesës së plotë. Udhëzimi për ruajtjen e produktit, brendit dhe etiketës shtohet automatikisht.</p>
        <div className="flex flex-wrap items-center gap-5"><Field label="Renditja"><Input type="number" min={0} max={100000} required value={draft.sort_order} onChange={event => setDraft(current => ({ ...current, sort_order: Number(event.target.value) }))} /></Field><div className="flex min-h-11 items-center gap-3 text-sm text-ink"><Switch checked={draft.active} onChange={active => setDraft(current => ({ ...current, active }))} aria-label="Mood aktiv" />Aktiv</div></div>
        <div className="flex justify-end gap-3"><Button variant="secondary" type="button" disabled={saving || uploading} onClick={() => setOpen(false)}>Anulo</Button><Button type="submit" loading={saving} disabled={uploading}>Ruaj mood</Button></div>
      </form>
    </Modal>
    <Modal open={Boolean(pendingDelete)} onClose={() => { if (!saving) setPendingDelete(null); }} size="sm"><ModalHeader title="Fshi mood-in" description={`Do të fshihet ${pendingDelete?.title ?? ""} edhe nga moods e ruajtura.`} /><div className="flex justify-end gap-3 px-6 pb-6"><Button variant="secondary" disabled={saving} onClick={() => setPendingDelete(null)}>Anulo</Button><Button variant="danger" loading={saving} onClick={() => void remove()}>Fshi</Button></div></Modal>
  </div>;
}
