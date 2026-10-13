"use client";
import * as React from "react";
import { Moon, X } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useMaro } from "@/context/store";
import { canUseMoods, type Mood } from "@/lib/moods/model";
import { cn } from "@/lib/utils/cn";
import { MoodCollection, MoodCover } from "./MoodCollection";

export function MoodPicker({ selected, onSelect, disabled }: { selected: Mood | null; onSelect: (mood: Mood | null) => void; disabled?: boolean }) {
  const { user } = useMaro();
  const [open, setOpen] = React.useState(false);
  const [all, setAll] = React.useState(false);
  if (!canUseMoods(user?.email)) return null;
  return <>
    <div className="flex shrink-0 items-center gap-3 lg:block lg:w-24">
      <div className="relative h-24 w-24 shrink-0">
        <button type="button" disabled={disabled} onClick={() => { setAll(false); setOpen(true); }} aria-label={selected ? `Ndërro mood: ${selected.title}` : "Zgjedh maroMood"} className={cn("relative h-24 w-24 overflow-hidden rounded-maro20 border bg-surface text-ink transition-colors hover:border-brand disabled:opacity-50", selected ? "border-brand" : "border-line")}>
          {selected ? <><MoodCover mood={selected} className="h-full" /><span className="absolute inset-x-0 bottom-0 bg-scrim px-2 py-1.5 text-[10px] font-semibold text-on-scrim">{selected.title}</span></> : <span className="flex h-full flex-col items-center justify-center gap-2"><Moon className="h-6 w-6 text-brand" /><span className="text-xs font-semibold">maroMood</span></span>}
        </button>
        {selected && <button type="button" disabled={disabled} aria-label="Hiq mood-in" onClick={() => onSelect(null)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-scrim text-on-scrim"><X className="h-3.5 w-3.5" /></button>}
      </div>
      <p className="text-xs text-ink-3 lg:mt-2 lg:text-center">{selected ? "Mood aktiv" : "Shtoji një temë idesë"}</p>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} size="lg">
      <ModalHeader title="maroMoods" description="Shtoji një atmosferë idesë tënde." icon={<Moon className="h-5 w-5" />} />
      <div className="px-5 pb-6 sm:px-6"><div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Katalogu i moods">
        <button type="button" aria-pressed={!all} onClick={() => setAll(false)} className={cn("min-h-11 rounded-maro12 px-4 text-sm font-semibold", !all ? "bg-surface-selected text-brand" : "bg-surface-2 text-ink-2")}>Të ruajtura</button>
        <button type="button" aria-pressed={all} onClick={() => setAll(true)} className={cn("min-h-11 rounded-maro12 px-4 text-sm font-semibold", all ? "bg-surface-selected text-brand" : "bg-surface-2 text-ink-2")}>Gjej moods</button>
      </div><MoodCollection compact savedOnly={!all} selectedId={selected?.id} onSelect={mood => { onSelect(mood); setOpen(false); }} /></div>
    </Modal>
  </>;
}
