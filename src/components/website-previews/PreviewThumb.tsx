"use client";

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
  height?: number;
  className?: string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const scale = width ? width / DESIGN_WIDTH : 0;

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden bg-white", className)}
      style={{ height }}
    >
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
    </div>
  );
}
