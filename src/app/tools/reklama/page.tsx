"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ImageComposer } from "@/components/app/ImageComposer";
import { getTool } from "@/lib/tools/registry";
import { Megaphone } from "lucide-react";

const tool = getTool("reklama")!;

const EXAMPLES = [
  "Banner reklame për ofertë vere, ngjyra të ngrohta",
  "Kreativ Instagram për një restorant, ushqim premium",
  "Reklamë për zbritje Black Friday, kontrast i lartë",
  "Post promocional për një palestër, energji dinamike",
];

export default function ReklamaToolPage() {
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
              <Megaphone className="h-3.5 w-3.5" /> {tool.name}
            </Badge>
            <h1 className="text-balance text-[clamp(28px,4.5vw,46px)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink">
              Reklama që konvertojnë
            </h1>
            <p className="mx-auto mt-3 max-w-md text-balance text-[15.5px] leading-relaxed text-ink-2">
              Përshkruaj fushatën — Maro Reklama krijon vizuale gati për rrjetet, sipas stilit të Reklama GPT tënde.
            </p>
          </motion.div>

          <ImageComposer toolId="reklama" examples={EXAMPLES} />
        </div>
      </div>
    </AppShell>
  );
}
