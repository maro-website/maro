"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PRESENTATION_MODES } from "@/lib/marologo/constants";
import type { PresentationMode } from "@/lib/marologo/types";

function Preview({ mode }: { mode: PresentationMode }) {
  if (mode === "bw") return <div className="grid h-full grid-cols-2 overflow-hidden rounded-xl"><span className="grid place-items-center bg-black text-[20px] font-black text-white">M</span><span className="grid place-items-center bg-white text-[20px] font-black text-black">M</span></div>;
  if (mode === "color") return <div className="grid h-full place-items-center rounded-xl bg-[#253FDA]"><span className="rounded-full bg-white px-4 py-2 text-[16px] font-black text-[#253FDA]">maro</span></div>;
  if (mode === "mockup") return <div className="grid h-full place-items-center rounded-xl bg-[#DDD8CE] p-4"><span className="grid h-[76%] w-[64%] rotate-[-4deg] place-items-center rounded-sm bg-[#F7F1E6] text-[14px] font-black text-black shadow-lg">maro</span></div>;
  return <div className="grid h-full grid-cols-3 grid-rows-2 gap-1 rounded-xl bg-[#E7E8EC] p-1"><span className="col-span-2 grid place-items-center rounded-lg bg-white text-[16px] font-black text-black">maro</span><span className="row-span-2 grid place-items-center rounded-lg bg-[#253FDA] text-[18px] font-black text-white">M</span><span className="grid place-items-center rounded-lg bg-black text-[12px] font-bold text-white">m</span><span className="rounded-lg bg-[#FFCC4D]" /></div>;
}

export function PresentationModeCards({ value, onChange }: { value: PresentationMode; onChange: (mode: PresentationMode) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PRESENTATION_MODES.map((item) => {
        const active = value === item.value;
        return (
          <button key={item.value} type="button" aria-pressed={active} onClick={() => onChange(item.value as PresentationMode)} className={cn("marologo-card relative overflow-hidden p-3 text-left transition-all", active ? "ring-2 ring-brand" : "hover:-translate-y-0.5 hover:bg-surface-hover")}>
            <span className="marologo-checkbox absolute right-5 top-5 z-10" data-checked={active || undefined}>{active && <Check className="h-4 w-4" strokeWidth={3} />}</span>
            {"recommended" in item && item.recommended && <span className="absolute left-5 top-5 z-10 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-fg">Rekomanduar</span>}
            <div className="h-[132px]"><Preview mode={item.value as PresentationMode} /></div>
            <div className="px-2 pb-2 pt-4">
              <span className="block text-[15px] font-semibold text-ink">{item.label}</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-ink-3">{item.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
