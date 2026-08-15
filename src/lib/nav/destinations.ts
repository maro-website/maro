/**
 * Single source of truth for global navigation destinations.
 * Used by AppTopNav, NavDrawer, and HomeHub.
 */

export type NavGroup = "home" | "discover" | "tools" | "studio" | "community" | "later";

export interface NavDestination {
  id: string;
  label: string;
  route: string;
  group: NavGroup;
  /** Shown in top bar on desktop (lg+). */
  showInTopBar?: boolean;
  comingSoon?: boolean;
  badge?: string;
  toolId?: string;
}

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  home: "Ballina",
  discover: "Zbulim",
  tools: "Tools",
  studio: "Studio",
  community: "Komuniteti",
  later: "Së shpejti",
};

export const NAV_DESTINATIONS: NavDestination[] = [
  { id: "home", label: "Ballina", route: "/", group: "home", showInTopBar: true },
  { id: "explore", label: "Explore", route: "/explore", group: "discover", showInTopBar: true },
  { id: "imazh", label: "Imazh", route: "/imazh", group: "tools", showInTopBar: true, toolId: "reklama" },
  { id: "logo", label: "Brand", route: "/logo", group: "tools", showInTopBar: true, toolId: "logo" },
  { id: "web", label: "Web", route: "/web", group: "tools", showInTopBar: true, toolId: "website" },
  { id: "filma", label: "Filma", route: "/filma", group: "tools", showInTopBar: true, toolId: "filma", comingSoon: true },
  { id: "zo", label: "Zo", route: "/zo", group: "tools", showInTopBar: true, toolId: "zo", comingSoon: true },
  { id: "marketing", label: "Marketing", route: "/marketing", group: "studio", showInTopBar: true },
  { id: "presets", label: "Presets", route: "/prompts", group: "studio", showInTopBar: true },
  { id: "contests", label: "Kontestet", route: "/contests", group: "community", showInTopBar: true },
  { id: "krijimet", label: "Krijimet", route: "/krijimet", group: "discover" },
  { id: "kreator", label: "Kreator", route: "/kreator", group: "community" },
  { id: "academy", label: "Academy", route: "/academy", group: "later", badge: "së shpejti", comingSoon: true },
  { id: "mcp", label: "MCP & CLI", route: "/mcp", group: "later", badge: "së shpejti", comingSoon: true },
];

export const TOP_BAR_DESTINATIONS = NAV_DESTINATIONS.filter((d) => d.showInTopBar);

export const STUDIO_ROUTES = new Set([
  "/",
  "/imazh",
  "/logo",
  "/web",
  "/filma",
  "/zo",
  "/marketing",
  "/explore",
  "/prompts",
  "/contests",
  "/krijimet",
]);

export function isNavActive(pathname: string, dest: NavDestination): boolean {
  if (dest.route === "/") return pathname === "/";
  return pathname === dest.route || pathname.startsWith(`${dest.route}/`);
}

export function navDestinationsByGroup(): Record<NavGroup, NavDestination[]> {
  const out = {} as Record<NavGroup, NavDestination[]>;
  for (const g of Object.keys(NAV_GROUP_LABELS) as NavGroup[]) {
    out[g] = NAV_DESTINATIONS.filter((d) => d.group === g);
  }
  return out;
}
