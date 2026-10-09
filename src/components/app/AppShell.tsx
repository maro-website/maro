"use client";



import * as React from "react";

import { usePathname } from "next/navigation";

import { AppTopNav } from "@/components/app/AppTopNav";

import { PlatformNotices } from "@/components/app/PlatformNotices";

import { NavDrawer } from "@/components/app/NavDrawer";

import { AppFooter } from "@/components/app/AppFooter";

import { STUDIO_ROUTES } from "@/lib/nav/destinations";

import { getModuleAvailability } from "@/lib/modules/availability";

import { cn } from "@/lib/utils/cn";

const WORKSPACE_ROUTES = new Set([

  "/imazh",

  "/marologo",

  "/web",

  "/filma",

  "/audio",

  "/marketing",

]);



/** Full-height project surfaces (editor, preview) — no page scroll chrome. */

const PROJECT_IMMERSIVE = /^\/projects\/[^/]+\/(editor|preview)$/;



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



  const isWorkspace = WORKSPACE_ROUTES.has(pathname) && getModuleAvailability(pathname.slice(1))?.status !== "coming_soon";

  const isProjectImmersive = PROJECT_IMMERSIVE.test(pathname);

  const footerVisible =

    hideFooter !== true && (showFooter === true || STUDIO_ROUTES.has(pathname));

  const isHubHome = pathname === "/";

  return (

    <div

      className="maro-app-shell flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-canvas"

    >

      <PlatformNotices placement="global" moduleId={moduleForPath(pathname)} />

      <div

        className={cn(

          "relative z-30 shrink-0",

          "h-[var(--maro-shell-header-height)]"

        )}

      >

        <AppTopNav

          onOpenDrawer={() => setDrawer(true)}

          className={isHubHome ? "absolute inset-x-0 top-0" : undefined}

        />

      </div>

      <NavDrawer open={drawer} onClose={() => setDrawer(false)} />



      <main className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", isHubHome && "-mt-[var(--maro-shell-header-height)]")}>

        <div

          className={cn(

            "min-h-0 min-w-0 flex-1",

            isProjectImmersive

              ? "flex flex-col overflow-hidden"

              : isWorkspace

                ? "flex flex-col overflow-x-clip overflow-y-auto lg:overflow-hidden"

                : "overflow-x-clip overflow-y-auto",

            pathname === "/prompts" && "[scrollbar-gutter:stable]"

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



function moduleForPath(pathname: string): string {

  if (pathname.startsWith("/imazh")) return "maroImazh";

  if (pathname.startsWith("/marologo") || pathname.startsWith("/logo")) return "maroLogo";

  if (pathname.startsWith("/web") || pathname.startsWith("/projects")) return "maroWeb";

  if (pathname.startsWith("/filma")) return "maroFilma";

  if (pathname.startsWith("/audio") || pathname.startsWith("/zo")) return "maroAudio";

  return "platform";

}
