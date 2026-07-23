"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// A single, theme-safe toggle switch used everywhere. The knob uses
// `--brand-fg` when ON so it always contrasts with the brand track (fixes the
// white-knob-on-white-track problem in the full-dark theme).
export function Switch({
  checked,
  onChange,
  size = "md",
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const d =
    size === "sm"
      ? { track: "h-5 w-9", knob: "h-4 w-4", on: "translate-x-4", off: "translate-x-0.5" }
      : { track: "h-6 w-11", knob: "h-5 w-5", on: "translate-x-[22px]", off: "translate-x-0.5" };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative shrink-0 rounded-full transition-colors disabled:opacity-50",
        d.track,
        checked ? "bg-brand" : "bg-line-strong"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 rounded-full shadow-sm transition-transform",
          d.knob,
          checked ? d.on : d.off
        )}
        style={{ background: checked ? "var(--brand-fg)" : "#ffffff" }}
      />
    </button>
  );
}
