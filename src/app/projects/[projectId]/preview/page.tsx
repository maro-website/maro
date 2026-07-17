"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMaro } from "@/context/store";
import { WebsitePreview } from "@/components/website-previews/WebsitePreview";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Misc";
import { MaroSymbol } from "@/components/ui/Logo";
import { ArrowLeft, Download } from "lucide-react";

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, getProject } = useMaro();
  const project = getProject(projectId);

  if (!ready) return <div className="grid h-screen place-items-center"><Spinner className="h-6 w-6" /></div>;

  if (!project) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="text-center">
          <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>Kthehu te dashboard</Button>
        </div>
      </div>
    );
  }

  const isHtml = project.renderMode === "html" && !!project.htmlPages?.length;

  const downloadHtml = () => {
    const page =
      project.htmlPages?.find((p) => p.id === project.activeHtmlPageId) ??
      project.htmlPages?.[0];
    if (!page) return;
    const blob = new Blob([page.html], { type: "text/html" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${page.slug || "index"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-2 backdrop-blur">
        <button
          onClick={() => router.push(`/projects/${projectId}/editor`)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Kthehu te editori
        </button>
        <div className="flex items-center gap-2 text-[12px] font-medium text-ink-3">
          <MaroSymbol className="h-5 w-5" /> Preview · {project.previewUrl}
        </div>
        {isHtml ? (
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={downloadHtml}>
            Shkarko HTML
          </Button>
        ) : (
          <span className="w-[130px]" />
        )}
      </div>
      <WebsitePreview project={project} fullHeight />
    </div>
  );
}
