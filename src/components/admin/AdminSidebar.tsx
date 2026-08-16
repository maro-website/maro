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

export type { AdminNavGroup, AdminNavItem };

function itemVisible(role: AccessRole, item: AdminNavItem): boolean {
  if (!item.permission) return true;
  return hasPermission(role, item.permission);
}

export function AdminSidebar({ role }: { role: AccessRole }) {
  const pathname = usePathname();
  const activeGroup = adminNavGroupForPath(pathname);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

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
    <aside className="flex w-full shrink-0 flex-col gap-1 lg:w-[220px]">
      <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        Control Center
      </div>
      {ADMIN_NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => itemVisible(role, item));
        if (items.length === 0) return null;
        const isOpen = openGroups[group.id] !== false;

        return (
          <div key={group.id} className="rounded-xl bg-surface p-1">
            <button
              type="button"
              onClick={() => setOpenGroups((s) => ({ ...s, [group.id]: !isOpen }))}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-ink-2 hover:bg-surface-2"
            >
              {group.label}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="mt-0.5 flex flex-col gap-0.5 pb-1">
                {items.map((item) => {
                  const active = isAdminNavActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors",
                        active ? "bg-ink text-ink-inv" : "text-ink-2 hover:bg-surface-2"
                      )}
                    >
                      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
