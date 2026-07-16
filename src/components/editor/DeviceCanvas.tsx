"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { WebsitePreview } from "@/components/website-previews/WebsitePreview";
import { cn } from "@/lib/utils/cn";

const WIDTHS: Record<string, number | "100%"> = {
  desktop: "100%",
  tablet: 834,
  mobile: 390,
};

export function DeviceCanvas() {
  const { project, device, selection, setSelection } = useEditor();
  const width = WIDTHS[device];

  return (
    <div className="scroll-thin h-full overflow-auto bg-surface-2 p-5">
      <div
        className="mx-auto transition-all duration-300 ease-out"
        style={{
          maxWidth: width === "100%" ? 1440 : width,
          width: "100%",
        }}
      >
        <div
          className={cn(
            "maro-edit-mode overflow-hidden rounded-xl border border-line bg-white shadow-card"
          )}
        >
          <WebsitePreview
            project={project}
            editMode
            selected={selection}
            onSelect={setSelection}
          />
        </div>
      </div>
    </div>
  );
}
