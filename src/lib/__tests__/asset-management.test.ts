import { describe, expect, it } from "vitest";
import { MARO_IMAGE_URL_MIME, MARO_PRESET_MIME, readInspirationDrop } from "@/lib/modules/imazh/inspiration";
import { withoutCreationAssets } from "@/lib/creations/creationAssets";
import { assetFilename, formatAssetBytes } from "@/lib/services/assetLibrary";
import type { ImageCreation } from "@/lib/types";

const preset = { id: "preset-1", code: "P001", tool: "imazh", targetTool: "reklama", config: { version: 1, format: "ig-story" } };
const drag = (raw: string, image = "https://example.test/preview.png") => ({ getData: (type: string) => type === MARO_PRESET_MIME ? raw : type === MARO_IMAGE_URL_MIME ? image : "" });
describe("preset drag priority", () => {
  it("applies preset metadata when both the preset and its preview are present", () => {
    expect(readInspirationDrop(drag(JSON.stringify(preset)), "reklama")).toMatchObject({ kind: "preset", attach: preset });
  });
  it.each(["invalid-json", JSON.stringify({ ...preset, targetTool: "logo" })])("does not attach the preview of an invalid or incompatible preset", raw => {
    expect(readInspirationDrop(drag(raw), "reklama")).toEqual({ kind: "preset", attach: null });
  });
  it("still supports an ordinary image drag", () => {
    expect(readInspirationDrop(drag(""), "reklama")).toEqual({ kind: "image", url: "https://example.test/preview.png" });
  });
});
describe("individual asset removal", () => {
  it("keeps sibling outputs, their refs, and conversation metadata aligned", () => {
    const creation: ImageCreation = { id: "generation", conversationId: "chat-1", toolId: "reklama", prompt: "campaign", createdAt: "2026-10-03",
      urls: ["https://signed/a", "https://signed/b", "https://signed/c"], storageRefs: ["storage:a", "storage:b", "storage:c"] };
    expect(withoutCreationAssets(creation, new Set(["storage:b"]))).toEqual({ ...creation, urls: ["https://signed/a", "https://signed/c"], storageRefs: ["storage:a", "storage:c"] });
    expect(creation.urls).toHaveLength(3);
  });
  it("uses the actual filename without exposing signed URL tokens", () => {
    expect(assetFilename("https://project.test/storage/a%20b.png?token=secret", "fallback")).toBe("a b.png");
    expect(assetFilename("storage:generations/owner/a.png", "fallback")).toBe("a.png");
  });
  it("formats bytes and never claims an unknown size is zero", () => {
    expect(formatAssetBytes(1536)).toBe("1.5 KB");
    expect(formatAssetBytes(2 * 1024 ** 2)).toBe("2 MB");
    expect(formatAssetBytes(null)).toBe("Pa madhësi");
  });
});
