import { z } from "zod";
import { categoryIds, contentTypes, briefSchema } from "./model";
import type { PrivateImageAttachment } from "@/lib/services/privateImageAttachment";

const draftSchema = z.object({
  version: z.literal(1), updatedAt: z.number().finite(),
  brief: briefSchema.extend({ brand: z.string().max(120), description: z.string().max(1800) }), brain: z.boolean(), category: z.enum(categoryIds), contentType: z.enum(contentTypes), textMode: z.boolean(),
  designDraft: z.object({
    name: z.string().max(100).optional(), headlines: z.array(z.string().max(60)).length(9).optional(),
    font: z.enum(["", "inter", "manrope", "playfair"]), format: z.enum(["", "1:1", "4:5", "9:16"]),
    logoPosition: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]),
    assets: z.record(z.string().max(1300), z.object({ role: z.enum(["product", "logo", "style"]), label: z.string().max(100) }).strict()).refine(value => Object.keys(value).length <= 10),
    assignments: z.array(z.array(z.number().int().min(0).max(9)).min(1).max(10)).length(9).optional(),
  }).strict(),
  attachments: z.array(z.object({ id: z.string().min(1).max(1300), name: z.string().min(1).max(200), storageRef: z.string().max(1024).optional() }).strict()).max(10),
  pending: z.object({ requestId: z.uuid(), startedAt: z.number().finite() }).strict().nullable(),
}).strict();
export type FeedDraft = z.infer<typeof draftSchema>;
export type PendingFeedRequest = NonNullable<FeedDraft["pending"]>;
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const feedDraftKey = (userId: string, workspaceId: string) => `maro.feed.draft.v1:${encodeURIComponent(userId)}:${encodeURIComponent(workspaceId)}`;

/** Never persist files, data URLs, signed preview URLs or auth tokens. The account/workspace owns its key. */
export function saveFeedDraft(storage: DraftStorage, userId: string, workspaceId: string, draft: FeedDraft) {
  try { const ids = new Set(draft.attachments.map(item => item.id)); const value = draftSchema.parse({ ...draft, designDraft: { ...draft.designDraft, assets: Object.fromEntries(Object.entries(draft.designDraft.assets).filter(([id]) => ids.has(id))) } }); storage.setItem(feedDraftKey(userId, workspaceId), JSON.stringify(value)); return true; } catch { return false; }
}
export function loadFeedDraft(storage: DraftStorage, userId: string, workspaceId: string, now = Date.now()): FeedDraft | null {
  const key = feedDraftKey(userId, workspaceId);
  try {
    const raw = storage.getItem(key); if (!raw) return null;
    if (raw.length > 64_000) throw new Error("draft_too_large");
    const value = draftSchema.parse(JSON.parse(raw));
    if (value.updatedAt < now - 7 * 86400_000 || value.updatedAt > now + 300_000) throw new Error("draft_expired");
    const prefix = `storage:generations/${userId}/`;
    if (value.attachments.some(item => ["__proto__", "constructor", "prototype"].includes(item.id) || item.storageRef && (!item.storageRef.startsWith(prefix) || /[\\%?#\u0000-\u001f\u007f]/.test(item.storageRef) || item.storageRef.slice(prefix.length).split("/").some(part => !part || part === "." || part === "..")))) throw new Error("foreign_draft_asset");
    if (new Set(value.attachments.map(item => item.id)).size !== value.attachments.length) throw new Error("duplicate_draft_asset");
    return value;
  } catch { try { storage.removeItem(key); } catch { /* Storage availability must not block the studio. */ } return null; }
}
export function draftAttachments(attachments: PrivateImageAttachment[]): FeedDraft["attachments"] {
  return attachments.map(({ id, name, storageRef }) => ({ id, name: name.slice(0, 200), ...(storageRef ? { storageRef } : {}) }));
}
