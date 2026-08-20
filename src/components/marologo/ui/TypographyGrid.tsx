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
    <div className="grid grid-cols-2 gap-[20px] sm:grid-cols-3">
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
              "relative marologo-card flex min-h-[120px] flex-col items-center justify-center gap-[10px] p-[20px] transition-colors",
              active ? "bg-surface" : "hover:bg-surface-hover"
            )}
          >
            <span className="marologo-checkbox absolute left-[20px] top-[20px]" data-checked={active || undefined}>
              {active && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span className={cn("text-[22px] font-semibold text-ink", fontClass)}>maro</span>
            <span className={cn("text-center text-[12px] font-medium", active ? "text-ink" : "text-[var(--maro-gray-300)]")}>
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
    <div className="flex flex-wrap gap-[10px]">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt)}
            className={cn(
              "min-h-[52px] rounded-maro16 px-[20px] py-[10px] text-[14px] font-medium transition-colors",
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
