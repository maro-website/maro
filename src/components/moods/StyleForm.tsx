"use client";
import * as React from "react";
import { Globe, LockKeyhole, UploadCloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { STYLE_TITLE_LIMIT, STYLE_INPUT_LIMIT, type Mood, type MoodVisibility } from "@/lib/moods/model";
import { moodRequest, notifyMoodsChanged } from "@/lib/moods/client";
import { MoodCover } from "./MoodCover";

export function StyleForm({ item, platform = false, onClose, onSaved }: { item?: Mood; platform?: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [input, setInput] = React.useState(item?.input_text ?? "");
  const [visibility, setVisibility] = React.useState<MoodVisibility>(item?.visibility ?? "public");
  const [cover, setCover] = React.useState(item?.cover_ref ?? "");
  const [preview, setPreview] = React.useState(item?.cover_url ?? "");
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const requestId = React.useRef("");
  const pending = React.useRef(false);
  const busy = uploading || saving;
  const close = () => { if (!pending.current) onClose(); };
  async function upload(file: File) {
    if (pending.current) return;
    pending.current = true; setUploading(true); setError("");
    try {
      if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Zgjedh PNG, JPG ose WebP deri në 5 MB.");
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Imazhi nuk u lexua.")); reader.readAsDataURL(file); });
      const data = await moodRequest<{ cover_ref: string; url: string }>(platform ? "/api/admin/moods/upload" : "/api/moods/upload", { method: "POST", body: { dataUrl } });
      setCover(data.cover_ref); setPreview(dataUrl);
    } catch (err) { setError((err as Error).message); }
    finally { pending.current = false; setUploading(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setSaving(true); setError("");
    try {
      if (!cover) throw new Error("Ngarko thumbnail-in e stilit.");
      requestId.current ||= crypto.randomUUID();
      const data = await moodRequest<{ item: Mood }>(platform ? "/api/admin/moods" : "/api/moods", { method: item ? "PUT" : "POST", body: {
        title, input_text: input, visibility, cover_ref: cover, request_id: requestId.current,
        ...(item ? { id: item.id, updated_at: item.updated_at } : {}),
      } });
      toast(data.item.status === "failed" ? "Përgatitja dështoi. Hape te Të miat për ta provuar përsëri." : data.item.status === "approved" ? "Stili u publikua." : "Stili u dërgua për aprovim.");
      notifyMoodsChanged(); onSaved();
    } catch (err) { setError((err as Error).message); notifyMoodsChanged(); }
    finally { pending.current = false; setSaving(false); }
  }
  return <Modal open onClose={close} size="lg" closeOnBackdrop={!busy} aria-label={item ? "Ndrysho stilin" : "Krijo stil të ri"}>
    <ModalHeader title={item ? "Ndrysho stilin" : "Krijo stilin tënd"} description="Përshkruaje atmosferën. Maro kujdeset për detajet." icon={<Sparkles className="h-5 w-5" />} />
    <form onSubmit={event => void submit(event)} className="space-y-5 px-5 pb-6 sm:px-6">
      <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-70">
        <div className="flex flex-wrap items-center gap-4"><MoodCover mood={{ title, cover_url: preview }} className="h-24 w-24 shrink-0 rounded-maro16" /><div className="min-w-0"><label className="style-upload"><UploadCloud className="h-5 w-5" />{uploading ? "Duke kontrolluar…" : cover ? "Ndërro thumbnail-in" : "Ngarko thumbnail"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} aria-label="Thumbnail i stilit" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></label><p className="mt-2 text-xs text-ink-3">PNG, JPG ose WebP · Deri në 5 MB</p></div></div>
        <Field label={`Titulli · ${title.length}/${STYLE_TITLE_LIMIT}`}><Input required maxLength={STYLE_TITLE_LIMIT} value={title} onChange={event => setTitle(event.target.value)} placeholder="P.sh. Golden Hour" /></Field>
        <Field label={`Çfarë stili dëshiron? · ${input.length}/${STYLE_INPUT_LIMIT}`}><Textarea required minLength={10} maxLength={STYLE_INPUT_LIMIT} rows={5} value={input} onChange={event => setInput(event.target.value)} placeholder="Dritë e ngrohtë e perëndimit, hije të buta dhe atmosferë verore mesdhetare…" /></Field>
        <fieldset><legend className="mb-2 text-sm font-semibold text-ink">Kush mund ta shohë?</legend><div className="style-visibility">{([{ value: "public", label: "Publik", note: "Për komunitetin, pas aprovimit", Icon: Globe }, { value: "private", label: "Privat", note: "Vetëm ti, pas aprovimit", Icon: LockKeyhole }] as const).map(({ value, label, note, Icon }) => <label key={value} data-selected={visibility === value}><input type="radio" name="style-visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} /><Icon className="h-5 w-5" /><span><strong>{label}</strong><small>{note}</small></span></label>)}</div></fieldset>
        <p className="text-sm leading-relaxed text-ink-3">{platform ? "Publikohet nga llogaria jote me etiketën Maro." : "Thumbnail-i dhe përshkrimi kontrollohen para aprovimit. Privatësia ruhet edhe pas aprovimit. Ndryshimet kërkojnë aprovim të ri."}</p>
      </fieldset>
      {error && <p role="alert" className="text-sm text-ink-2">{error}</p>}
      {saving && <p role="status" className="text-sm text-ink-2">Duke përgatitur stilin… Mund të zgjasë deri në një minutë.</p>}
      <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="secondary" disabled={busy} onClick={close}>Anulo</Button><Button type="submit" loading={saving} disabled={busy || !cover || !title.trim() || input.trim().length < 10}>{platform ? "Publiko stilin" : "Dërgo për aprovim"}</Button></div>
    </form>
  </Modal>;
}
