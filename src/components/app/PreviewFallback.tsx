"use client";

import * as React from "react";
import { AudioLines, File, ImageIcon, ImageOff, PanelsTopLeft, Shapes, Video } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Presentation only: never rewrite persisted media or generation inputs. */
export function previewSource(src?: string | null): string | undefined {
  if (!src?.trim()) return undefined;
  try {
    if (new URL(src, "https://maro.invalid").pathname === "/images/hub/marketing-stack.png") return undefined;
  } catch { /* Let the image element report malformed URLs as unavailable. */ }
  return src;
}

export function PreviewFallback({ state = "empty", module, className, label }: {
  state?: "loading" | "empty" | "error";
  module?: string;
  className?: string;
  label?: string;
}) {
  const Icon = state === "error" ? ImageOff
    : module === "logo" || module === "brand" ? Shapes
    : module === "web" || module === "website" ? PanelsTopLeft
    : module === "imazh" || module === "reklama" || module === "image" ? ImageIcon
    : module === "audio" || module === "zo" ? AudioLines
    : module === "filma" || module === "video" ? Video : File;
  return (
    <span
      className={cn("grid h-full w-full place-items-center rounded-[inherit] bg-surface text-ink-3", state === "loading" && "bg-surface-2 motion-safe:animate-pulse", className)}
      role={state === "loading" ? "status" : "img"}
      aria-busy={state === "loading" || undefined}
      aria-label={label ?? (state === "loading" ? "Duke ngarkuar preview" : state === "error" ? "Preview nuk është i disponueshëm" : "Pa preview")}
      data-preview-state={state}
    >
      {state !== "loading" && <Icon aria-hidden="true" size={22} strokeWidth={1.5} className="opacity-40" />}
    </span>
  );
}
