import { describe, it, expect } from "vitest";
import { draftAttachments, feedDraftKey, loadFeedDraft, saveFeedDraft, type FeedDraft } from "@/lib/feed/draft";

const owner = "11111111-1111-4111-8111-111111111111", now = Date.now();
const value = (): FeedDraft => ({ version: 1, updatedAt: now, brief: { brand: "", description: "", audience: "", goal: "sales", language: "sq", colors: "", notes: "Christmas themed" }, brain: true, category: "drinks", contentType: "mix", textMode: true, designDraft: { format: "", logoPosition: "bottom-left", assets: { product: { role: "product", label: "Original" } } }, attachments: [{ id: "product", name: "Original.png", storageRef: `storage:generations/${owner}/refs/original.png` }], pending: { requestId: crypto.randomUUID(), startedAt: now } });
function storage() { const rows = new Map<string, string>(); return { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, data: string) => { rows.set(key, data); }, removeItem: (key: string) => { rows.delete(key); } }; }

describe("Feed session preparation recovery", () => {
  it("recovers an incomplete Brain draft and the exact pending request, scoped to its account and workspace", () => {
    const store = storage(), draft = value();
    expect(saveFeedDraft(store, owner, "workspace", draft)).toBe(true);
    expect(loadFeedDraft(store, owner, "workspace", now)).toEqual(draft);
    expect(loadFeedDraft(store, "other-user", "workspace", now)).toBeNull();
    expect(loadFeedDraft(store, owner, "other-workspace", now)).toBeNull();
  });
  it("restores an old font-bearing draft without making font selection a requirement", () => {
    const store = storage(), draft = value(); draft.designDraft.font = "manrope";
    expect(saveFeedDraft(store, owner, "workspace", draft)).toBe(true);
    expect(loadFeedDraft(store, owner, "workspace", now)?.designDraft.format).toBe("");
    expect(loadFeedDraft(store, owner, "workspace", now)?.pending).toEqual(draft.pending);
  });
  it("persists only stable reference metadata, retains an interrupted upload and excludes signed URLs and files", () => {
    const items = draftAttachments([{ id: "product", name: "Original.png", previewUrl: "https://private.test/signed?token=secret", storageRef: value().attachments[0].storageRef, status: "ready" }, { id: "interrupted", name: "Interrupted.png", previewUrl: "blob:private", status: "uploading" }]);
    expect(JSON.stringify(items)).not.toMatch(/token|https:|blob:|previewUrl|sourceFile/);
    const store = storage(), draft = { ...value(), attachments: items };
    expect(saveFeedDraft(store, owner, "workspace", draft)).toBe(true);
    expect(loadFeedDraft(store, owner, "workspace", now)?.attachments[1]).toEqual({ id: "interrupted", name: "Interrupted.png" });
  });
  it.each([`storage:generations/other/refs/a.png`, `storage:generations/${owner}/refs/../a.png`, `storage:generations/${owner}/refs/%2e%2e/a.png`, "https://private.test/signed?token=secret"])("rejects foreign or noncanonical persisted asset %s", storageRef => {
    const store = storage(), draft = value(); draft.attachments[0].storageRef = storageRef;
    store.setItem(feedDraftKey(owner, "workspace"), JSON.stringify(draft));
    expect(loadFeedDraft(store, owner, "workspace", now)).toBeNull();
    expect(store.getItem(feedDraftKey(owner, "workspace"))).toBeNull();
  });
  it("expires stale drafts and discards removed reference roles before saving", () => {
    const store = storage(), draft = value(); draft.designDraft.assets.removed = { role: "logo", label: "Removed" };
    expect(saveFeedDraft(store, owner, "workspace", draft)).toBe(true);
    expect(loadFeedDraft(store, owner, "workspace", now)?.designDraft.assets).not.toHaveProperty("removed");
    expect(loadFeedDraft(store, owner, "workspace", now + 8 * 86400_000)).toBeNull();
  });
});
