"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MaroIcon } from "@/components/app/OptionIcon";
import { cn } from "@/lib/utils/cn";
import { BrainCircuit, Flame, Lock, X } from "lucide-react";

export function BrainPill({ active, onToggle }: { active: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button type="button" onClick={() => onToggle(!active)} className="fort-pill" title="Përdor kontekstin e maroBrain">
      <BrainCircuit className="h-3.5 w-3.5" />
      <span>maroBrain</span>
      <span role="switch" aria-checked={active} className={cn("relative ml-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors", active ? "bg-white/25" : "bg-black/15")}>
        <motion.span layout transition={{ type: "spring", stiffness: 520, damping: 32 }} className={cn("block h-3 w-3 rounded-full bg-white", active ? "translate-x-3" : "translate-x-0")} />
      </span>
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
    <button
      type="button"
      onClick={() => (active ? onOpen() : onToggle(true))}
      className="fort-pill"
      title="maroFort mode"
    >
      <Flame className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span
        role="switch"
        aria-checked={active}
        onClick={(e) => {
          e.stopPropagation();
          if (active) {
            onToggle(false);
          } else {
            onOpen();
          }
        }}
        className={cn(
          "relative ml-0.5 inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors",
          active ? "bg-white/25" : "bg-black/15"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 520, damping: 32 }}
          className={cn(
            "block h-3 w-3 rounded-full bg-white",
            active ? "translate-x-3" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}

export function PresetPill({
  code,
  thumbnailUrl,
  onRemove,
}: {
  code: string;
  thumbnailUrl?: string | null;
  onRemove: () => void;
}) {
  return (
    <>
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="h-[34px] w-[34px] shrink-0 rounded-lg object-cover"
        />
      )}
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
