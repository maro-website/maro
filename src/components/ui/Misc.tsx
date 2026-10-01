"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export { Switch } from "./Switch";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-lg", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      role="status"
      aria-label="Duke ngarkuar"
      className={cn("animate-spin text-ink", className)}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-maro16 bg-surface p-6 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-[20px] grid h-14 w-14 place-items-center rounded-maro16 bg-surface-2 text-ink [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </div>
      )}
      <h3 className="maro-text-h4 text-ink">{title}</h3>
      {description && (
        <p className="maro-text-body mt-2 max-w-sm text-ink-2">
          {description}
        </p>
      )}
      {action && <div className="mt-[20px]">{action}</div>}
    </div>
  );
}

export function Tooltip({
  content,
  children,
  side = "bottom",
}: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const tooltipId = React.useId();
  const trigger = React.isValidElement<{ "aria-describedby"?: string }>(children)
    ? React.cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" ") }) : children;
  return (
    <span className="group/tt relative inline-flex">
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-[var(--maro-z-tooltip)] -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-3 py-2 text-xs font-medium text-ink-inv opacity-0 transition-opacity duration-fast group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "bottom" ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
        )}
      >
        {content}
      </span>
    </span>
  );
}

export function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="flex min-h-[52px] items-center gap-[10px] rounded-maro16 bg-surface px-[20px] py-[10px]">
      <label className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-lg">
        <span className="block h-full w-full" style={{ backgroundColor: value }} />
        <input
          aria-label={label ?? "Ngjyra"}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        {label && <div className="text-[11px] font-medium text-ink-3">{label}</div>}
        <input
          aria-label={label ? `${label} HEX` : "Ngjyra HEX"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-medium uppercase text-ink outline-none"
        />
      </div>
    </div>
  );
}
