"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import { Menu } from "lucide-react";

/** Mobile-only top bar. Desktop uses sidebar logo + WorkspaceTopBar. */
export function AppTopBar({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  return (
    <header className="z-30 flex shrink-0 items-center justify-between gap-3 bg-canvas px-4 py-3 lg:hidden">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="maro-icon-btn bg-surface text-ink"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <Link href="/" className="shrink-0" aria-label="maro">
          <Logo mobileWordOnly />
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <AppUserMenu />
      </div>
    </header>
  );
}
