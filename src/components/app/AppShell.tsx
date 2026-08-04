"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { HomeSidebar, MobileSidebar } from "@/components/app/HomeSidebar";
import { useMaro } from "@/context/store";
import { cn } from "@/lib/utils/cn";
import { Menu, Coins, Plus, PanelLeftOpen } from "lucide-react";

const COLLAPSE_KEY = "maro.sidebar.collapsed";

// Desktop: fixed viewport + inner scroll (composer dock). Mobile: natural page scroll.
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
      className={cn(
        "grid w-full max-w-[100vw] grid-cols-1 overflow-x-clip",
        "max-lg:min-h-[100dvh]",
        "lg:h-[100dvh] lg:overflow-hidden",
        collapsed ? "lg:grid-cols-1" : "lg:grid-cols-[280px_1fr]"
      )}
    >
      {!collapsed && (
        <aside className="hidden h-[100dvh] bg-canvas lg:block">
          <HomeSidebar onCollapse={toggleCollapse} />
        </aside>
      )}

      <MobileSidebar open={drawer} onClose={() => setDrawer(false)} />

      <main
        className={cn(
          "relative flex w-full min-w-0 flex-col overflow-x-clip",
          "max-lg:min-h-[100dvh]",
          "lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden"
        )}
      >
        <div className="z-30 flex shrink-0 items-center justify-between bg-canvas/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo mobileWordOnly />
          <Link
            href="/credits"
            className="flex max-w-[45vw] items-center gap-1.5 rounded-full bg-surface px-2.5 py-1.5 text-[13px] font-semibold text-ink active:scale-95"
            aria-label="Kredite"
          >
            <Coins className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">{user ? credits : 0}</span>
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-brand-fg">
              <Plus className="h-3 w-3" />
            </span>
          </Link>
        </div>

        {collapsed && (
          <button
            onClick={toggleCollapse}
            className="absolute left-4 top-4 z-40 hidden h-10 w-10 place-items-center rounded-2xl bg-surface text-ink-2 transition-colors hover:text-ink lg:grid"
            aria-label="Hap sidebar"
            title="Hap sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-x-clip",
            "max-lg:overflow-y-visible",
            "lg:overflow-hidden lg:flex lg:flex-col"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
