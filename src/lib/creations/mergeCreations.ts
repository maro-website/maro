import type { ImageCreation } from "@/lib/types";

const LOCAL_RESULT_GRACE_MS = 5 * 60_000;

function storagePath(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("storage:")) return value.slice("storage:".length);

  try {
    const url = new URL(value);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/
    );
    if (match) return `${decodeURIComponent(match[1])}/${decodeURIComponent(match[2])}`;
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.startsWith("data:") || value.startsWith("blob:") ? value : null;
  }
}

export function creationIdentityKeys(creation: ImageCreation): string[] {
  const keys = new Set<string>();
  if (creation.serverId) keys.add(`server:${creation.serverId}`);
  if (creation.id) keys.add(`id:${creation.id}`);
  for (const ref of creation.storageRefs ?? []) {
    const path = storagePath(ref);
    if (path) keys.add(`asset:${path}`);
  }
  for (const url of creation.urls ?? []) {
    const path = storagePath(url);
    if (path) keys.add(`asset:${path}`);
  }
  return [...keys];
}

function localOnly(creation: ImageCreation, now: number): boolean {
  if (creation.mediaType && creation.mediaType !== "image") return true;
  if (creation.urls.some((url) => url.startsWith("data:") || url.startsWith("blob:"))) return true;
  const created = Date.parse(creation.createdAt);
  return Number.isFinite(created) && now - created < LOCAL_RESULT_GRACE_MS;
}

/**
 * Reconcile the local cache with the server source of truth.
 *
 * Signed URLs are deliberately ignored as identities because their query string
 * changes on every refresh. A server item replaces every stale local duplicate
 * that points to the same stable storage object.
 */
export function mergeServerCreations(
  local: ImageCreation[],
  server: ImageCreation[],
  scopeId: string,
  now = Date.now()
): ImageCreation[] {
  const localByKey = new Map<string, ImageCreation>();
  for (const item of local) {
    for (const key of creationIdentityKeys(item)) {
      if (!localByKey.has(key)) localByKey.set(key, item);
    }
  }

  const claimedKeys = new Set<string>();
  const canonical = server.map((serverItem) => {
    const keys = creationIdentityKeys(serverItem);
    const matchingLocal = keys.map((key) => localByKey.get(key)).find(Boolean);
    keys.forEach((key) => claimedKeys.add(key));

    return {
      ...matchingLocal,
      ...serverItem,
      id: serverItem.serverId ?? serverItem.id,
      serverId: serverItem.serverId ?? serverItem.id,
      workspaceId: serverItem.workspaceId ?? matchingLocal?.workspaceId ?? scopeId,
      // Local reactions are not persisted on the generation row yet.
      reaction: matchingLocal?.reaction ?? serverItem.reaction,
    };
  });

  const survivingLocal = local.filter((item) => {
    const keys = creationIdentityKeys(item);
    if (keys.some((key) => claimedKeys.has(key))) return false;
    return localOnly(item, now);
  });

  const deduped = new Map<string, ImageCreation>();
  for (const item of [...canonical, ...survivingLocal]) {
    const primary = creationIdentityKeys(item)[0] ?? `local:${item.id}`;
    if (!deduped.has(primary)) deduped.set(primary, item);
  }

  return [...deduped.values()].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );
}
