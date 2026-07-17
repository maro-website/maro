"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { Composer } from "@/components/app/Composer";
import { HomeSidebar, MobileSidebar } from "@/components/app/HomeSidebar";
import { useMaro } from "@/context/store";
import { Menu, Coins } from "lucide-react";

export default function HomePage() {
  const { user, credits } = useMaro();
  const [drawer, setDrawer] = React.useState(false);

  const greeting = user ? `Mirë se erdhe, ${user.name.split(" ")[0]}` : "Çka po marojmë sot?";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line bg-canvas lg:block">
        <div className="sticky top-0 h-screen">
          <HomeSidebar />
        </div>
      </aside>

      <MobileSidebar open={drawer} onClose={() => setDrawer(false)} />

      {/* Main */}
      <main className="relative flex min-h-screen flex-col">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
          <div className="absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]" />
        </div>

        {/* Mobile top bar */}
        <div className="relative flex items-center justify-between px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-ink">
            <Coins className="h-3.5 w-3.5 text-brand" /> {user ? credits : "—"}
          </div>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10">
          <div className="w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 text-center"
            >
              <Badge tone="brand" className="mb-5 px-3 py-1 text-[12px]">
                MARO Beta Version
              </Badge>
              <h1 className="text-balance text-[clamp(30px,5vw,50px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-ink">
                {greeting}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-balance text-[15.5px] leading-relaxed text-ink-2">
                Përshkruaj website-in që ke në mendje. Zgjidh tipin dhe shpejtësinë — Maro e maron.
              </p>
            </motion.div>

            <Composer />
          </div>
        </div>

        <div className="relative pb-6 text-center text-[12px] text-ink-3">
          Maro · maro.al — modeli: Claude Opus 4.8
        </div>
      </main>
    </div>
  );
}
