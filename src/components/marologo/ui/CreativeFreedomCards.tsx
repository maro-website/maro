"use client";

import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";
import { CREATIVE_FREEDOM_OPTIONS } from "@/lib/marologo/constants";
import type { CreativeFreedom } from "@/lib/marologo/types";

export function CreativeFreedomCards({
  value,
  onChange,
}: {
  value: CreativeFreedom;
  onChange: (v: CreativeFreedom) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-3">
      {CREATIVE_FREEDOM_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "marologo-card flex min-h-[120px] flex-col items-start gap-[10px] p-[20px] text-left transition-colors",
              active ? "bg-surface" : "hover:bg-surface-hover"
            )}
          >
            <span className="marologo-checkbox" data-checked={active || undefined}>
              {active && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span className="text-[15px] font-semibold text-ink">{opt.label}</span>
            <span className="text-[13px] text-ink-2">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
