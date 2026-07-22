"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Compass } from "lucide-react";

// Explore is temporarily turned off while we reshape it into something new.
export default function ExplorePage() {
  return (
    <AppShell>
      <div className="grid h-full place-items-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-w-md flex-col items-center rounded-3xl border border-line bg-surface px-8 py-16 text-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Compass className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
            Explore po ripërtërihet
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Po e rikthejmë me diçka të re së shpejti. Ndërkohë, vazhdo të marosh.
          </p>
        </motion.div>
      </div>
    </AppShell>
  );
}
