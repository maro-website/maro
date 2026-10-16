"use client";

import { ArrowUpRight, Bookmark, Check } from "lucide-react";
import type { Mood } from "@/lib/moods/model";
import { cn } from "@/lib/utils/cn";
import { MoodCover } from "./MoodCover";

export function MoodCard({ mood, selected, busy, onOpen, onSave }: {
  mood: Mood; selected: boolean; busy: boolean; onOpen: () => void; onSave: () => void;
}) {
  return <article className="mood-card" data-selected={selected || undefined}>
    <div className="mood-card-artwork">
      <button type="button" onClick={onOpen} className="mood-card-preview" aria-label={`Shiko mood-in ${mood.title}`}>
        <MoodCover mood={mood} className="h-full" />
        <span className="mood-card-reveal"><span>Shiko mood-in <ArrowUpRight className="h-4 w-4" /></span></span>
      </button>
      {selected && <span className="mood-card-selected"><Check className="h-3.5 w-3.5" /> Në përdorim</span>}
      <button type="button" disabled={busy} onClick={onSave} className="mood-card-save" aria-pressed={mood.saved} aria-label={mood.saved ? `Largo ${mood.title} nga të ruajturat` : `Ruaj ${mood.title}`}>
        <Bookmark className={cn("h-5 w-5", mood.saved && "fill-current")} />
      </button>
    </div>
    <div className="mood-card-info">
      <button type="button" onClick={onOpen} className="mood-card-title"><h3>{mood.title}</h3>{mood.description && <p>{mood.description}</p>}</button>
      <button type="button" onClick={onOpen} className="mood-card-open" aria-label={`Shiko dhe përdor ${mood.title}`}><ArrowUpRight className="h-5 w-5" /></button>
    </div>
  </article>;
}
