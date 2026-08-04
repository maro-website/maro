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
 * OFF: muted track + white knob · ON: brand track + contrasting knob + soft glow.
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
        "group relative inline-flex shrink-0 items-center rounded-full transition-all duration-300 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "active:scale-[0.96]",
        s.track,
        s.pad,
        checked
          ? "bg-brand shadow-[inset_0_1px_2px_rgba(0,0,0,0.14),0_0_0_1px_rgba(255,255,255,0.06)]"
          : "bg-[var(--switch-track)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.18)]"
      )}
    >
      {/* subtle ON glow */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300",
          checked ? "opacity-100" : "opacity-0",
          "bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.22),transparent_70%)]"
        )}
      />

      <span
        aria-hidden
        className={cn(
          "pointer-events-none relative block rounded-full",
          "transition-transform duration-300 ease-[cubic-bezier(0.34,1.45,0.64,1)]",
          "shadow-[0_1px_2px_rgba(0,0,0,0.28),0_3px_10px_rgba(0,0,0,0.14)]",
          "ring-1 ring-black/5",
          s.knob,
          checked ? s.on : "translate-x-0",
          checked ? "bg-[var(--brand-fg)]" : "bg-white"
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
