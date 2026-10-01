"use client";

import * as React from "react";
import Link from "next/link";
import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import type { Project } from "@/lib/types";
import { AiHtmlPreviewFrame } from "@/components/website-previews/AiHtmlPreviewFrame";
import { StableImage } from "@/components/app/StableImage";
import { Eye, Pencil, RefreshCw, X } from "lucide-react";

function projectPreviewHtml(project: Project): string | null {
  const page = project.htmlPages?.find((p) => p.id === project.activeHtmlPageId) ?? project.htmlPages?.[0];
  return page?.html?.trim() ? page.html : null;
}

export function WebWorkspace({ toolId }: { toolId: string }) {
  const { projects } = useMaro();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const recentProjects = React.useMemo(
    () =>
      projects
        .filter((p) => !workspaceId || p.workspaceId === workspaceId)
        .slice(0, 4),
    [projects, workspaceId]
  );

  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const previousProjectCount = React.useRef(recentProjects.length);
  const previewProject =
    recentProjects.find((p) => p.id === previewId) ?? recentProjects[0] ?? null;
  const previewHtml = previewProject ? projectPreviewHtml(previewProject) : null;

  React.useEffect(() => {
    if (!previewId && recentProjects[0]) setPreviewId(recentProjects[0].id);
  }, [previewId, recentProjects]);

  React.useEffect(() => {
    if (recentProjects.length > previousProjectCount.current) {
      setPreviewId(recentProjects[0]?.id ?? null);
      setPreviewOpen(true);
    }
    previousProjectCount.current = recentProjects.length;
  }, [recentProjects]);

  const headerSlot = (
    <>
      <ModuleHero
        toolId="website"
        title="Prej idesë, direkt në website."
        subtitle="Përshkruaje çka të duhet. Maro e ndërton strukturën, dizajnin dhe kodin për ty."
      />
      {recentProjects.length > 0 && (
        <section className="mx-auto mt-4 w-full max-w-[var(--module-content-max)] px-4 sm:px-0">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-3">
            Website-et e fundit
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPreviewId(p.id);
                  setPreviewOpen(true);
                }}
                className="rounded-maro16 bg-surface p-4 text-left transition-colors hover:bg-surface-2"
              >
                {p.thumbnailUrl && <StableImage src={p.thumbnailUrl} alt="" className="mb-3 aspect-video w-full rounded-maro12 object-cover object-top" />}
                <div className="truncate text-[14px] font-semibold text-ink">
                  {p.businessName || p.name}
                </div>
                <div className="mt-1 truncate text-[12px] text-ink-3">
                  {p.status === "ready" ? "Gati" : p.status}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/projects/${p.id}/editor`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-white"
                  >
                    <Pencil className="h-3 w-3" /> Editor
                  </Link>
                  <Link
                    href={`/projects/${p.id}/preview`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-maro8 bg-surface-2 px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface-hover"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </Link>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1">
        <ToolComposer toolId={toolId} layout="conversation" headerSlot={headerSlot} />
      </div>

      {previewOpen && (
      <aside className="mx-4 mb-4 flex min-h-[320px] flex-col overflow-hidden rounded-maro20 bg-surface lg:mb-4 lg:ml-0 lg:mr-4 lg:mt-4 lg:min-h-0 lg:w-[min(440px,38%)]">
        <div className="flex min-h-14 items-center justify-between gap-2 px-4 py-3">
          <span className="text-[13px] font-semibold text-ink">Preview live</span>
          <div className="flex items-center gap-1">
            {previewProject && (
            <button
              type="button"
              onClick={() => setPreviewId(previewProject.id)}
              className="inline-flex h-10 items-center gap-1 rounded-maro12 px-3 text-[12px] font-semibold text-brand hover:bg-surface-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rifresko
            </button>
            )}
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-maro12 text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Mbyll preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 bg-surface-2 p-3">
          {previewHtml ? (
            <AiHtmlPreviewFrame
              title="Preview website"
              html={previewHtml}
              className="h-full min-h-[240px] w-full rounded-maro12 bg-surface"
            />
          ) : (
            <div className="grid h-full min-h-[240px] place-items-center px-6 text-center text-[13px] text-ink-3">
              {previewProject
                ? "Ky projekt nuk ka HTML ende. Gjenero ose hap editorin."
                : "Gjenero një website ose zgjidh një projekt nga lista."}
            </div>
          )}
        </div>
      </aside>
      )}
    </div>
  );
}
