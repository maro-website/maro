import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { ProjectStatus } from "@/lib/types";

const STATUS_MAP: Record<
  ProjectStatus,
  { label: string; dot: string; className: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-ink-3",
    className: "bg-surface-2 text-ink-2",
  },
  generating: {
    label: "Duke gjeneruar",
    dot: "bg-warning animate-pulse-soft",
    className: "bg-surface-2 text-warning",
  },
  ready: {
    label: "Gati",
    dot: "bg-ink",
    className: "bg-surface-2 text-ink",
  },
  published: {
    label: "Publikuar",
    dot: "bg-success",
    className: "bg-surface-2 text-success",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const s = STATUS_MAP[status];
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-[10px] rounded-maro12 px-[10px] py-1 text-[11.5px] font-semibold",
        s.className,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function Badge({
  children,
  className,
  tone = "neutral",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "success";
  style?: React.CSSProperties;
}) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    brand: "bg-brand text-brand-fg",
    success: "bg-surface-2 text-success",
  };
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-[10px] rounded-maro12 px-[10px] py-1 text-[11px] font-semibold",
        tones[tone],
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
