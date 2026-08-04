"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { HomeSidebar, MobileSidebar } from "@/components/app/HomeSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";
import { AppFooter } from "@/components/app/AppFooter";
import { MaroIcon } from "@/components/app/OptionIcon";
import { MAIN_TOOLS } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";

const COLLAPSE_KEY = "maro.sidebar.collapsed";

export function AppShell({ children, hideFooter }: { children: React.ReactNode; hideFooter?: boolean }) {
  const pathname = usePathname();
  const toolRoutes = React.useMemo(() => MAIN_TOOLS.map((t) => t.route), []);
  const isToolPage = toolRoutes.includes(pathname);
  const showFooter = !hideFooter && !isToolPage;

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
    <div className="flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden">
      <AppTopBar onOpenDrawer={() => setDrawer(true)} />

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden",
          collapsed ? "grid-cols-1" : "lg:grid-cols-[var(--sidebar-width)_1fr]"
        )}
        style={{ ["--sidebar-width" as string]: "260px" }}
      >
        {!collapsed && (
          <aside className="hidden min-h-0 bg-surface lg:block">
            <HomeSidebar onCollapse={toggleCollapse} showHeader={false} />
          </aside>
        )}

        <MobileSidebar open={drawer} onClose={() => setDrawer(false)} />

        <main className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="absolute left-4 top-4 z-40 hidden h-11 w-11 place-items-center rounded-2xl bg-surface text-ink-2 transition-colors hover:text-ink lg:grid"
              aria-label="Hap sidebar"
              title="Hap sidebar"
            >
              <MaroIcon name="sidebarFlip" className="h-5 w-5" />
            </button>
          )}

          <div className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto">{children}</div>

          {showFooter && (
            <AppFooter className="hidden shrink-0 border-t border-line bg-canvas/80 px-4 py-2.5 backdrop-blur sm:block sm:px-5" />
          )}
        </main>
      </div>
    </div>
  );
}
