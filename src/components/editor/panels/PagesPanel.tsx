"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { PanelSection } from "./PanelKit";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { FileText, Plus, MoreHorizontal, Pencil, Copy, Trash2, Check } from "lucide-react";

const PAGE_PRESETS = [
  { name: "About", slug: "about" },
  { name: "Services", slug: "services" },
  { name: "Contact", slug: "contact" },
  { name: "Portfolio", slug: "portfolio" },
  { name: "Blank Page", slug: "page" },
];

export function PagesPanel() {
  const { project, setActivePage, addPage, renamePage, duplicatePage, deletePage } = useEditor();
  const [adding, setAdding] = React.useState(false);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [renameVal, setRenameVal] = React.useState("");

  return (
    <div>
      <PanelSection title="Faqet" action={
        <button onClick={() => setAdding(true)} className="grid h-6 w-6 place-items-center rounded-md text-brand transition-colors hover:bg-brand-soft">
          <Plus className="h-4 w-4" />
        </button>
      }>
        <div className="space-y-1">
          {project.pages.map((p) => {
            const active = p.id === project.activePageId;
            return (
              <div
                key={p.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                  active ? "bg-brand-soft" : "hover:bg-surface-2"
                )}
              >
                <button onClick={() => setActivePage(p.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <FileText className={cn("h-4 w-4 shrink-0", active ? "text-brand" : "text-ink-3")} />
                  <div className="min-w-0">
                    <div className={cn("truncate text-[13.5px] font-semibold", active ? "text-brand" : "text-ink")}>{p.name}</div>
                    <div className="truncate text-[11px] text-ink-3">/{p.slug}</div>
                  </div>
                </button>
                {active && <Check className="h-4 w-4 shrink-0 text-brand" />}
                <Dropdown
                  align="right"
                  trigger={
                    <button className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-3 opacity-0 transition-all hover:bg-surface hover:text-ink group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                  items={[
                    { label: "Riemërto", icon: <Pencil />, onClick: () => { setRenaming(p.id); setRenameVal(p.name); } },
                    { label: "Dyfisho", icon: <Copy />, onClick: () => duplicatePage(p.id) },
                    { divider: true, label: "" },
                    { label: "Fshij", icon: <Trash2 />, danger: true, onClick: () => deletePage(p.id) },
                  ]}
                />
              </div>
            );
          })}
        </div>
      </PanelSection>

      {/* Add page modal */}
      <Modal open={adding} onClose={() => setAdding(false)} size="sm">
        <ModalHeader title="Shto faqe" description="Zgjidh një tip faqeje për ta shtuar në website." />
        <div className="grid grid-cols-1 gap-2 px-6 pb-4">
          {PAGE_PRESETS.map((preset) => (
            <button
              key={preset.slug}
              onClick={() => { addPage(preset.name, preset.slug); setAdding(false); }}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand/40 hover:bg-surface-2"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                <FileText className="h-4 w-4" />
              </span>
              <span className="text-[14px] font-semibold text-ink">{preset.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Rename page modal */}
      <Modal open={!!renaming} onClose={() => setRenaming(null)} size="sm">
        <ModalHeader title="Riemërto faqen" />
        <div className="px-6 pb-2">
          <Input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && renaming) { renamePage(renaming, renameVal.trim() || "Faqe"); setRenaming(null); }
          }} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setRenaming(null)}>Anulo</Button>
          <Button onClick={() => { if (renaming) { renamePage(renaming, renameVal.trim() || "Faqe"); setRenaming(null); } }}>Ruaj</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
