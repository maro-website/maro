/**
 * Single source of truth for global navigation destinations.
 * Used by AppTopNav, HubDropdown, NavDrawer, and HomeHub.
 */

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
  /** Icon name from maro-design-system/icons/manifest.json */
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
export const TOP_BAR_DESTINATIONS: NavDestination[] = [
  { id: "imazh", label: "maroImazh", route: "/imazh", group: "tools", showInTopBar: true, toolId: "reklama", iconName: "maro-imazh" },
  { id: "web", label: "maroWeb", route: "/web", group: "tools", showInTopBar: true, toolId: "website", iconName: "maro-web" },
  { id: "filma", label: "maroFilma", route: "/filma", group: "tools", showInTopBar: true, toolId: "filma", iconName: "maro-filma", comingSoon: true },
  { id: "audio", label: "maroAudio", route: "/audio", group: "tools", showInTopBar: true, toolId: "zo", iconName: "maro-zo", comingSoon: true },
  { id: "marketing", label: "maroMarketing", route: "/marketing", group: "studio", showInTopBar: true, iconName: "idea", comingSoon: true },
  { id: "presets", label: "maroPresets", route: "/prompts", group: "studio", showInTopBar: true, iconName: "idea" },
];

export const HUB_MENU_DESTINATIONS: HubMenuDestination[] = [
  { id: "hub", label: "Hub", route: "/", iconName: "maro-imazh" },
  { id: "krijimet", label: "Cka ke maru", route: "/krijimet", iconName: "history" },
  { id: "brain", label: "maro Brain", route: "/brain", iconName: "maro-web" },
  { id: "workspaces", label: "Cilesimet", route: "/account/workspaces", iconName: "settings" },
];

export const NAV_DESTINATIONS: NavDestination[] = [
  { id: "home", label: "Hub", route: "/", group: "home" },
  ...TOP_BAR_DESTINATIONS,
  { id: "brand", label: "maro Brand", route: "/brand", group: "tools", toolId: "logo", iconName: "maro-brand" },
  { id: "explore", label: "Explore", route: "/explore", group: "discover" },
  { id: "krijimet", label: "Cka ke maru", route: "/krijimet", group: "discover", iconName: "history" },
  { id: "contests", label: "Kontestet", route: "/contests", group: "community" },
  { id: "kreator", label: "Kreator", route: "/kreator", group: "community" },
  { id: "academy", label: "Academy", route: "/academy", group: "later", badge: "së shpejti", comingSoon: true },
  { id: "mcp", label: "MCP & CLI", route: "/mcp", group: "later", badge: "së shpejti", comingSoon: true },
];

export const STUDIO_ROUTES = new Set([
  "/",
  "/imazh",
  "/brand",
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
