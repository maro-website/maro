"use client";

import { ArrowUpRight, Bookmark, Check, LockKeyhole, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STYLE_STATUS_LABELS, type Mood } from "@/lib/moods/model";
import { cn } from "@/lib/utils/cn";
import { MoodCover } from "./MoodCover";

export function StyleCard({ mood, own, selected, busy, onOpen, onSave, onUse, onEdit, onDelete }: {
  mood: Mood; own: boolean; selected: boolean; busy: boolean;
  onOpen: () => void; onSave: () => void; onUse: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const usable = mood.status === "approved";
  const author = mood.publisher_name || "Maro";
  const initials = author.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("");
  return <article className="style-card" data-selected={selected || undefined}>
    <div className="style-card-artwork">
      <button type="button" className="style-card-preview" onClick={onOpen} aria-label={`Shiko stilin ${mood.title}`}>
        <MoodCover mood={mood} className="h-full w-full" />
        <span className="style-card-reveal"><span>Shiko stilin <ArrowUpRight className="h-4 w-4" /></span></span>
      </button>
      <div className="style-card-badges">
        {selected ? <span className="style-card-selected"><Check className="h-3.5 w-3.5" /> Në përdorim</span>
          : mood.source === "platform" ? <span>Nga Maro</span> : null}
        {mood.visibility === "private" && <span><LockKeyhole className="h-3 w-3" /> Privat</span>}
      </div>
      {usable && <button type="button" className="style-card-save" disabled={busy} onClick={onSave} aria-pressed={mood.saved} aria-label={`${mood.saved ? "Largo" : "Ruaj"} ${mood.title}`}><Bookmark className={cn("h-5 w-5", mood.saved && "fill-current")} /></button>}
    </div>
    <div className="style-card-info">
      <div className="style-card-title-row"><button type="button" onClick={onOpen}><h3>{mood.title}</h3></button>{usable && <button type="button" className="style-card-use" onClick={onUse} disabled={busy} aria-label={`Përdore ${mood.title}`} title="Përdore në maroImazh"><ArrowUpRight className="h-5 w-5" /></button>}</div>
      <p className="style-card-description">{mood.description || "Një atmosferë e re për idenë tënde."}</p>
      <div className="style-card-author"><span className="style-author-avatar" aria-hidden="true">{initials}</span><span>{author}</span>{mood.source !== "platform" && <small>Komuniteti</small>}</div>
      {own && <div className="style-card-management"><p className="style-card-status" data-status={mood.status}>{mood.status && STYLE_STATUS_LABELS[mood.status]}</p><div><Button variant="ghost" size="icon" disabled={busy || (mood.status === "processing" && Date.parse(mood.updated_at ?? "") > Date.now() - 120_000)} aria-label={`Ndrysho ${mood.title}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={busy} aria-label={`Fshi ${mood.title}`} onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div></div>}
      {own && mood.rejection_reason && <p className="style-card-reason">{mood.rejection_reason}</p>}
    </div>
  </article>;
}
