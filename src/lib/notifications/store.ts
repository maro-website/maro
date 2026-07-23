// Lightweight client-side notifications. Persisted in localStorage and scoped
// per user. Specific product events push here (credit purchases, giveaways,
// creator referral sales). A window event keeps open bells in sync.

export type NotificationType = "credits" | "giveaway" | "referral";

export interface MaroNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
}

const EVENT = "maro:notifications";
const MAX = 50;

function keyFor(userId: string | null): string {
  return `maro:notifications:${userId ?? "anon"}`;
}

export function loadNotifications(userId: string | null): MaroNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as MaroNotification[]) : [];
  } catch {
    return [];
  }
}

function save(userId: string | null, items: MaroNotification[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(items.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function pushNotification(
  userId: string | null,
  n: { type: NotificationType; title: string; body?: string }
): void {
  const items = loadNotifications(userId);
  const next: MaroNotification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: new Date().toISOString(),
    read: false,
  };
  save(userId, [next, ...items]);
}

export function markAllRead(userId: string | null): void {
  const items = loadNotifications(userId).map((n) => ({ ...n, read: true }));
  save(userId, items);
}

export function clearNotifications(userId: string | null): void {
  save(userId, []);
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
