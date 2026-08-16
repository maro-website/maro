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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CREATIVE_FREEDOM_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "marologo-card flex min-h-[100px] flex-col items-start gap-2 p-4 text-left transition-all",
              active ? "ring-2 ring-brand" : "hover:bg-surface-2"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border",
                active ? "border-brand bg-brand text-brand-fg" : "border-line-strong"
              )}
            >
              {active && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="text-[15px] font-semibold text-ink">{opt.label}</span>
            <span className="text-[13px] text-ink-2">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
