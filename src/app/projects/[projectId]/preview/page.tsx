"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import { WebsitePreview } from "@/components/website-previews/WebsitePreview";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Misc";
import { ArrowLeft, Download } from "lucide-react";

function PreviewInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, getProject } = useMaro();
  const project = getProject(projectId);

  if (!ready) {
    return (
      <AppShell hideFooter>
        <div className="grid min-h-0 flex-1 place-items-center">
          <Spinner className="h-6 w-6" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell hideFooter>
        <div className="grid min-h-0 flex-1 place-items-center px-6">
          <div className="text-center">
            <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
            <Button className="mt-4" onClick={() => router.push("/krijimet")}>
              Kthehu te krijimet
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const isHtml = project.renderMode === "html" && !!project.htmlPages?.length;

  const downloadHtml = () => {
    const page = project.htmlPages?.find((p) => p.id === project.activeHtmlPageId) ?? project.htmlPages?.[0];
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
    <AppShell hideFooter>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <div className="flex shrink-0 items-center justify-between gap-[10px] border-b border-line bg-canvas px-[20px] py-[10px] lg:px-[30px]">
          <button
            onClick={() => router.push(`/projects/${projectId}/editor`)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Kthehu te editori
          </button>
          <div className="truncate px-3 text-[12px] font-medium text-ink-3">
            Preview · {project.previewUrl}
          </div>
          {isHtml ? (
            <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={downloadHtml}>
              Shkarko HTML
            </Button>
          ) : (
            <span className="w-[130px]" />
          )}
        </div>
        <div className="min-h-0 flex-1">
          <WebsitePreview project={project} fullHeight />
        </div>
      </div>
    </AppShell>
  );
}

export default function PreviewPage() {
  return (
    <AuthGate>
      <PreviewInner />
    </AuthGate>
  );
}
