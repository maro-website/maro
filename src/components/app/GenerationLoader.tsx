"use client";

import { MaroBuildingLoader } from "./MaroBuildingLoader";
import LatticeLoader, { type LatticeStatus } from "./LatticeLoader";
import { cn } from "@/lib/utils/cn";

export function GenerationLoader({ variant = "image", title = "maro pe maron", status = "working", startedAt, elapsed, className }: {
  variant?: "image" | "website";
  title?: string;
  className?: string;
  status?: LatticeStatus;
  startedAt?: string | number;
  elapsed?: number;
}) {
  const working = status === "working";
  return <div className={cn("maro-generation-loader flex w-full items-center text-ink-2", working ? "flex-col justify-center gap-5 overflow-hidden rounded-3xl bg-surface-2" : "justify-start py-2", working && (variant === "website" ? "aspect-video" : "aspect-square p-4 sm:p-6"), className)}>
    {variant === "website" ? <><MaroBuildingLoader size={56} /><p className="animate-pulse text-[14px] font-semibold">{title}</p></> : <LatticeLoader
      status={status} label={title} doneLabel="maro e maroi" errorLabel="maro s'e maroi"
      pattern="orbit" grid={4} shape="maro" doneColor="#00ff77" errorColor="#ef4444"
      className={working ? "lattice-loader--stacked" : undefined}
      cellSize={working ? 7 : 4} gap={working ? 5 : 3} fontSize={working ? 18 : 14}
      step={40} idleOpacity={0.15} glow={false} glowColor="" showTimer startedAt={startedAt} elapsed={elapsed}
    />}
  </div>;
}
