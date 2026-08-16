"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";
import { LOGO_TYPES } from "@/lib/marologo/constants";
import type { LogoTypeValue } from "@/lib/marologo/types";
import { MaroSymbol } from "@/components/ui/Logo";

export function LogoTypeCards({
  value,
  onChange,
}: {
  value: LogoTypeValue;
  onChange: (v: LogoTypeValue) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {LOGO_TYPES.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value as LogoTypeValue)}
            className={cn(
              "marologo-card flex min-h-[120px] flex-col items-center justify-center gap-3 p-4 transition-all",
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
            <LogoTypePreview type={opt.value as LogoTypeValue} />
            <span className={cn("text-[13px] font-medium", active ? "text-ink" : "text-ink-3")}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LogoTypePreview({ type }: { type: LogoTypeValue }) {
  if (type === "wordmark") {
    return <span className="text-[22px] font-bold tracking-brand text-ink">maro</span>;
  }
  if (type === "symbol") {
    return <MaroSymbol className="h-10 w-10 text-brand" />;
  }
  if (type === "symbol_wordmark") {
    return (
      <div className="flex items-center gap-2">
        <MaroSymbol className="h-8 w-8 text-brand" />
        <span className="text-[18px] font-bold tracking-brand text-ink">maro</span>
      </div>
    );
  }
  return <span className="text-[13px] text-ink-2">maro vendos</span>;
}

export function MaroDecidesCheckbox({
  checked,
  onChange,
  label = "Leja maro le t'vendos",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="marologo-card flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left"
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          checked ? "border-brand bg-brand text-brand-fg" : "border-line-strong"
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="text-[14px] font-medium text-ink">{label}</span>
    </button>
  );
}
