"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export { Switch } from "./Switch";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
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
        "flex flex-col items-center justify-center rounded-maro20 bg-surface p-[30px] text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-[20px] grid h-14 w-14 place-items-center rounded-maro16 bg-surface-2 text-ink [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-bold tracking-tight text-ink">{title}</h3>
      {description && (
        <p className="mt-[10px] max-w-sm text-[13.5px] leading-relaxed text-ink-2">
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
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-ink-inv opacity-0 transition-opacity group-hover/tt:opacity-100",
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
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        {label && <div className="text-[11px] font-medium text-ink-3">{label}</div>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[13px] font-medium uppercase text-ink outline-none"
        />
      </div>
    </div>
  );
}
