"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { FortInfoHint } from "./FortInfoHint";

export function BriefStrength({
  score,
  suggestion,
}: {
  score: number;
  suggestion?: string;
}) {
  const tone = score >= 80 ? "bg-brand" : score >= 40 ? "bg-ink-3" : "bg-line-strong";
  const hint =
    suggestion ||
    "Mat sa detaje ke plotësuar në brief — më shumë kontekst zakonisht jep rezultat më të mirë.";
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="flex items-center gap-1.5 font-semibold text-ink-2">
          Forca e brief-it
          <FortInfoHint text={hint} />
        </span>
        <span className="font-bold text-ink">{score}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.span
          className={cn("block h-full rounded-full", tone)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
