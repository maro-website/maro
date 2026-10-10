import { describe, expect, it } from "vitest";
import { emptyComposerDraft, newConversationDraft } from "@/lib/services/composerDraft";
import { buildExploreRemix } from "@/lib/explore/remix";
import { presetInitialPrompt } from "@/lib/presets/model";
import type { PromptAttach } from "@/lib/prompts/types";
const preset = { id: "preset", tool: "imazh", targetTool: "reklama", config: { version: 1 } } as PromptAttach;
const image = { id: "creation", tool_id: "logo", prompt: "Private original", url: "https://example.invalid/public.png", author: "Owner", created_at: "2026-10-10", show_prompt: false, selections: { private: "settings" } };
describe("preset and Explore conversation drafts", () => {
  it("preserves the preset and edited prompt in a new conversation, without old files", () => {
    const next = newConversationDraft({ ...emptyComposerDraft(), promptAttach: preset, prompt: "My own brief", attachments: ["old-output"], privateImageAttachments: [{ id: "old", name: "old", storageRef: "storage:generations/owner/old.png", previewUrl: "https://signed.invalid/old", status: "ready" }] });
    expect(next).toEqual({ ...emptyComposerDraft(), promptAttach: preset, prompt: "My own brief" });
    expect(newConversationDraft({ ...emptyComposerDraft(), promptAttach: preset }).prompt).toBe("maro");
    expect(newConversationDraft({ ...emptyComposerDraft(), prompt: "Unrelated old prompt" })).toEqual(emptyComposerDraft());
  });
  it("gives image and logo presets a visible default prompt", () => {
    expect(presetInitialPrompt("imazh", { version: 1 })).toBe("maro"); expect(presetInitialPrompt("logo", { version: 1 })).toBe("maro");
    expect(presetInitialPrompt("imazh", { version: 1, initialPrompt: " Specific brief " })).toBe("Specific brief");
  });
  it("remixes a private preview only as an image, without private prompts or settings", () => {
    expect(buildExploreRemix(image)).toEqual({ toolId: "reklama", remixOf: "creation", prompt: "maro", imageUrl: image.url });
    expect(JSON.stringify(buildExploreRemix(image))).not.toContain("Private original"); expect(JSON.stringify(buildExploreRemix(image))).not.toContain("settings");
  });
  it("copies only a publicly visible nonempty prompt and makes an empty public prompt a reference remix", () => {
    expect(buildExploreRemix({ ...image, show_prompt: true, prompt: " Public brief " })).toEqual({ toolId: "reklama", remixOf: "creation", prompt: "Public brief" });
    expect(buildExploreRemix({ ...image, show_prompt: true, prompt: " " }).imageUrl).toBe(image.url);
  });
});
