"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import { creditCost, imageToolCost, type PricingConfig } from "@/lib/supabase/types";
import { TOOLS, LOGO_PACKAGES, type ToolDef } from "@/lib/tools/registry";
import { ArrowRight, Coins } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

function toolCostLabel(tool: ToolDef, pricing: PricingConfig): string {
  if (tool.kind === "website") {
    const min = Math.min(
      creditCost(pricing, "landing", "fast"),
      creditCost(pricing, "business", "fast")
    );
    return `nga ${min} kredite`;
  }
  if (tool.id === "logo") {
    const min = Math.min(
      ...LOGO_PACKAGES.map((v) => imageToolCost(pricing, v.id, v.defaultCost))
    );
    return `nga ${min} kredite`;
  }
  return `${imageToolCost(pricing, tool.id, tool.defaultCost)} kredite`;
}

export default function HomePage() {
  const { user } = useMaro();
  const { pricing } = useSettings(Boolean(user));
  const firstName = user?.name?.split(" ")[0];

  return (
    <AppShell>
      <div className="relative h-full overflow-y-auto scroll-thin">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-aurora" />

        <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-balance text-[clamp(34px,6vw,58px)] font-extrabold leading-[1.03] tracking-[-0.045em] text-ink"
          >
            {firstName ? `Çka po marojmë sot, ${firstName}?` : "Çka po marojmë sot?"}
          </motion.h1>

          <div className="mt-12 flex flex-col gap-4">
            {TOOLS.map((tool, i) => (
              <ToolRow
                key={tool.id}
                tool={tool}
                index={i}
                cost={toolCostLabel(tool, pricing)}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ToolRow({ tool, index, cost }: { tool: ToolDef; index: number; cost: string }) {
  const router = useRouter();
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 + index * 0.07 }}
      whileHover={{ x: 4 }}
      onClick={() => router.push(tool.route)}
      className="group flex items-center gap-5 rounded-3xl border border-line bg-surface p-5 text-left shadow-subtle transition-shadow hover:shadow-pop sm:p-6"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink sm:h-16 sm:w-16">
        <tool.icon className="h-7 w-7 sm:h-8 sm:w-8" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[19px] font-extrabold tracking-[-0.02em] text-ink sm:text-[22px]">
          {tool.name}
        </span>
        <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-2 sm:text-[15px]">
          {tool.description}
        </span>
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[13px] font-semibold text-ink-2">
          <Coins className="h-4 w-4 text-brand" />
          {cost}
        </span>
      </span>

      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-ink-inv transition-transform group-hover:translate-x-1">
        <ArrowRight className="h-5 w-5" />
      </span>
    </motion.button>
  );
}
