"use client";

import { MaroBuildingLoader } from "./MaroBuildingLoader";
import { cn } from "@/lib/utils/cn";

export function GenerationLoader({ variant = "image", title = "maro po maron", className }: {
  variant?: "image" | "website";
  title?: string;
  className?: string;
}) {
  return <div className={cn("maro-generation-loader flex w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-surface-2", variant === "website" ? "aspect-video" : "aspect-square", className)}>
    <MaroBuildingLoader size={56} />
    <p className="animate-pulse text-[14px] font-semibold text-ink-2">{title}</p>
  </div>;
}
