import type { MaroLogoAppState } from "./types";
import type { PromptAttach } from "@/lib/prompts/types";

export type LogoDraft = { state: MaroLogoAppState; preset: PromptAttach | null };
const memory = new Map<string, LogoDraft>();
const invalidatedUsers = new Set<string>();
const owner = (key: string) => key.split(":", 1)[0];
const database = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("maro-logo-drafts", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("drafts");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error("draft-storage-blocked"));
});

// IndexedDB retains uploaded references too, without sessionStorage's small quota.
export async function readLogoDraft(key: string): Promise<LogoDraft | null> {
  invalidatedUsers.delete(owner(key));
  await writes;
  if (memory.has(key)) return memory.get(key)!;
  try {
    const db = await database();
    return await new Promise<LogoDraft | null>((resolve, reject) => {
      const tx = db.transaction("drafts", "readonly");
      const request = tx.objectStore("drafts").get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch { return null; }
}

// Serialize writes/deletions so a late autosave cannot resurrect a consumed draft.
let writes: Promise<void> = Promise.resolve();
export function saveLogoDraft(key: string, draft: LogoDraft | null): Promise<void> {
  if (invalidatedUsers.has(owner(key))) return writes;
  if (draft) memory.set(key, draft); else memory.delete(key);
  writes = writes.then(async () => {
    if (invalidatedUsers.has(owner(key))) return;
    try {
      const db = await database();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        if (draft) tx.objectStore("drafts").put(draft, key); else tx.objectStore("drafts").delete(key);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
      });
    } catch { /* In-memory drafts still survive navigation if browser storage is unavailable. */ }
  });
  return writes;
}

export function clearLogoDrafts(userId: string): Promise<void> {
  invalidatedUsers.add(userId);
  invalidatedUsers.add("guest");
  const owned = (key: string) => key.startsWith(`${userId}:`) || key.startsWith("guest:");
  for (const key of memory.keys()) if (owned(key)) memory.delete(key);
  writes = writes.then(async () => {
    try {
      const db = await database();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        const request = tx.objectStore("drafts").openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (typeof cursor.key === "string" && owned(cursor.key)) cursor.delete();
          cursor.continue();
        };
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
      });
    } catch { /* Storage unavailable; in-memory cache was already cleared. */ }
  });
  return writes;
}
