"use client";

import * as React from "react";
import { Logo } from "@/components/ui/Logo";
import { HomeSidebar, MobileSidebar } from "@/components/app/HomeSidebar";
import { useMaro } from "@/context/store";
import { Menu, Coins } from "lucide-react";

// The persistent app frame: left sidebar (desktop), mobile drawer + top bar,
// and a scrollable main area. Used by the hub landing and every tool page.
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, credits } = useMaro();
  const [drawer, setDrawer] = React.useState(false);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-line bg-canvas lg:block">
        <div className="sticky top-0 h-screen">
          <HomeSidebar />
        </div>
      </aside>

      <MobileSidebar open={drawer} onClose={() => setDrawer(false)} />

      <main className="relative flex min-h-screen flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur lg:hidden">
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

        {children}
      </main>
    </div>
  );
}
