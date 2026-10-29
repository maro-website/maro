"use client";

import { Bookmark, Check, LockKeyhole, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
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
  const editable = !(mood.status === "processing" && Date.parse(mood.updated_at ?? "") > Date.now() - 120_000);
  return <article className="style-card" data-selected={selected || undefined}>
    <button type="button" className="style-card-preview" onClick={onOpen} aria-label={`Shiko stilin ${mood.title}`}>
      <MoodCover mood={mood} className="h-full w-full" />
    </button>
    <div className="style-card-info">
      <div className="style-card-title-row">
        <button type="button" onClick={onOpen} title={mood.title}><h3>{mood.title}</h3></button>
        {usable && <button type="button" className="style-card-use" onClick={onUse} disabled={busy} aria-label={`Përdore ${mood.title}`} aria-pressed={selected} title={selected ? "Stili në përdorim" : "Përdore në maroImazh"}>{selected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</button>}
      </div>
      <p className="style-card-description">{mood.description || "Një atmosferë e re për idenë tënde."}</p>
      <div className="style-card-meta">
        <span>{mood.source === "platform" ? "Nga Maro" : "Komuniteti"}</span>
        {mood.visibility === "private" && <span><LockKeyhole className="h-3 w-3" /> Privat</span>}
        {selected ? <span className="style-card-selected"><Check className="h-3 w-3" /> Në përdorim</span>
          : own && mood.status && <span className="style-card-status" data-status={mood.status}>{STYLE_STATUS_LABELS[mood.status]}</span>}
      </div>
      <div className="style-card-footer">
        <div className="style-card-author"><span className="style-author-avatar" aria-hidden="true">{initials}</span><span title={author}>{author}</span></div>
        <div className="style-card-actions">
          {usable && <button type="button" className="style-card-save" disabled={busy} onClick={onSave} aria-pressed={mood.saved} aria-label={`${mood.saved ? "Largo" : "Ruaj"} ${mood.title}`} title={mood.saved ? "Largo nga të ruajturat" : "Ruaj stilin"}><Bookmark className={cn("h-5 w-5", mood.saved && "fill-current")} /></button>}
          {own && <Dropdown className="style-card-menu" trigger={<Button variant="ghost" size="icon" disabled={busy} aria-label={`Veprime për ${mood.title}`}><MoreHorizontal className="h-5 w-5" /></Button>} items={[
            ...(editable ? [{ label: "Ndrysho stilin", icon: <Pencil />, onClick: onEdit }] : []),
            { label: "Fshi stilin", icon: <Trash2 />, danger: true, onClick: onDelete },
          ]} />}
        </div>
      </div>
      {own && mood.rejection_reason && <p className="style-card-reason" title={mood.rejection_reason}>Arsyeja: {mood.rejection_reason}</p>}
    </div>
  </article>;
}
