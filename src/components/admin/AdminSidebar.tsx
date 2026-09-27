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
    <aside className="flex w-full shrink-0 flex-col gap-[10px] lg:w-[240px]">
      <div className="mb-[10px] px-[10px] text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        Control Center
      </div>
      {ADMIN_NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => itemVisible(role, item));
        if (items.length === 0) return null;
        const isOpen = openGroups[group.id] !== false;

        return (
          <div key={group.id} className="rounded-maro16 bg-surface p-[10px]">
            <button
              type="button"
              onClick={() => setOpenGroups((s) => ({ ...s, [group.id]: !isOpen }))}
              className="flex min-h-11 w-full items-center justify-between gap-[10px] rounded-maro12 px-[10px] text-left text-[13px] font-semibold text-ink-2 hover:bg-surface-2"
            >
              {group.label}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="mt-[10px] flex flex-col gap-[10px]">
                {items.map((item) => {
                  const active = isAdminNavActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        "flex min-h-11 items-center gap-[20px] rounded-maro12 px-[10px] text-[13px] font-semibold transition-colors",
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
