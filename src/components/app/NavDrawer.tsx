"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MaroSymbol } from "@/components/ui/Logo";
import { HubDropdown } from "@/components/app/HubDropdown";
import { useMaro } from "@/context/store";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { StableImage } from "@/components/app/StableImage";
import { getProductBrand } from "@/lib/design/maro-system";
import { iconSrc } from "@/lib/tools/iconMap";
import {
  NAV_GROUP_LABELS,
  TOP_BAR_DESTINATIONS,
  HUB_MENU_DESTINATIONS,
  navDestinationsByGroup,
  isNavActive,
} from "@/lib/nav/destinations";
import { cn } from "@/lib/utils/cn";
import { Compass, Home, X } from "lucide-react";
import type { NavGroup } from "@/lib/nav/destinations";
import { useDialogFocus } from "@/components/ui/useDialogFocus";

const GROUP_ORDER: NavGroup[] = ["home", "discover", "tools", "studio", "community", "later"];

function DrawerIcon({ destination, colored = false }: {
  destination: { label: string; iconName?: string };
  colored?: boolean;
}) {
  const brand = getProductBrand(destination.label);
  if (destination.label === "maroExplore") return <Compass className="h-6 w-6 shrink-0 text-ink" />;
  if (brand && brand.id !== "maroFort") return colored
    ? <StableImage src={brand.icon} alt="" className="h-6 w-6 shrink-0" />
    : <ToolIcon toolId={brand.id} className="h-5 w-5 text-ink" />;
  return destination.iconName ? <MaroIcon src={iconSrc(`${destination.iconName}.svg`)} className="h-5 w-5 text-ink" /> : null;
}

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useMaro();
  const grouped = navDestinationsByGroup();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialogRef, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[var(--maro-z-overlay)] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigimi">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-overlay"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
            className="absolute inset-0 flex w-full flex-col bg-canvas"
          >
            <div className="flex h-[var(--maro-shell-header-height)] shrink-0 items-center justify-between px-4">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <MaroSymbol className="h-8 w-8" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-maro12 bg-surface text-ink hover:bg-surface-hover"
                aria-label="Mbyll"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
              <div className="mb-6 px-1">
                {user ? <HubDropdown /> : <Link href="/" onClick={onClose} className="maro-nav__link"><Home className="h-4 w-4" />Hub</Link>}
              </div>

              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">{NAV_GROUP_LABELS.tools}</p>
              <div className="mb-5 flex flex-col gap-1">
                {TOP_BAR_DESTINATIONS.map((dest) => {
                  const active = isNavActive(pathname, dest);
                  return (
                    <Link
                      key={dest.id}
                      href={dest.route}
                      aria-current={active ? "page" : undefined}
                      onClick={onClose}
                      className={cn(
                        "flex min-h-[52px] items-center justify-between rounded-maro16 px-4 py-3 text-[16px] font-semibold tracking-brand transition-colors",
                        active ? "bg-surface text-brand" : "text-ink hover:bg-surface"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3"><DrawerIcon destination={dest} colored /><span>{getProductBrand(dest.label)?.displayName ?? dest.label}</span></span>
                      {dest.comingSoon && (
                        <span className="text-[11px] font-medium text-ink-3">së shpejti</span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">Hub</p>
              <div className="mb-5 flex flex-col gap-1">
                {HUB_MENU_DESTINATIONS.filter((d) => d.id !== "hub").map((dest) =>
                  dest.disabled ? (
                    <span
                      key={dest.id}
                      className="flex min-h-[52px] items-center justify-between rounded-maro16 px-4 py-3 text-[16px] font-semibold text-ink-3"
                    >
                      <span className="flex min-w-0 items-center gap-3"><DrawerIcon destination={dest} /><span>{dest.label}</span></span>
                      {dest.badge && <span className="text-[11px]">{dest.badge}</span>}
                    </span>
                  ) : (
                    <Link
                      key={dest.id}
                      href={dest.route}
                      aria-current={isNavActive(pathname, dest) ? "page" : undefined}
                      onClick={onClose}
                      className={cn(
                        "flex min-h-[52px] items-center rounded-maro16 px-4 py-3 text-[16px] font-semibold tracking-brand transition-colors",
                        isNavActive(pathname, dest) ? "bg-surface text-brand" : "text-ink hover:bg-surface"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3"><DrawerIcon destination={dest} /><span>{dest.label}</span></span>
                    </Link>
                  )
                )}
              </div>

              {GROUP_ORDER.filter((g) => g !== "tools" && g !== "home").map((group) => {
                const items = grouped[group].filter(
                  (d) => !TOP_BAR_DESTINATIONS.some((t) => t.id === d.id)
                );
                if (!items.length) return null;
                return (
                  <div key={group} className="mb-5">
                    <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">
                      {NAV_GROUP_LABELS[group]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {items.map((dest) => {
                        const active = isNavActive(pathname, dest);
                        return (
                          <Link
                            key={dest.id}
                            href={dest.route}
                            aria-current={active ? "page" : undefined}
                            onClick={onClose}
                            className={cn(
                              "flex min-h-[52px] items-center justify-between rounded-maro16 px-4 py-3 text-[16px] font-semibold tracking-brand transition-colors",
                              active ? "bg-surface text-brand" : "text-ink hover:bg-surface"
                            )}
                          >
                            {dest.label}
                            {dest.badge && (
                              <span className="text-[11px] font-medium text-ink-3">{dest.badge}</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
