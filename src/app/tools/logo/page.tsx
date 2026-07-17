"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ImageComposer } from "@/components/app/ImageComposer";
import { getTool } from "@/lib/tools/registry";
import { Sparkles } from "lucide-react";

const tool = getTool("logo")!;

const EXAMPLES = [
  "Logo minimaliste për një brand kafeje, simbol filxhani",
  "Monogram elegant për një studio arkitekture",
  "Logo lozonjare për një aplikacion fitnesi",
  "Simbol modern për një startup teknologjik",
];

export default function LogoToolPage() {
  return (
    <AppShell>
      <div className="relative flex flex-1 flex-col px-5 py-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-aurora opacity-40" />
        <div className="mx-auto w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 text-center"
          >
            <Badge
              className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 text-[12px]"
              style={{ color: tool.accent, background: tool.accentSoft }}
            >
              <Sparkles className="h-3.5 w-3.5" /> {tool.name}
            </Badge>
            <h1 className="text-balance text-[clamp(28px,4.5vw,46px)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink">
              Logo unike me AI
            </h1>
            <p className="mx-auto mt-3 max-w-md text-balance text-[15.5px] leading-relaxed text-ink-2">
              Përshkruaj markën dhe stilin — Maro Logo gjeneron koncepte sipas stilit të Logo GPT tënde.
            </p>
          </motion.div>

          <ImageComposer toolId="logo" examples={EXAMPLES} />
        </div>
      </div>
    </AppShell>
  );
}
