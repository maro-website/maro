"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppTopNav } from "@/components/app/AppTopNav";
import { NavDrawer } from "@/components/app/NavDrawer";
import { AppFooter } from "@/components/app/AppFooter";
import { STUDIO_ROUTES } from "@/lib/nav/destinations";
import { cn } from "@/lib/utils/cn";

const WORKSPACE_ROUTES = new Set([
  "/imazh",
  "/brand",
  "/web",
  "/filma",
  "/audio",
  "/marketing",
]);

export function AppShell({
  children,
  hideFooter,
  showFooter,
}: {
  children: React.ReactNode;
  hideFooter?: boolean;
  showFooter?: boolean;
  /** @deprecated Left rail removed; kept for API compat. */
  hideSidebar?: boolean;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = React.useState(false);

  const isWorkspace = WORKSPACE_ROUTES.has(pathname);
  const footerVisible =
    hideFooter !== true && (showFooter === true || STUDIO_ROUTES.has(pathname));

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-canvas">
      <AppTopNav onOpenDrawer={() => setDrawer(true)} />
      <NavDrawer open={drawer} onClose={() => setDrawer(false)} />

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            isWorkspace ? "flex flex-col overflow-hidden" : "overflow-x-clip overflow-y-auto"
          )}
        >
          {footerVisible ? (
            <div className="flex min-h-full flex-col">
              {children}
              <AppFooter className="mt-auto hidden shrink-0 lg:flex" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
