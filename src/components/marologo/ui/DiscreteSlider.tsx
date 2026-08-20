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
    <div className={cn("marologo-card flex min-h-[72px] items-center gap-[20px] px-[20px] py-[10px]", className)}>
      <span className="shrink-0 text-[14px] font-semibold text-ink">{left}</span>
      <div className="relative flex min-w-[140px] flex-1 items-center justify-between">
        <div className="pointer-events-none absolute inset-x-[15px] top-1/2 h-0.5 -translate-y-1/2 bg-line-strong" />
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
                "relative z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface transition-colors",
                active && "text-brand"
              )}
            >
              <span
                className={cn(
                  "block rounded-full",
                  active ? "h-5 w-5 bg-brand" : "h-3.5 w-3.5 bg-[var(--maro-gray-300)]"
                )}
              />
            </button>
          );
        })}
      </div>
      <span className="shrink-0 text-[14px] font-semibold text-ink">{right}</span>
    </div>
  );
}
