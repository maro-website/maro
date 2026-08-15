// Thin localStorage wrapper. All prototype persistence flows through here so
// Phase 2 can replace it with a real DB/session without touching the UI.

const NS = "maro:v1";

export const StorageKeys = {
  session: `${NS}:session`,
  /** @deprecated Use projectsKey(workspaceId) — kept for one-time migration. */
  projects: `${NS}:projects`,
  /** @deprecated Use creationsKey(workspaceId) — kept for one-time migration. */
  creations: `${NS}:creations`,
  seeded: `${NS}:seeded`,
  toolSelections: `${NS}:tool-selections`,
  fortValues: `${NS}:fort-values`,
} as const;

/** Anonymous / pre-workspace fallback scope. */
export const LOCAL_WORKSPACE_SCOPE = "local";

export function projectsKey(workspaceId: string): string {
  return `${NS}:projects:${workspaceId}`;
}

export function creationsKey(workspaceId: string): string {
  return `${NS}:creations:${workspaceId}`;
}

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — prototype ignores */
  }
}

export function remove(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  Object.values(StorageKeys).forEach((k) => window.localStorage.removeItem(k));
}
