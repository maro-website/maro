import { describe, expect, it, vi } from "vitest";
import { composerDraftKey, currentComposerDraft, emptyComposerDraft, loadComposerDraft, saveComposerDraft, subscribeComposerDraft } from "@/lib/services/composerDraft";
import { createImageDraftAcceptance } from "@/lib/services/imageDraft";
import type { PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { useComposerDraft } from "@/lib/hooks/useComposerDraft";

describe("unsent composer drafts", () => {
  it("keeps the server/initial render empty so a browser draft does not create hydration mismatches", () => {
    const key = composerDraftKey("owner", "workspace", "hydration");
    saveComposerDraft(key, { ...emptyComposerDraft(), prompt: "Existing browser draft" });
    function InitialRender() { const draft = useComposerDraft(key); return React.createElement("span", null, draft.prompt.length); }
    expect(renderToString(React.createElement(InitialRender))).toBe("<span>0</span>");
  });
  it("does not cancel a queued attachment disk save when the user immediately keeps typing", async () => {
    vi.resetModules();
    const put = vi.fn();
    const request = { result: { transaction: () => ({ objectStore: () => ({ put }), onerror: null }) }, onsuccess: undefined as (() => void) | undefined };
    vi.stubGlobal("indexedDB", { open: () => request });
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
    try {
      const drafts = await import("@/lib/services/composerDraft");
      const key = drafts.composerDraftKey("owner", "workspace", "queued-disk-write");
      const snapshot = { ...drafts.emptyComposerDraft(), prompt: "Before", privateImageAttachments: [{ id: "file", name: "File", previewUrl: "https://short-lived", storageRef: "storage:generations/owner/file.png", status: "ready" as const }] };
      drafts.saveComposerDraft(key, snapshot);
      drafts.saveComposerDraft(key, { ...snapshot, prompt: "Typed immediately" });
      request.onsuccess?.();
      await Promise.resolve(); await Promise.resolve();
      expect(put).toHaveBeenCalledOnce();
      expect(put.mock.calls[0][0].privateImageAttachments[0]).toMatchObject({ storageRef: "storage:generations/owner/file.png", previewUrl: "", status: "pending" });
      expect(drafts.currentComposerDraft(key).prompt).toBe("Typed immediately");
    } finally { vi.unstubAllGlobals(); }
  });
  it("updates a remounted composer when an earlier upload finishes, without leaking to another workspace", () => {
    const key = composerDraftKey("owner", "workspace", "late-upload");
    const listener = vi.fn(), other = vi.fn();
    const unsubscribe = subscribeComposerDraft(key, listener);
    const stopOther = subscribeComposerDraft(composerDraftKey("owner", "other", "late-upload"), other);
    saveComposerDraft(key, { ...emptyComposerDraft(), prompt: "Unsent draft" });
    expect(listener).toHaveBeenCalledOnce(); expect(other).not.toHaveBeenCalled();
    unsubscribe(); stopOther();
    saveComposerDraft(key, emptyComposerDraft()); expect(listener).toHaveBeenCalledOnce();
  });
  it("isolates drafts by account, workspace, and tool", async () => {
    const key = composerDraftKey("owner", "workspace", "reklama");
    const draft = { ...emptyComposerDraft(), prompt: "Mos e fshi këtë draft", privateImageAttachments: [{ id: "ref-1", name: "Product", previewUrl: "https://signed/preview", storageRef: "storage:generations/owner/product.png", status: "ready" as const }] };
    saveComposerDraft(key, draft);
    expect(await loadComposerDraft(key)).toEqual(draft);
    expect(currentComposerDraft(composerDraftKey("other", "workspace", "reklama")).prompt).toBe("");
    expect(currentComposerDraft(composerDraftKey("owner", "other", "reklama")).prompt).toBe("");
    expect(currentComposerDraft(composerDraftKey("owner", "workspace", "website")).prompt).toBe("");
  });
  it("saves text synchronously, without putting file bytes or signed previews in localStorage", () => {
    const setItem = vi.fn(); vi.stubGlobal("localStorage", { getItem: () => null, setItem });
    const key = composerDraftKey("owner", "workspace", "sync");
    saveComposerDraft(key, { ...emptyComposerDraft(), prompt: "Saved now", attachments: ["data:image/png;base64,LARGE_PRIVATE_BYTES"] });
    expect(setItem).toHaveBeenCalledExactlyOnceWith(key, JSON.stringify({ prompt: "Saved now", promptAttach: null }));
    vi.unstubAllGlobals();
  });
  it("clears only a submitted draft after explicit admission and keeps newer typing/files", () => {
    const key = composerDraftKey("owner", "workspace", "submission");
    const sent: PrivateImageAttachment = { id: "sent", name: "Sent", status: "ready", previewUrl: "preview" };
    saveComposerDraft(key, { ...emptyComposerDraft(), prompt: "Submitted", privateImageAttachments: [sent] });
    const accepted = createImageDraftAcceptance({ prompt: "Submitted", attachments: [sent],
      setPrompt: update => saveComposerDraft(key, { ...currentComposerDraft(key), prompt: update(currentComposerDraft(key).prompt) }),
      setAttachments: update => saveComposerDraft(key, { ...currentComposerDraft(key), privateImageAttachments: update(currentComposerDraft(key).privateImageAttachments) }),
    });
    expect(currentComposerDraft(key).prompt).toBe("Submitted");
    saveComposerDraft(key, { ...currentComposerDraft(key), prompt: "Next prompt", privateImageAttachments: [sent, { ...sent, id: "next" }] });
    accepted(); accepted();
    expect(currentComposerDraft(key).prompt).toBe("Next prompt");
    expect(currentComposerDraft(key).privateImageAttachments.map(item => item.id)).toEqual(["next"]);
  });
});
