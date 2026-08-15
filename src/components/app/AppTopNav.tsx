"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaroSymbol } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import { HubDropdown } from "@/components/app/HubDropdown";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { useMaro } from "@/context/store";
import { TOP_BAR_DESTINATIONS, isNavActive } from "@/lib/nav/destinations";
import { iconSrc } from "@/lib/tools/iconMap";
import { cn } from "@/lib/utils/cn";
import { Coins, Menu, Megaphone } from "lucide-react";

function ModuleNavIcon({ dest }: { dest: (typeof TOP_BAR_DESTINATIONS)[number] }) {
  if (dest.toolId) {
    return <ToolIcon toolId={dest.toolId} fallback={Megaphone} className="h-3 w-3 shrink-0" />;
  }
  if (dest.iconName) {
    return <MaroIcon src={iconSrc(`${dest.iconName}.svg`)} fallback={Megaphone} className="h-3 w-3 shrink-0" />;
  }
  return null;
}

export function AppTopNav({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  const pathname = usePathname();
  const { user, credits } = useMaro();

  return (
    <header className="z-30 flex h-[var(--maro-shell-header-height)] shrink-0 items-center gap-3 border-b border-line bg-canvas px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="maro-icon-btn shrink-0 border border-line bg-surface text-ink lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <Link href="/" className="shrink-0" aria-label="maro">
          <MaroSymbol className="h-[38px] w-[38px]" />
        </Link>
        <div className="hidden lg:block">
          <HubDropdown />
        </div>
      </div>

      <nav
        className="scroll-thin hidden min-w-0 flex-1 items-center overflow-x-auto lg:flex"
        aria-label="Navigimi kryesor"
      >
        {TOP_BAR_DESTINATIONS.map((dest, i) => {
          const active = isNavActive(pathname, dest);
          const disabled = dest.comingSoon;
          return (
            <React.Fragment key={dest.id}>
              {i > 0 && <span className="mx-2 h-[21px] w-px shrink-0 bg-line" aria-hidden />}
              <Link
                href={dest.route}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[14px] font-semibold tracking-brand transition-colors",
                  active
                    ? "bg-surface text-brand shadow-[0_0_0_1px_var(--line)]"
                    : disabled
                    ? "text-ink-3"
                    : "text-ink hover:bg-surface/80"
                )}
                aria-current={active ? "page" : undefined}
              >
                <ModuleNavIcon dest={dest} />
                {dest.label}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {user && (
          <Link
            href="/pricing"
            className="hidden h-[38px] min-w-[131px] items-center justify-center gap-2 rounded-full border border-line bg-surface px-3 text-[14px] font-semibold transition-opacity hover:opacity-90 sm:inline-flex"
          >
            <MaroIcon name="coins" fallback={Coins} className="h-4 w-4 text-brand" />
            <span className="tabular-nums text-brand">{credits}</span>
            <span className="text-ink-2">kredite</span>
          </Link>
        )}
        <NotificationBell />
        <AppUserMenu />
      </div>
    </header>
  );
}
