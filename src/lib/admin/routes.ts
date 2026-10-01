/** Canonical Control Center routes and legacy tab aliases. */

import type { PermissionKey } from "@/lib/admin/permissions";
import type { MaroProductId } from "@/lib/design/maro-system";
import {
  LayoutDashboard,
  Users,
  Star,
  Cpu,
  Megaphone,
  Mail,
  ShoppingCart,
  LifeBuoy,
  BarChart3,
  Shield,
  Image as ImageIcon,
} from "lucide-react";
import type React from "react";

export interface AdminNavItem {
  href: string;
  label: string;
  permission?: PermissionKey;
  icon?: React.ElementType;
  product?: MaroProductId;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_ROUTES = {
  dashboard: "/admin",
  users: "/admin/users",
  creators: "/admin/creators",
  access: "/admin/access",
  engine: "/admin/engine",
  presets: "/admin/engine/presets",
  notifications: "/admin/notifications",
  loginAds: "/admin/login-ads",
  emails: "/admin/emails",
  help: "/admin/help",
  commerce: {
    overview: "/admin/commerce",
    plans: "/admin/commerce/plans",
    topups: "/admin/commerce/topups",
    business: "/admin/commerce/business",
    payments: "/admin/commerce/payments",
    promos: "/admin/commerce/promos",
    creators: "/admin/commerce/creators",
    ledger: "/admin/commerce/ledger",
  },
  support: {
    tickets: "/admin/support",
    reports: "/admin/support/reports",
  },
  analytics: {
    overview: "/admin/analytics",
    presets: "/admin/analytics/presets",
  },
  operations: {
    audit: "/admin/operations/audit",
    logs: "/admin/operations/logs",
    security: "/admin/operations/security",
    flags: "/admin/operations/flags",
    retention: "/admin/operations/retention",
  },
  mfa: "/admin/mfa",
  legacy: "/admin/legacy",
} as const;

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "command",
    label: "Maro V1",
    items: [{ href: ADMIN_ROUTES.dashboard, label: "Overview", permission: "admin.access", icon: LayoutDashboard }],
  },
  {
    id: "users",
    label: "Përdorues & Qasje",
    items: [
      { href: ADMIN_ROUTES.users, label: "Përdoruesit", permission: "users.view", icon: Users },
      { href: ADMIN_ROUTES.creators, label: "Kreatorët", permission: "creators.manage", icon: Star },
      { href: ADMIN_ROUTES.access, label: "Rolet & Lejet", permission: "users.manage", icon: Shield },
    ],
  },
  {
    id: "engine",
    label: "Product",
    items: [
      { href: "/admin/engine/tools/maro_imazh", label: "maroImazh", permission: "engine.view", product: "maroImazh" },
      { href: "/admin/engine/tools/maro_logo", label: "maroLogo", permission: "engine.view", icon: Cpu },
      { href: "/admin/engine/brain", label: "maroBrain", permission: "engine.view", product: "maroBrain" },
      { href: "/admin/engine/generations", label: "Generations", permission: "operations.view", icon: LayoutDashboard },
      { href: ADMIN_ROUTES.presets, label: "maroPresets", permission: "presets.manage", product: "maroPresets" },
    ],
  },
  {
    id: "content",
    label: "Përmbajtja",
    items: [
      { href: ADMIN_ROUTES.notifications, label: "Njoftimet", permission: "notifications.manage", icon: Megaphone },
      { href: ADMIN_ROUTES.loginAds, label: "Login Ads", permission: "notifications.manage", icon: ImageIcon },
      { href: ADMIN_ROUTES.emails, label: "Emailat", permission: "emails.manage", icon: Mail },
      { href: ADMIN_ROUTES.help, label: "Help Center", permission: "help.manage" },
    ],
  },
  {
    id: "commerce",
    label: "Tregtia",
    items: [
      { href: ADMIN_ROUTES.commerce.overview, label: "Përmbledhje", permission: "payments.view" },
      { href: ADMIN_ROUTES.commerce.plans, label: "Planet", permission: "payments.view" },
      { href: ADMIN_ROUTES.commerce.topups, label: "Top-ups", permission: "payments.view" },
      { href: ADMIN_ROUTES.commerce.business, label: "Business", permission: "payments.view" },
      { href: ADMIN_ROUTES.commerce.payments, label: "Pagesat", permission: "payments.view", icon: ShoppingCart },
      { href: ADMIN_ROUTES.commerce.promos, label: "Kodet Promo", permission: "payments.view" },
      { href: ADMIN_ROUTES.commerce.creators, label: "Fitimet e Kriatorëve", permission: "payments.view" },
      { href: ADMIN_ROUTES.commerce.ledger, label: "Libri i Krediteve", permission: "payments.view" },
    ],
  },
  {
    id: "support",
    label: "Suporti",
    items: [
      { href: ADMIN_ROUTES.support.tickets, label: "Tiketat", permission: "operations.view", icon: LifeBuoy },
      { href: ADMIN_ROUTES.support.reports, label: "Raportet e Gjenerimit", permission: "operations.view" },
    ],
  },
  {
    id: "analytics",
    label: "Analitika",
    items: [
      { href: ADMIN_ROUTES.analytics.overview, label: "Përmbledhje", permission: "analytics.view", icon: BarChart3 },
      { href: ADMIN_ROUTES.analytics.presets, label: "maroPresets", permission: "analytics.view" },
    ],
  },
  {
    id: "operations",
    label: "Operacionet",
    items: [
      { href: ADMIN_ROUTES.operations.audit, label: "Audit Log", permission: "audit.view" },
      { href: ADMIN_ROUTES.operations.logs, label: "Logs", permission: "operations.view" },
      { href: ADMIN_ROUTES.operations.security, label: "Siguria & Kostot", permission: "security.manage" },

      { href: ADMIN_ROUTES.operations.retention, label: "Retention", permission: "security.manage" },
    ],
  },
];

/** Legacy `/admin?tab=` → canonical destination (permanent redirect). */
export const LEGACY_ADMIN_TAB_REDIRECTS: Record<string, string> = {
  overview: ADMIN_ROUTES.dashboard,
  users: ADMIN_ROUTES.users,
  creators: ADMIN_ROUTES.creators,
  promos: ADMIN_ROUTES.commerce.promos,
  prompt: ADMIN_ROUTES.engine,
  fort: ADMIN_ROUTES.engine,
  reports: ADMIN_ROUTES.support.reports,
  reklamat: ADMIN_ROUTES.notifications,
  pricing: ADMIN_ROUTES.commerce.plans,
  analytics: ADMIN_ROUTES.analytics.presets,
  orders: ADMIN_ROUTES.commerce.payments,
  log: ADMIN_ROUTES.operations.logs,
};

export function resolveLegacyAdminTabRedirect(tab: string | null | undefined): string | null {
  if (!tab) return null;
  return LEGACY_ADMIN_TAB_REDIRECTS[tab] ?? null;
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href.includes("?")) {
    return false;
  }
  if (href === ADMIN_ROUTES.dashboard) {
    return pathname === ADMIN_ROUTES.dashboard;
  }
  if (href === ADMIN_ROUTES.engine) {
    return pathname === ADMIN_ROUTES.engine;
  }
  if (href === ADMIN_ROUTES.presets) {
    return pathname === ADMIN_ROUTES.presets || pathname.startsWith(`${ADMIN_ROUTES.presets}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function adminNavGroupForPath(pathname: string): string | null {
  if (pathname === ADMIN_ROUTES.dashboard) return "command";
  if (pathname.startsWith("/admin/users") || pathname.startsWith(ADMIN_ROUTES.access) || pathname.startsWith(ADMIN_ROUTES.creators)) return "users";
  if (pathname.startsWith("/admin/engine")) return "engine";
  if (pathname.startsWith("/admin/notifications") || pathname.startsWith("/admin/login-ads") || pathname.startsWith("/admin/help") || pathname.startsWith("/admin/emails")) return "content";
  if (pathname.startsWith("/admin/commerce")) return "commerce";
  if (pathname.startsWith("/admin/support")) return "support";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  if (pathname.startsWith("/admin/operations") || pathname.startsWith("/admin/security")) return "operations";
  if (pathname.startsWith(ADMIN_ROUTES.mfa)) return "mfa";
  if (pathname.startsWith(ADMIN_ROUTES.legacy)) return "legacy";
  return null;
}
