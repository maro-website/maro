"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function PanelSection({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line px-4 py-4 last:border-b-0">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function PanelLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{children}</div>;
}

export function SegRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-all",
            value === o.value ? "bg-surface text-ink shadow-subtle" : "text-ink-3 hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
