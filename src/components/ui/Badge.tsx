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
    className: "bg-surface-2 text-ink-2 border-line-strong",
  },
  generating: {
    label: "Duke gjeneruar",
    dot: "bg-warning animate-pulse-soft",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  ready: {
    label: "Gati",
    dot: "bg-brand",
    className: "bg-brand-soft text-brand border-brand/15",
  },
  published: {
    label: "Publikuar",
    dot: "bg-success",
    className: "bg-success/10 text-success border-success/20",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold",
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
    neutral: "bg-surface-2 text-ink-2 border-line-strong",
    brand: "bg-brand-soft text-brand border-brand/15",
    success: "bg-success/10 text-success border-success/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
