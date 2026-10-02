"use client";
import * as React from "react";
import { Image as ImageIcon, Upload } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { AssetsLibrary } from "./AssetsLibrary";
import type { LibrarySelection } from "@/lib/services/assetLibrary";

export function AttachmentPicker({ open, onClose, onUpload, onSelect, limit, excludeRefs = [] }: {
  open: boolean; onClose: () => void; onUpload: () => void; onSelect: (assets: LibrarySelection[]) => void;
  limit: number; excludeRefs?: string[];
}) {
  const [library, setLibrary] = React.useState(false);
  React.useEffect(() => { if (!open) setLibrary(false); }, [open]);
  return <Modal open={open} onClose={onClose} size={library ? "lg" : "sm"} className={library ? "max-w-[960px]" : undefined} aria-label="Bashkëngjit asete">
    <ModalHeader title={library ? "Asetet" : "Bashkëngjit"} description={library ? `Zgjedh deri në ${limit} imazhe nga biblioteka.` : "Zgjedh nga biblioteka ose ngarko nga kompjuteri."} />
    {library ? <React.Suspense fallback={null}><AssetsLibrary picker={{ limit, excludeRefs, onSelect: assets => { onSelect(assets); onClose(); } }} /></React.Suspense>
      : <div className="grid gap-3 px-6 pb-6"><button type="button" onClick={() => setLibrary(true)} className="flex items-center gap-3 rounded-xl bg-surface-2 p-4 text-left font-semibold text-ink hover:bg-surface-hover"><ImageIcon className="h-5 w-5" /> Nga biblioteka</button><button type="button" onClick={() => { onClose(); onUpload(); }} className="flex items-center gap-3 rounded-xl bg-surface-2 p-4 text-left font-semibold text-ink hover:bg-surface-hover"><Upload className="h-5 w-5" /> Ngarko nga kompjuteri</button></div>}
  </Modal>;
}
