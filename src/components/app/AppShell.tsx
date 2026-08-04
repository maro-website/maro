"use client";

import * as React from "react";
import { HomeSidebar, MobileSidebar } from "@/components/app/HomeSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";
import { WorkspaceTopBar } from "@/components/app/WorkspaceTopBar";
import { AppFooter } from "@/components/app/AppFooter";
import { MaroIcon } from "@/components/app/OptionIcon";
import { cn } from "@/lib/utils/cn";

const COLLAPSE_KEY = "maro.sidebar.collapsed";

export function AppShell({ children, hideFooter }: { children: React.ReactNode; hideFooter?: boolean }) {
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
    <div className="flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-canvas">
      <AppTopBar onOpenDrawer={() => setDrawer(true)} />

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden",
          collapsed ? "grid-cols-1" : "lg:grid-cols-[var(--sidebar-width)_1fr]"
        )}
      >
        {!collapsed && (
          <aside className="hidden min-h-0 border-r border-line/40 bg-surface lg:block">
            <HomeSidebar onCollapse={toggleCollapse} showHeader />
          </aside>
        )}

        <MobileSidebar open={drawer} onClose={() => setDrawer(false)} />

        <main className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-canvas">
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="absolute left-5 top-5 z-40 hidden maro-icon-btn bg-surface text-ink-2 hover:text-ink lg:grid"
              aria-label="Hap sidebar"
              title="Hap sidebar"
            >
              <MaroIcon name="sidebarFlip" className="h-6 w-6" />
            </button>
          )}

          <div className="hidden lg:block">
            <WorkspaceTopBar />
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto">{children}</div>

          {!hideFooter && <AppFooter />}
        </main>
      </div>
    </div>
  );
}
