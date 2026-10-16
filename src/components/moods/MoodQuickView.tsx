"use client";

import { ArrowUpRight, Bookmark, Check, Moon, Sparkles } from "lucide-react";
import { StableImage } from "@/components/app/StableImage";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Mood } from "@/lib/moods/model";
import { cn } from "@/lib/utils/cn";

export function MoodQuickView({ mood, busy, using, selected, inComposer, onClose, onSave, onUse }: {
  mood: Mood; busy: boolean; using: boolean; selected: boolean; inComposer: boolean;
  onClose: () => void; onSave: () => void; onUse: () => void;
}) {
  return <Modal open onClose={onClose} size="lg" aria-label={`Preview i mood-it ${mood.title}`} className="moods-quick-view max-w-5xl p-0">
    <div className="moods-quick-layout">
      <div className="moods-quick-image"><StableImage src={mood.cover_url} alt={mood.title} loading="eager" className="h-full w-full object-contain" /></div>
      <div className="moods-quick-info">
        <p className="moods-eyebrow"><Moon className="h-5 w-5" /> maroMood</p>
        {selected && <span className="moods-active-label"><Check className="h-3.5 w-3.5" /> Mood-i që po përdor</span>}
        <h2>{mood.title}</h2>
        <p className="moods-quick-description">{mood.description || "Një atmosferë e re për idenë që e ke gati."}</p>
        <div className="moods-quick-how">
          <h3>Çka i shton idesë tënde?</h3>
          <p><Sparkles className="h-4 w-4" /> Skenë, dritë dhe detaje në këtë atmosferë.</p>
          <p><Check className="h-4 w-4" /> Kombinohet me presetin dhe referencat e tua.</p>
          <p><Check className="h-4 w-4" /> Produkti dhe etiketa mbeten siç janë.</p>
        </div>
        <div className="moods-quick-actions">
          <Button variant="secondary" size="icon" disabled={busy} onClick={onSave} aria-pressed={mood.saved} aria-label={mood.saved ? `Largo ${mood.title} nga të ruajturat` : `Ruaj ${mood.title}`}><Bookmark className={cn("h-5 w-5", mood.saved && "fill-current text-brand")} /></Button>
          <Button variant="brand" size="lg" disabled={busy} loading={using} onClick={onUse} iconRight={<ArrowUpRight className="h-5 w-5" />}>{using ? "Duke hapur…" : "Përdore këtë mood"}</Button>
        </div>
        <p className="moods-quick-note">{inComposer ? "I shtohet idesë që po përgatit. Gjenerimi nis kur të jesh gati." : "Hapet te maroImazh. Gjenerimi nis kur të jesh gati."}</p>
      </div>
    </div>
  </Modal>;
}
