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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {LOGO_TYPES.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value as LogoTypeValue)}
            className="flex flex-col gap-[10px] text-left"
          >
            <span className={cn("marologo-card relative grid aspect-[3/2] w-full place-items-center transition-colors hover:bg-surface-hover", active && "ring-2 ring-brand")}>
              <span className="marologo-checkbox absolute left-[12px] top-[12px]" data-checked={active || undefined}>
                {active && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              <LogoTypePreview type={opt.value as LogoTypeValue} />
            </span>
            <span className={cn("text-center text-[14px] font-semibold", active ? "text-ink" : "text-[var(--maro-gray-300)]")}>
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
      className="marologo-card flex min-h-[52px] w-full items-center gap-[20px] px-[20px] py-[14px] text-left"
    >
      <span className="marologo-checkbox" data-checked={checked || undefined}>
        {checked && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
      <span className="text-[14px] font-medium text-ink">{label}</span>
    </button>
  );
}
