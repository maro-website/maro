/**
 * Single source of truth for global navigation destinations.
 * Used by AppTopNav, HubDropdown, NavDrawer, and HomeHub.
 */

import { getModuleAvailability } from "@/lib/modules/availability";

export type NavGroup = "home" | "discover" | "tools" | "studio" | "community" | "later";

export interface NavDestination {
  id: string;
  label: string;
  route: string;
  group: NavGroup;
  /** Shown in top bar on desktop (lg+). Hub is handled separately via HubDropdown. */
  showInTopBar?: boolean;
  comingSoon?: boolean;
  badge?: string;
  toolId?: string;
  /** Icon name from the canonical public Maro icon library. */
  iconName?: string;
}

export interface HubMenuDestination {
  id: string;
  label: string;
  route: string;
  iconName: string;
  disabled?: boolean;
  badge?: string;
}

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  home: "Ballina",
  discover: "Zbulim",
  tools: "Tools",
  studio: "Studio",
  community: "Komuniteti",
  later: "Së shpejti",
};

/** Top bar module links (Hub trigger is separate). */
const MODULE_DESTINATIONS: NavDestination[] = [
  { id: "imazh", label: "maroImazh", route: "/imazh", group: "tools", showInTopBar: true, toolId: "reklama", iconName: "maro-imazh" },
  { id: "marologo", label: "maroLogo", route: "/marologo", group: "tools", showInTopBar: true, toolId: "logo", iconName: "maroLogo" },
  { id: "web", label: "maroWeb", route: "/web", group: "tools", showInTopBar: true, toolId: "website", iconName: "maro-web" },
  { id: "filma", label: "maroFilma", route: "/filma", group: "tools", showInTopBar: true, toolId: "filma", iconName: "maro-filma" },
  { id: "audio", label: "maroZo", route: "/audio", group: "tools", showInTopBar: true, toolId: "zo", iconName: "maro-zo" },
  { id: "marketing", label: "maroMarketing", route: "/marketing", group: "studio", showInTopBar: true, iconName: "idea" },
  { id: "presets", label: "maroPresets", route: "/prompts", group: "studio", showInTopBar: true, iconName: "idea" },
];

export const TOP_BAR_DESTINATIONS: NavDestination[] = MODULE_DESTINATIONS.map((destination) => {
  const productModule = getModuleAvailability(destination.toolId ?? destination.id);
  return {
    ...destination,
    comingSoon: productModule?.status === "coming_soon",
    badge: productModule?.status === "coming_soon" ? `Së shpejti · ${productModule.version}` : undefined,
  };
});

export const HUB_MENU_DESTINATIONS: HubMenuDestination[] = [
  { id: "hub", label: "Hub", route: "/", iconName: "maro-imazh" },
  { id: "krijimet", label: "Cka ke maru", route: "/krijimet", iconName: "history" },
  { id: "brain", label: "maroBrain", route: "/brain", iconName: "maro-brain" },
  { id: "workspaces", label: "Cilesimet", route: "/account/workspaces", iconName: "settings" },
];

export const NAV_DESTINATIONS: NavDestination[] = [
  { id: "home", label: "Hub", route: "/", group: "home" },
  ...TOP_BAR_DESTINATIONS,
  { id: "explore", label: "Explore", route: "/explore", group: "discover" },
  { id: "case_studies", label: "Case Studies", route: "/case-studies", group: "later", badge: "Së shpejti · V1.5", comingSoon: true },
  { id: "mcp", label: "MCP & CLI", route: "/mcp", group: "later", badge: "së shpejti", comingSoon: true },
];

export const STUDIO_ROUTES = new Set([
  "/",
  "/imazh",
  "/marologo",
  "/web",
  "/filma",
  "/audio",
  "/marketing",
  "/explore",
  "/prompts",
  "/contests",
  "/krijimet",
  "/brain",
]);

export function isNavActive(pathname: string, dest: NavDestination | HubMenuDestination): boolean {
  if (dest.route === "/") return pathname === "/";
  if (dest.route === "#") return false;
  return pathname === dest.route || pathname.startsWith(`${dest.route}/`);
}

export function navDestinationsByGroup(): Record<NavGroup, NavDestination[]> {
  const out = {} as Record<NavGroup, NavDestination[]>;
  for (const g of Object.keys(NAV_GROUP_LABELS) as NavGroup[]) {
    out[g] = NAV_DESTINATIONS.filter((d) => d.group === g);
  }
  return out;
}
