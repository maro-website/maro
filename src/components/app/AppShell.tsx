"use client";

import * as React from "react";
import { Logo } from "@/components/ui/Logo";
import { HomeSidebar, MobileSidebar } from "@/components/app/HomeSidebar";
import { useMaro } from "@/context/store";
import { Menu, Coins } from "lucide-react";

// The persistent app frame: left sidebar (desktop), mobile drawer + top bar,
// and a full-height main area. The children area fills the viewport so tool
// composers can dock their prompt box to the bottom (ChatGPT-style).
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, credits } = useMaro();
  const [drawer, setDrawer] = React.useState(false);

  return (
    <div className="grid h-[100dvh] grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr]">
      <aside className="hidden h-[100dvh] border-r border-line bg-canvas lg:block">
        <HomeSidebar />
      </aside>

      <MobileSidebar open={drawer} onClose={() => setDrawer(false)} />

      <main className="relative flex h-[100dvh] min-h-0 flex-col">
        {/* Mobile top bar */}
        <div className="z-30 flex shrink-0 items-center justify-between border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[13px] font-semibold text-ink">
            <Coins className="h-4 w-4 text-brand" /> {user ? credits : 0}
          </div>
        </div>

        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
