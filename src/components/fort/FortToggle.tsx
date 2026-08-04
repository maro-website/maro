"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function FortToggle({
  enabled,
  locked,
  label = "maroFort",
  badgeText = "Premium",
  onToggle,
  onUpgrade,
}: {
  enabled: boolean;
  locked: boolean;
  label?: string;
  badgeText?: string;
  onToggle: (next: boolean) => void;
  onUpgrade: () => void;
}) {
  const active = enabled && !locked;
  return (
    <button
      type="button"
      onClick={() => (locked ? onUpgrade() : onToggle(!enabled))}
      title={locked ? "Aktivizo maroFort (Premium)" : "maroFort mode"}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all",
        active ? "bg-brand text-brand-fg" : "bg-surface-2 text-ink-2 hover:text-ink"
      )}
    >
      <span className="relative grid h-4 w-4 place-items-center">
        {active ? (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="grid h-4 w-4 place-items-center"
          >
            <Sparkles className="h-4 w-4" />
          </motion.span>
        ) : locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </span>
      <span>{label}</span>
      {locked && (
        <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-inv">
          {badgeText}
        </span>
      )}
      {!locked && (
        <span
          className={cn(
            "relative ml-0.5 inline-flex h-4 w-7 items-center rounded-full transition-colors",
            active ? "bg-brand-fg/25" : "bg-line-strong"
          )}
        >
          <motion.span
            layout
            className="absolute h-3 w-3 rounded-full"
            style={{ left: active ? "14px" : "2px", background: active ? "var(--brand-fg)" : "var(--switch-off)" }}
          />
        </span>
      )}
    </button>
  );
}
