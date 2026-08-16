"use client";

import { cn } from "@/lib/utils/cn";
import { clampSlider } from "@/lib/marologo/spectrum";
import type { SliderValue } from "@/lib/marologo/types";

export function DiscreteSlider({
  left,
  right,
  value,
  onChange,
  steps = 5,
  className,
}: {
  left: string;
  right: string;
  value: SliderValue;
  onChange: (v: SliderValue) => void;
  steps?: 2 | 5;
  className?: string;
}) {
  const positions = steps === 5 ? ([1, 2, 3, 4, 5] as SliderValue[]) : ([1, 5] as SliderValue[]);

  return (
    <div className={cn("marologo-card px-4 py-4", className)}>
      <div className="mb-3 flex items-center justify-between text-[14px] font-semibold text-ink">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="relative flex items-center justify-between px-1">
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-line-strong" />
        {positions.map((pos) => {
          const active = value === pos;
          return (
            <button
              key={pos}
              type="button"
              role="slider"
              aria-valuemin={1}
              aria-valuemax={steps === 5 ? 5 : 5}
              aria-valuenow={value}
              aria-label={`${left} to ${right}, position ${pos}`}
              onClick={() => onChange(clampSlider(pos))}
              className={cn(
                "relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                active ? "bg-brand" : "bg-surface hover:bg-surface-2"
              )}
            >
              <span
                className={cn(
                  "block rounded-full",
                  active ? "h-3 w-3 bg-brand-fg" : "h-2.5 w-2.5 border-2 border-line-strong bg-surface"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
