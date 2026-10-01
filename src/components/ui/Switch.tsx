"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const SIZES = {
  sm: {
    track: "h-5 w-9",
    knob: "h-4 w-4",
    pad: "p-0.5",
    on: "translate-x-4",
  },
  md: {
    track: "h-6 w-11",
    knob: "h-5 w-5",
    pad: "p-0.5",
    on: "translate-x-5",
  },
} as const;

/**
 * Theme-aware toggle with fixed knob anchoring (left + translate).
 * OFF: muted track + white knob · ON: brand track. Flat, without elevation.
 */
export function Switch({
  checked,
  onChange,
  size = "md",
  disabled,
  "aria-label": ariaLabel,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  "aria-label"?: string;
  label?: string;
}) {
  const s = SIZES[size];

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-out",
        "focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "active:scale-[0.98]",
        s.track,
        s.pad,
        checked ? "bg-brand" : "bg-[var(--switch-track)]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none relative block rounded-full",
          "transition-transform duration-200 ease-out",
          s.knob,
          checked ? s.on : "translate-x-0",
          checked ? "bg-[var(--brand-fg)]" : "bg-[var(--switch-knob,#ffffff)]"
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5">
      {control}
      <span className="text-[13px] font-medium text-ink">{label}</span>
    </label>
  );
}
