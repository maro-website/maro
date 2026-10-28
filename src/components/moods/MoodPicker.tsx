"use client";
import * as React from "react";
import { BadgePlus, Moon, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useMaro } from "@/context/store";
import { canUseMoods, type Mood } from "@/lib/moods/model";
import { cn } from "@/lib/utils/cn";
import { MoodCollection, MoodCover } from "./MoodCollection";
import { SwitchTrack } from "@/components/ui/Switch";
import { moodRequest } from "@/lib/moods/client";

export function MoodPicker({ selected, onSelect, disabled, variant = "desktop" }: { selected: Mood | null; onSelect: (mood: Mood | null) => void; disabled?: boolean; variant?: "desktop" | "mobile" }) {
  const { user } = useMaro();
  const [open, setOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<{ owner: string; mood: Mood } | null>(null);
  const userId = user?.id;
  const eligible = canUseMoods(user?.email);
  React.useEffect(() => {
    if (!eligible || !userId || variant !== "desktop") return;
    const media = window.matchMedia("(min-width: 64rem)");
    const controller = new AbortController();
    let started = false;
    const load = () => {
      if (!media.matches || started) return;
      started = true;
      void moodRequest<{ items: Mood[] }>("/api/moods", { signal: controller.signal }).then(({ items }) => {
        if (controller.signal.aborted) return;
        const covers = items.filter(mood => mood.cover_url);
        const key = `maro:mood-preview:${userId}`;
        let previous: string | null = null;
        try { previous = sessionStorage.getItem(key); } catch { /* Browser storage may be unavailable. */ }
        const alternatives = covers.filter(mood => mood.id !== previous);
        const choices = alternatives.length ? alternatives : covers;
        const mood = choices[Math.floor(Math.random() * choices.length)];
        if (!mood) return;
        setPreview({ owner: userId, mood });
        try { sessionStorage.setItem(key, mood.id); } catch { /* Preview remains available in memory. */ }
      }).catch(() => { /* A decorative preview never blocks the picker or generation. */ });
    };
    load(); media.addEventListener("change", load);
    return () => { controller.abort(); media.removeEventListener("change", load); };
  }, [eligible, userId, variant]);
  const previewMood = selected ?? (preview && preview.owner === userId ? preview.mood : null);
  const openPicker = () => setOpen(true);
  if (!canUseMoods(user?.email)) return null;
  return <>
    {variant === "mobile" ? <div className="flex min-w-0 items-center gap-2 lg:hidden">
      <button type="button" disabled={disabled} role="switch" aria-checked={Boolean(selected) || open} aria-label="maroStyles" onClick={() => { if (selected) onSelect(null); else openPicker(); }} className="fort-pill maro-switch disabled:opacity-50" style={{ background: "#fff", color: "#000" }} title="Shtoji një mood idesë">
        <Moon className="h-3.5 w-3.5" /><span>maroStyles</span><SwitchTrack checked={Boolean(selected) || open} />
      </button>
      {selected && <button type="button" disabled={disabled} onClick={openPicker} aria-label={`Ndërro mood: ${selected.title}`} className="min-h-11 min-w-0 truncate text-xs text-ink-2 disabled:opacity-50" title={selected.title}>{selected.title}</button>}
    </div> : <div className="maro-mood-tile">
      <button type="button" disabled={disabled} onClick={openPicker} aria-pressed={Boolean(selected)} aria-label={selected ? `Ndërro mood: ${selected.title}` : "Zgjedh maroStyles"} className={cn("maro-mood-tile__button rounded-maro20 border bg-surface transition-colors hover:border-brand disabled:opacity-50", selected ? "border-brand" : "border-line")}>
        {previewMood && <span className="maro-mood-tile__preview"><MoodCover mood={previewMood} className="h-full" /></span>}
        <span className="maro-mood-tile__shade" />
        <span className="maro-mood-tile__label"><BadgePlus className="h-7 w-7 text-brand" /><span className="text-base font-semibold text-on-scrim">maroStyles</span>{selected && <span className="max-w-full truncate px-3 text-[11px] text-on-scrim">{selected.title}</span>}</span>
      </button>
      {selected && <button type="button" disabled={disabled} aria-label="Hiq mood-in" onClick={() => onSelect(null)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-scrim text-on-scrim"><X className="h-3.5 w-3.5" /></button>}
    </div>}
    <Modal open={open} onClose={() => setOpen(false)} size="lg" aria-label="Zgjedh maroStyles" className="moods-picker max-w-5xl p-0">
      <header className="moods-picker-header"><p className="moods-eyebrow"><Moon className="h-5 w-5" /> maroStyles</p><h2>Çfarë mood-i po i jep?</h2><p>Një atmosferë e re për idenë që e ke gati.</p></header>
      <div className="moods-picker-body"><MoodCollection compact selectedId={selected?.id} onSelect={mood => { onSelect(mood); setOpen(false); }} /></div>
    </Modal>
  </>;
}
