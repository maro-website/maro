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
  LayoutDashboard,
  Users,
  Star,
  Cpu,
  Megaphone,
  ShoppingCart,
  LifeBuoy,
  BarChart3,
  Settings2,
  ChevronDown,
  Shield,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  permission?: PermissionKey;
  icon?: React.ElementType;
  legacy?: boolean;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "command",
    label: "Command Center",
    items: [
      { href: "/admin", label: "Dashboard", permission: "admin.access", icon: LayoutDashboard },
    ],
  },
  {
    id: "users",
    label: "Users & Access",
    items: [
      { href: "/admin?tab=users", label: "Users", permission: "users.view", icon: Users, legacy: true },
      { href: "/admin?tab=creators", label: "Creators", permission: "creators.manage", icon: Star, legacy: true },
      { href: "/admin/access", label: "Roles & Permissions", permission: "users.manage", icon: Shield },
    ],
  },
  {
    id: "engine",
    label: "Maro Engine",
    items: [
      { href: "/admin/engine", label: "Overview", permission: "engine.view", icon: Cpu },
      { href: "/admin/prompts", label: "maroPresets", permission: "presets.manage", icon: Cpu },
      { href: "/admin/presets/categories", label: "Preset Categories", permission: "presets.manage" },
      { href: "/admin?tab=prompt", label: "Master Prompts", permission: "engine.manage", legacy: true },
      { href: "/admin?tab=fort", label: "maroFort", permission: "engine.manage", legacy: true },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/notifications", label: "Notifications", permission: "notifications.manage", icon: Megaphone },
      { href: "/admin/help", label: "Help Center", permission: "help.manage" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { href: "/admin/commerce/plans", label: "Plans & Credits", permission: "payments.view" },
      { href: "/admin/commerce/payments", label: "Payments", permission: "payments.view", icon: ShoppingCart },
      { href: "/admin/commerce/promos", label: "Promo Codes", permission: "payments.view" },
      { href: "/admin/commerce/creators", label: "Creator Earnings", permission: "payments.view" },
      { href: "/admin/commerce/ledger", label: "Credit Ledger", permission: "payments.view" },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      { href: "/admin/support", label: "Tickets", permission: "operations.view", icon: LifeBuoy },
      { href: "/admin/support/reports", label: "Generation Reports", permission: "operations.view" },
      { href: "/admin?tab=reports", label: "Reports (legacy)", permission: "operations.view", legacy: true },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Overview", permission: "analytics.view", icon: BarChart3 },
      { href: "/admin?tab=analytics", label: "maroPresets", permission: "analytics.view", legacy: true },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/admin/operations/audit", label: "Audit Log", permission: "audit.view" },
      { href: "/admin/operations/logs", label: "System Logs", permission: "operations.view" },
      { href: "/admin/operations/flags", label: "Kill Switches", permission: "security.manage" },
      { href: "/admin/security", label: "Security & Costs", permission: "security.manage", icon: Settings2 },
    ],
  },
];

function itemVisible(role: AccessRole, item: AdminNavItem): boolean {
  if (!item.permission) return true;
  return hasPermission(role, item.permission);
}

export function AdminSidebar({ role }: { role: AccessRole }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of ADMIN_NAV_GROUPS) {
        if (next[g.id] === undefined) next[g.id] = true;
      }
      return next;
    });
  }, []);

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
                  const active =
                    pathname === item.href ||
                    (item.href.startsWith("/admin/legacy") && pathname === "/admin/legacy");
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
