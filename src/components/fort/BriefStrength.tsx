"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

// Brief Strength meter — shows how complete/meaningful the expert brief is.
export function BriefStrength({
  score,
  suggestion,
}: {
  score: number;
  suggestion?: string;
}) {
  const tone = score >= 80 ? "bg-brand" : score >= 40 ? "bg-c-teal" : "bg-c-red";
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-ink-2">Forca e brief-it</span>
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
      {suggestion && <p className="mt-1.5 text-[12px] text-ink-3">{suggestion}</p>}
    </div>
  );
}
