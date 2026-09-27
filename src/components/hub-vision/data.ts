import type { ImageCreation } from "@/lib/types";

/** Only Imazh currently consumes ?open=. Logo's wizard ignores that parameter. */
export function resumableCreations(creations: ImageCreation[], scope: string | null, selectedWorkspace: string | null) {
  if (!scope || (selectedWorkspace && scope !== selectedWorkspace)) return [];
  return creations
    .filter((item) => item.toolId === "reklama" && item.id && Number.isFinite(Date.parse(item.createdAt)) && (!item.workspaceId || item.workspaceId === scope))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 3);
}

export function resumeHref(id: string) {
  return `/imazh?open=${encodeURIComponent(id)}`;
}
