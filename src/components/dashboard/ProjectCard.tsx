"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { PreviewThumb } from "@/components/website-previews/PreviewThumb";
import { StatusBadge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Spinner } from "@/components/ui/Misc";
import { timeAgo } from "@/lib/utils/format";
import { MoreHorizontal, Copy, Pencil, Trash2, ExternalLink, Globe } from "lucide-react";

export function ProjectCard({
  project,
  onRename,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const generating = project.status === "generating";

  const open = () => {
    if (generating) router.push(`/projects/${project.id}/generating`);
    else router.push(`/projects/${project.id}`);
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-surface transition-all hover:-translate-y-0.5 hover:shadow-card">
      <button onClick={open} className="relative block w-full">
        <div className="relative h-[188px] overflow-hidden border-b border-line bg-surface-2">
          {generating ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-2">
              <Spinner className="h-5 w-5" />
              <span className="text-[13px] font-medium text-ink-2">Duke ndërtuar website...</span>
            </div>
          ) : (
            <PreviewThumb project={project} height={188} />
          )}
          <div className="absolute left-3 top-3">
            <StatusBadge status={project.status} />
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 px-4 py-3.5">
        <button onClick={open} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[15px] font-bold tracking-tight text-ink">{project.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
            {project.status === "published" ? (
              <>
                <Globe className="h-3.5 w-3.5 text-success" />
                <span className="truncate">{project.publishedUrl}</span>
              </>
            ) : project.status === "generating" ? (
              <span>Duke ndërtuar website...</span>
            ) : (
              <span>Redaktuar {timeAgo(project.updatedAt)}</span>
            )}
          </div>
        </button>
        <Dropdown
          trigger={
            <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
              <MoreHorizontal className="h-4.5 w-4.5" />
            </button>
          }
          items={[
            { label: "Hap", icon: <ExternalLink />, onClick: open },
            { label: "Riemërto", icon: <Pencil />, onClick: onRename },
            { label: "Dyfisho", icon: <Copy />, onClick: onDuplicate },
            { divider: true, label: "" },
            { label: "Fshij", icon: <Trash2 />, danger: true, onClick: onDelete },
          ]}
        />
      </div>
    </div>
  );
}
