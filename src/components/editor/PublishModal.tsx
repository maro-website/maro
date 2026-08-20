"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Project } from "@/lib/types";
import { Download, ExternalLink, FileCode, Info } from "lucide-react";

/** Export flow — Maro does not host generated websites. */
export function PublishModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const page =
    project.htmlPages?.find((p) => p.id === project.activeHtmlPageId) ?? project.htmlPages?.[0];
  const canDownloadHtml = project.renderMode === "html" && !!page?.html;

  const downloadHtml = () => {
    if (!page?.html) {
      toast("Nuk ka HTML për shkarkim ende.");
      return;
    }
    const blob = new Blob([page.html], { type: "text/html" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${page.slug || project.name || "index"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    toast("HTML u shkarkua.");
  };

  const openPreview = () => {
    router.push(`/projects/${project.id}/preview`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader
        icon={<Download className="h-5 w-5" />}
        title="Shkarko projektin"
        description="maro nuk hoston website-et e gjeneruara. Eksporto kodin dhe publikoje ku të duash."
      />

      <div className="space-y-4 px-6 pb-2">
        <div className="flex gap-3 rounded-maro12 bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p>
            Preview URL (<span className="font-mono text-ink">{project.previewUrl}</span>) shërben vetëm
            për shikim brenda maro — nuk publikon automatikisht në internet.
          </p>
        </div>

        {canDownloadHtml ? (
          <Button className="w-full" icon={<FileCode className="h-4 w-4" />} onClick={downloadHtml}>
            Shkarko HTML
          </Button>
        ) : (
          <p className="rounded-xl bg-surface px-4 py-3 text-[13px] text-ink-2">
            Për këtë projekt, hap preview-in dhe përdor opsionin e shkarkimit kur HTML është gati.
          </p>
        )}

        <Button variant="outline" className="w-full" icon={<ExternalLink className="h-4 w-4" />} onClick={openPreview}>
          Hape preview-in
        </Button>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Mbyll
        </Button>
      </ModalFooter>
    </Modal>
  );
}
