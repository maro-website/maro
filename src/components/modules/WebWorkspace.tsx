"use client";

import * as React from "react";
import Link from "next/link";
import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { InspirationCarousel } from "@/components/modules/InspirationCarousel";
import { WEB_INSPIRATION } from "@/lib/modules/web/inspiration";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import type { Project } from "@/lib/types";
import { AiHtmlPreviewFrame } from "@/components/website-previews/AiHtmlPreviewFrame";
import { Eye, Pencil, RefreshCw } from "lucide-react";

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
  const previewProject =
    recentProjects.find((p) => p.id === previewId) ?? recentProjects[0] ?? null;
  const previewHtml = previewProject ? projectPreviewHtml(previewProject) : null;

  React.useEffect(() => {
    if (!previewId && recentProjects[0]) setPreviewId(recentProjects[0].id);
  }, [previewId, recentProjects]);

  const headerSlot = (
    <>
      <ModuleHero
        toolId="website"
        title="Prej idesë, direkt në website."
        subtitle="Përshkruaje çka të duhet. Maro e ndërton strukturën, dizajnin dhe kodin për ty."
      />
      <InspirationCarousel items={WEB_INSPIRATION} />

      {recentProjects.length > 0 && (
        <section className="mx-auto mt-6 w-full max-w-[var(--module-content-max)] px-4 sm:px-0">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-3">
            Website-et e fundit
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreviewId(p.id)}
                className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-2"
              >
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
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink"
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

      <aside className="flex min-h-[280px] flex-col border-t border-line bg-canvas lg:min-h-0 lg:w-[min(440px,38%)] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <span className="text-[13px] font-semibold text-ink">Preview live</span>
          {previewProject && (
            <button
              type="button"
              onClick={() => setPreviewId(previewProject.id)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rifresko
            </button>
          )}
        </div>
        <div className="relative min-h-0 flex-1 bg-surface-2 p-3">
          {previewHtml ? (
            <AiHtmlPreviewFrame
              title="Preview website"
              html={previewHtml}
              className="h-full min-h-[240px] w-full rounded-xl border border-line bg-white"
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
    </div>
  );
}
