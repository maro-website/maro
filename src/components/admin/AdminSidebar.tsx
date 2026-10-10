"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  hasPermission,
  type AccessRole,
  type PermissionKey,
} from "@/lib/admin/permissions";
import {
  ADMIN_ROUTES,
  ADMIN_NAV_GROUPS,
  adminNavGroupForPath,
  isAdminNavActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/admin/routes";
import { ChevronDown } from "lucide-react";
import { ToolIcon } from "@/components/app/OptionIcon";

export type { AdminNavGroup, AdminNavItem };

function itemVisible(role: AccessRole, item: AdminNavItem): boolean {
  if (!item.permission) return true;
  return hasPermission(role, item.permission);
}

export function AdminSidebar({ role }: { role: AccessRole }) {
  const pathname = usePathname();
  const activeGroup = adminNavGroupForPath(pathname);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of ADMIN_NAV_GROUPS) {
        if (next[g.id] === undefined) {
          next[g.id] = g.id === activeGroup;
        }
      }
      if (activeGroup && next[activeGroup] === false) {
        next[activeGroup] = true;
      }
      return next;
    });
  }, [activeGroup]);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-2 lg:min-h-0 lg:w-[240px] lg:overflow-y-auto lg:pr-2" aria-label="Navigimi i adminit">
      <button type="button" onClick={() => setMobileOpen(open => !open)} aria-expanded={mobileOpen} className="flex min-h-11 items-center justify-between rounded-maro16 bg-surface px-4 text-sm font-semibold text-ink lg:hidden">
        Navigimi i adminit<ChevronDown className={cn("h-4 w-4 transition-transform", mobileOpen && "rotate-180")} />
      </button>
      <div className="mb-[10px] hidden px-[10px] text-[11px] font-semibold uppercase tracking-wider text-ink-3 lg:block">
        Control Center
      </div>
      <div className={cn("flex-col gap-2 lg:flex", mobileOpen ? "flex" : "hidden")}>
      {ADMIN_NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => itemVisible(role, item));
        if (items.length === 0) return null;
        const isOpen = openGroups[group.id] !== false;

        return (
          <div key={group.id} className="rounded-maro16 bg-surface p-2">
            <button
              type="button"
              onClick={() => setOpenGroups((s) => ({ ...s, [group.id]: !isOpen }))}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-maro12 px-3 text-left text-sm font-bold text-ink hover:bg-surface-2"
              aria-expanded={isOpen}
            >
              {group.label}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="mt-1 flex flex-col gap-1">
                {items.map((item) => {
                  const active = isAdminNavActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-maro12 px-3 text-sm font-semibold transition-colors",
                        active ? "bg-surface-selected text-brand" : "text-ink-2 hover:bg-surface-2"
                      )}
                    >
                      {item.product ? <ToolIcon toolId={item.product} className="h-3.5 w-3.5 shrink-0" /> : Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </aside>
  );
}
