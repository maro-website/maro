"use client";

import { StableImage } from "@/components/app/StableImage";

import * as React from "react";
import { SwitchTrack } from "@/components/ui/Switch";
import { MaroIcon } from "@/components/app/OptionIcon";
import { BrainCircuit, X } from "lucide-react";

export function BrainPill({ active, onToggle }: { active: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={active} aria-label="maroBrain" onClick={() => onToggle(!active)} className="fort-pill maro-switch" title="Përdor kontekstin e maroBrain">
      <BrainCircuit className="h-3.5 w-3.5" />
      <span>maroBrain</span>
      <SwitchTrack checked={active} />
    </button>
  );
}

export function PresetPill({
  code,
  thumbnailUrl,
  module,
  onRemove,
}: {
  code: string;
  thumbnailUrl?: string | null;
  module?: string;
  onRemove: () => void;
}) {
  return (
    <>
      <StableImage src={thumbnailUrl} module={module} alt="" className="h-[34px] w-[34px] shrink-0 rounded-lg object-cover" />
      <span className="preset-pill">
        <MaroIcon name="prompts" className="h-3.5 w-3.5" />
        <span>maroPreset</span>
        <span className="font-mono text-[12px] font-semibold opacity-90">{code}</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-white/20"
          aria-label="Hiq presetin"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    </>
  );
}
