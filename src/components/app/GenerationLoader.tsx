"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { WaitingSnake } from "@/components/app/WaitingSnake";
import { MaroShapesLoader } from "@/components/app/MaroShapesLoader";

// Text-free generation animation: the maro symbol animated with the brand
// shapes. Snake stays available on desktop as a fun way to pass the wait.
export function GenerationLoader({
  className,
}: {
  /** kept for call-site compatibility; the loader is now text-free */
  variant?: "image" | "website";
  title?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        "flex flex-col items-center overflow-hidden rounded-3xl border border-line bg-surface px-6 py-10 " +
        (className ?? "")
      }
    >
      <MaroShapesLoader />

      {/* Snake — desktop only, so it never loads/annoys on mobile. */}
      <div className="mt-6 hidden sm:block">
        <WaitingSnake />
      </div>
    </motion.div>
  );
}
