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

function ModuleNavIcon({
  dest,
  active,
}: {
  dest: (typeof TOP_BAR_DESTINATIONS)[number];
  active: boolean;
}) {
  const cls = cn("h-5 w-5 shrink-0", active ? "text-brand" : "text-ink");
  if (dest.toolId) {
    return <ToolIcon toolId={dest.toolId} fallback={Megaphone} className={cls} />;
  }
  if (dest.iconName) {
    return <MaroIcon src={iconSrc(`${dest.iconName}.svg`)} fallback={Megaphone} className={cls} />;
  }
  return null;
}

export function AppTopNav({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  const pathname = usePathname();
  const { user, credits } = useMaro();

  return (
    <header className="z-30 flex h-[var(--maro-shell-header-height)] shrink-0 items-center gap-4 bg-canvas px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-[var(--nav-gap)]">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="maro-icon-button shrink-0 lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link href="/" className="shrink-0" aria-label="maro">
          <MaroSymbol className="h-[38px] w-[38px]" />
        </Link>
        <div className="hidden lg:block">
          <HubDropdown />
        </div>
      </div>

      <nav className="maro-nav scroll-thin hidden min-w-0 flex-1 overflow-x-auto lg:flex" aria-label="Navigimi kryesor">
        {TOP_BAR_DESTINATIONS.map((dest, i) => {
          const active = isNavActive(pathname, dest);
          const prevActive = i > 0 && isNavActive(pathname, TOP_BAR_DESTINATIONS[i - 1]!);
          const showSep = i > 0 && !active && !prevActive;

          return (
            <React.Fragment key={dest.id}>
              {showSep && <span className="maro-nav__sep" aria-hidden />}
              <Link
                href={dest.route}
                className="maro-nav__link"
                data-active={active || undefined}
                data-disabled={dest.comingSoon || undefined}
                aria-current={active ? "page" : undefined}
              >
                <ModuleNavIcon dest={dest} active={active} />
                {dest.label}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {user && (
          <Link
            href="/pricing"
            className="hidden h-10 min-w-[8.125rem] items-center justify-center gap-2 rounded-full bg-surface px-4 text-[14px] font-semibold transition-colors hover:bg-surface-hover sm:inline-flex"
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
