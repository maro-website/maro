"use client";

import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";
import { TYPOGRAPHY_OPTIONS } from "@/lib/marologo/constants";
import { PREVIEW_FONT_CLASS } from "@/lib/marologo/previewFonts";

export function TypographyGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {TYPOGRAPHY_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const fontClass = PREVIEW_FONT_CLASS[opt.previewFont] ?? "";
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative marologo-card flex min-h-[100px] flex-col items-center justify-center gap-2 p-3 transition-all",
              active ? "ring-2 ring-brand" : "hover:bg-surface-2"
            )}
          >
            <span
              className={cn(
                "absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-md border",
                active ? "border-brand bg-brand text-brand-fg" : "border-line-strong bg-surface"
              )}
            >
              {active && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={cn("text-[22px] font-semibold text-ink", fontClass)}>maro</span>
            <span className={cn("text-center text-[11px] font-medium", active ? "text-ink" : "text-ink-3")}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SymbolDirectionPills({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = ["Literal", "Abstract", "Geometric", "Typographic", "Mascot", "Monogram", "No preference"];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt)}
            className={cn(
              "min-h-[44px] rounded-2xl px-4 py-2 text-[13px] font-medium transition-colors",
              active ? "bg-brand text-brand-fg" : "marologo-card text-ink hover:bg-surface-2"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
