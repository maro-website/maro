import type { PrivateImageAttachment } from "./privateImageAttachment";
import type { PromptAttach } from "@/lib/prompts/types";

export type ComposerDraft = {
  prompt: string;
  attachments: string[];
  privateImageAttachments: PrivateImageAttachment[];
  audioInput: { url: string; name: string } | null;
  promptAttach: PromptAttach | null;
};
export const emptyComposerDraft = (): ComposerDraft => ({ prompt: "", attachments: [], privateImageAttachments: [], audioInput: null, promptAttach: null });
const memory = new Map<string, ComposerDraft>();
const revisions = new Map<string, number>();
const fileRevisions = new Map<string, number>();
const listeners = new Map<string, Set<(draft: ComposerDraft) => void>>();
const prefix = "maro:composer-draft:v1:";
let database: Promise<IDBDatabase> | undefined;

export function composerDraftKey(userId: string | undefined, workspaceId: string, toolId: string) {
  return `${prefix}${encodeURIComponent(userId ?? "guest")}:${encodeURIComponent(workspaceId)}:${encodeURIComponent(toolId)}`;
}

export function subscribeComposerDraft(key: string, listener: (draft: ComposerDraft) => void) {
  const group = listeners.get(key) ?? new Set();
  group.add(listener); listeners.set(key, group);
  return () => { group.delete(listener); if (!group.size) listeners.delete(key); };
}

function db() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("maro-composer-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { database = undefined; throw error; });
  return database;
}

/** Text is saved synchronously; larger attachments use the browser's file-capable store. */
export function currentComposerDraft(key: string): ComposerDraft {
  const cached = memory.get(key);
  if (cached) return cached;
  const draft = emptyComposerDraft();
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (saved && typeof saved.prompt === "string") draft.prompt = saved.prompt;
    if (saved?.promptAttach?.id) draft.promptAttach = saved.promptAttach;
  } catch { /* Browser storage can be unavailable; navigation still uses memory. */ }
  return draft;
}

export async function loadComposerDraft(key: string): Promise<ComposerDraft> {
  if (memory.has(key)) return memory.get(key)!;
  const revision = revisions.get(key) ?? 0;
  try {
    const store = await db();
    const saved = await new Promise<ComposerDraft | undefined>((resolve, reject) => {
      const request = store.transaction("drafts", "readonly").objectStore("drafts").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // A late disk read must never overwrite text/files typed while it was loading.
    if ((revisions.get(key) ?? 0) !== revision) return currentComposerDraft(key);
    const text = currentComposerDraft(key);
    const result = saved ? { ...emptyComposerDraft(), ...saved, prompt: text.prompt, promptAttach: text.promptAttach } : text;
    memory.set(key, result);
    return result;
  } catch { return currentComposerDraft(key); }
}

export function saveComposerDraft(key: string, draft: ComposerDraft) {
  const previous = memory.get(key);
  memory.set(key, draft);
  listeners.get(key)?.forEach(listener => listener(draft));
  const revision = (revisions.get(key) ?? 0) + 1;
  revisions.set(key, revision);
  try { localStorage.setItem(key, JSON.stringify({ prompt: draft.prompt, promptAttach: draft.promptAttach })); } catch { /* Memory remains available. */ }
  // Typing must not re-copy large uploaded files on every keystroke.
  if (previous && previous.attachments === draft.attachments && previous.privateImageAttachments === draft.privateImageAttachments && previous.audioInput === draft.audioInput) return;
  const fileRevision = (fileRevisions.get(key) ?? 0) + 1;
  fileRevisions.set(key, fileRevision);
  void db().then(store => {
    // Coalesce rapid typing before the database opens, without delaying text saves.
    if (fileRevisions.get(key) !== fileRevision) return;
    const persisted = { ...draft, privateImageAttachments: draft.privateImageAttachments.map(item => item.storageRef
      ? { ...item, previewUrl: "", sourceFile: undefined, status: "pending" as const, error: undefined }
      : item) };
    const transaction = store.transaction("drafts", "readwrite");
    transaction.onerror = event => event.preventDefault();
    transaction.objectStore("drafts").put(persisted, key);
  }).catch(() => undefined);
}
