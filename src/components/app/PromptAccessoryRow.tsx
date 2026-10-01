"use client";

import { StableImage } from "@/components/app/StableImage";

import * as React from "react";
import { SwitchTrack } from "@/components/ui/Switch";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { X } from "lucide-react";
import { MARO_PRODUCTS } from "@/lib/design/maro-system";

export function BrainPill({ active, onToggle }: { active: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={active} aria-label="maroBrain" onClick={() => onToggle(!active)} className="fort-pill maro-switch" style={{ background: MARO_PRODUCTS.maroBrain.color, color: "var(--maro-color-text-on-accent)" }} title="Përdor kontekstin e maroBrain">
      <ToolIcon toolId="brain" className="h-3.5 w-3.5" />
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
      <span className="preset-pill" style={{ background: MARO_PRODUCTS.maroPresets.color, color: "var(--maro-color-text-on-accent)" }}>
        <MaroIcon name="prompts" className="h-3.5 w-3.5" />
        <span>maroPresets</span>
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
