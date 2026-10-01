"use client";

import { MARO_FORT_ENABLED } from "@/lib/shadow/maroFort";
import { StableImage } from "@/components/app/StableImage";

import * as React from "react";
import { Switch, SwitchTrack } from "@/components/ui/Switch";
import { MaroIcon } from "@/components/app/OptionIcon";
import { BrainCircuit, Flame, Lock, X } from "lucide-react";

export function BrainPill({ active, onToggle }: { active: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={active} aria-label="maroBrain" onClick={() => onToggle(!active)} className="fort-pill maro-switch" title="Përdor kontekstin e maroBrain">
      <BrainCircuit className="h-3.5 w-3.5" />
      <span>maroBrain</span>
      <SwitchTrack checked={active} />
    </button>
  );
}

export function FortPill({
  active,
  locked,
  label = "maroFort",
  badgeText = "Premium",
  onToggle,
  onOpen,
  onUpgrade,
}: {
  active: boolean;
  locked: boolean;
  label?: string;
  badgeText?: string;
  onToggle: (next: boolean) => void;
  onOpen: () => void;
  onUpgrade: () => void;
}) {
  if (!MARO_FORT_ENABLED) return null;
  if (locked) {
    return (
      <button
        type="button"
        onClick={onUpgrade}
        className="fort-pill opacity-90"
        title="Aktivizo maroFort (Premium)"
      >
        <Lock className="h-3.5 w-3.5" />
        <span>{label}</span>
        <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-inv">
          {badgeText}
        </span>
      </button>
    );
  }

  return (
    <div className="fort-pill">
      <button type="button" onClick={onOpen} className="inline-flex items-center gap-2" title="Cilësimet maroFort">
        <Flame className="h-3.5 w-3.5" /><span>{label}</span>
      </button>
      <Switch size="sm" checked={active} aria-label={label} onChange={(next) => next ? onOpen() : onToggle(false)} />
    </div>
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
