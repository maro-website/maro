"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MaroShapesLoader } from "@/components/app/MaroShapesLoader";

// Text-free generation animation: the maro symbol animated with the brand shapes.
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
    </motion.div>
  );
}
