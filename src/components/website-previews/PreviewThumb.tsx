"use client";

import { StableImage } from "@/components/app/StableImage";
import { PreviewFallback, previewSource } from "@/components/app/PreviewFallback";

import * as React from "react";
import type { Project } from "@/lib/types";
import { WebsitePreview } from "./WebsitePreview";
import { useElementWidth } from "@/hooks/useElementWidth";
import { cn } from "@/lib/utils/cn";

const DESIGN_WIDTH = 1280;

// Non-interactive, scaled-down render of a real website preview. Used in cards,
// hero mockups and overview pages so every thumbnail is truly the site itself.
export function PreviewThumb({
  project,
  height = 240,
  className,
}: {
  project: Project;
  height?: number | string;
  className?: string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const scale = width ? width / DESIGN_WIDTH : 0;
  const thumbnail = previewSource(project.thumbnailUrl);
  const htmlPage = project.htmlPages?.find((page) => page.id === project.activeHtmlPageId) ?? project.htmlPages?.[0];
  const hasPreview = project.renderMode === "html" && htmlPage
    ? Boolean(htmlPage.html?.trim())
    : Boolean(project.theme && project.pages?.length);

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden bg-white", className)}
      style={{ height }}
    >
      {thumbnail ? (
        <StableImage
          src={thumbnail}
          module="web"
          refreshKey={project.thumbnailStorageRef ?? project.id}
          alt={`Preview i ${project.name}`}
          className="h-full w-full object-cover object-top"
        />
      ) : !hasPreview ? (
        <PreviewFallback module="web" state={project.status === "generating" ? "loading" : "empty"} />
      ) : (
        <div
          style={{
            width: DESIGN_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <WebsitePreview project={project} />
        </div>
      )}
      {!thumbnail && hasPreview && !width && <PreviewFallback state="loading" className="absolute inset-0" />}
    </div>
  );
}
