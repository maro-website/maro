"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MaroIcon } from "@/components/app/OptionIcon";
import { useWorkspace } from "@/context/workspace";
import { HUB_MENU_DESTINATIONS, isNavActive } from "@/lib/nav/destinations";
import { iconSrc } from "@/lib/tools/iconMap";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, Home } from "lucide-react";

function NavIcon({ name, className, hub }: { name: string; className?: string; hub?: boolean }) {
  if (hub) {
    return <Home className={cn("shrink-0", className)} />;
  }
  const known = ["history", "settings", "maro-imazh", "maro-web", "maro-brand", "maroLogo", "idea"];
  if (known.includes(name)) {
    return <MaroIcon src={iconSrc(`${name}.svg`)} className={className} />;
  }
  return <Home className={cn("shrink-0", className)} />;
}

export function HubDropdown() {
  const pathname = usePathname();
  const { workspaces, activeWorkspace, setActiveWorkspace, ready } = useWorkspace();
  const [open, setOpen] = React.useState(false);
  const [wsOpen, setWsOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const hubActive = pathname === "/";

  const place = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setWsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setWsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  const wsLabel = activeWorkspace?.name ?? "Maro Workspace #1";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "maro-nav__link h-10",
          hubActive ? "text-brand" : "text-ink-2"
        )}
        data-active={hubActive || undefined}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Home className={cn("h-4 w-4", hubActive ? "text-brand" : "text-ink")} />
        Hub
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                style={{ position: "fixed", top: pos.top, left: pos.left, width: "var(--hub-dropdown-w)", zIndex: 130 }}
                className="maro-menu overflow-hidden py-0"
                role="menu"
              >
                <div className="p-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setWsOpen((o) => !o)}
                      className="flex h-10 w-full items-center justify-between rounded-maro12 bg-surface-2 px-4 text-left text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover"
                    >
                      <span className="truncate">{ready ? wsLabel : "…"}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", wsOpen && "rotate-180")}
                      />
                    </button>
                    {wsOpen && workspaces.length > 0 && (
                      <div className="maro-menu absolute inset-x-0 top-[calc(100%+4px)] z-10 py-1">
                        {workspaces.map((ws) => (
                          <button
                            key={ws.id}
                            type="button"
                            onClick={() => {
                              setActiveWorkspace(ws.id);
                              setWsOpen(false);
                            }}
                            className={cn(
                              "maro-menu__item",
                              ws.id === activeWorkspace?.id ? "text-brand" : "text-ink"
                            )}
                          >
                            {ws.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ws.iconUrl} alt="" className="h-5 w-5 rounded-md object-cover" />
                            ) : (
                              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-soft text-[10px] font-bold text-brand">
                                {ws.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="truncate">{ws.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="py-2">
                  {HUB_MENU_DESTINATIONS.map((item) => {
                    const active = isNavActive(pathname, item);
                    const isSeparatorBefore = item.id === "brain";
                    const content = (
                      <>
                        <NavIcon
                          name={item.iconName}
                          hub={item.id === "hub"}
                          className={cn("h-4 w-4", active ? "text-brand" : "text-ink")}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && <span className="text-[11px] font-medium text-ink-3">{item.badge}</span>}
                      </>
                    );
                    return (
                      <React.Fragment key={item.id}>
                        {isSeparatorBefore && <div className="mx-4 my-2 h-px bg-line" />}
                        {item.disabled ? (
                          <span
                            className="flex cursor-not-allowed items-center gap-3 px-4 py-3 text-[14px] font-semibold text-ink-3"
                            role="menuitem"
                            aria-disabled
                          >
                            {content}
                          </span>
                        ) : (
                          <Link
                            href={item.route}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 text-[14px] font-semibold transition-colors hover:bg-surface-2",
                              active ? "text-brand" : "text-ink"
                            )}
                            role="menuitem"
                          >
                            {content}
                          </Link>
                        )}
                        {item.id === "krijimet" && <div className="mx-4 my-2 h-px bg-line" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
