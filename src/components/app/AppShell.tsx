"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { HomeSidebar, MobileSidebar } from "@/components/app/HomeSidebar";
import { useMaro } from "@/context/store";
import { Menu, Coins, Plus, PanelLeftOpen } from "lucide-react";

const COLLAPSE_KEY = "maro.sidebar.collapsed";

// The persistent app frame: left sidebar (desktop), mobile drawer + top bar,
// and a full-height main area. The children area fills the viewport so tool
// composers can dock their prompt box to the bottom (ChatGPT-style).
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, credits } = useMaro();
  const [drawer, setDrawer] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div
      className={`grid h-[100dvh] grid-cols-1 overflow-hidden ${
        collapsed ? "lg:grid-cols-1" : "lg:grid-cols-[280px_1fr]"
      }`}
    >
      {!collapsed && (
        <aside className="hidden h-[100dvh] border-r border-line bg-canvas lg:block">
          <HomeSidebar onCollapse={toggleCollapse} />
        </aside>
      )}

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
          <Link
            href="/credits"
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[13px] font-semibold text-ink active:scale-95"
            aria-label="Kredite"
          >
            <Coins className="h-4 w-4 text-brand" /> {user ? credits : 0}
            <span className="grid h-4 w-4 place-items-center rounded-full bg-brand text-brand-fg">
              <Plus className="h-3 w-3" />
            </span>
          </Link>
        </div>

        {/* Desktop expand button (shown only when collapsed) */}
        {collapsed && (
          <button
            onClick={toggleCollapse}
            className="absolute left-4 top-4 z-40 hidden h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 shadow-subtle transition-colors hover:text-ink lg:grid"
            aria-label="Hap sidebar"
            title="Hap sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
