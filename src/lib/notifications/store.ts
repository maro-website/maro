// Client notifications: merges canonical DB billing notifications with legacy localStorage events.

export type NotificationType = "credits" | "giveaway" | "referral" | "billing";

export interface MaroNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  actionHref?: string | null;
  source: "local" | "db";
}

const EVENT = "maro:notifications";
const MAX = 50;

function keyFor(userId: string | null): string {
  return `maro:notifications:${userId ?? "anon"}`;
}

export function loadLocalNotifications(userId: string | null): MaroNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as MaroNotification[]) : [];
    return parsed.map((n) => ({ ...n, source: "local" as const }));
  } catch {
    return [];
  }
}

function saveLocal(userId: string | null, items: MaroNotification[]) {
  if (typeof window === "undefined") return;
  try {
    const localOnly = items.filter((n) => n.source === "local");
    window.localStorage.setItem(keyFor(userId), JSON.stringify(localOnly.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function pushNotification(
  userId: string | null,
  n: { type: Exclude<NotificationType, "billing">; title: string; body?: string }
): void {
  const items = loadLocalNotifications(userId);
  const next: MaroNotification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: new Date().toISOString(),
    read: false,
    source: "local",
  };
  saveLocal(userId, [next, ...items]);
}

export function markAllLocalRead(userId: string | null): void {
  const items = loadLocalNotifications(userId).map((n) => ({ ...n, read: true }));
  saveLocal(userId, items);
}

export function clearLocalNotifications(userId: string | null): void {
  saveLocal(userId, []);
}

export function subscribeNotifications(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export interface DbNotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
}

export function mapDbNotification(row: DbNotificationRow): MaroNotification {
  return {
    id: row.id,
    type: row.kind === "billing" ? "billing" : "credits",
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    read: Boolean(row.readAt),
    actionHref: row.actionHref,
    source: "db",
  };
}

export function mergeNotifications(
  local: MaroNotification[],
  db: MaroNotification[]
): MaroNotification[] {
  const byId = new Map<string, MaroNotification>();
  for (const n of [...db, ...local]) {
    if (!byId.has(n.id)) byId.set(n.id, n);
  }
  return [...byId.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX);
}

/** @deprecated use loadLocalNotifications */
export function loadNotifications(userId: string | null): MaroNotification[] {
  return loadLocalNotifications(userId);
}

/** @deprecated use markAllLocalRead */
export function markAllRead(userId: string | null): void {
  markAllLocalRead(userId);
}

/** @deprecated use clearLocalNotifications */
export function clearNotifications(userId: string | null): void {
  clearLocalNotifications(userId);
}
