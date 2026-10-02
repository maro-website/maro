import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { conversationHistory, activeConversationKey } from "@/lib/creations/conversations";
import { imageOutputBytes } from "@/lib/generation/imageOutputFormat";
import { parseV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { normalizeUsername } from "@/lib/profiles/username";
import { logoRequest } from "./helpers/v1ImageFixtures";
import type { ImageCreation } from "@/lib/types";
const chat = "44444444-4444-4444-8444-444444444444";
const creation = (id: string, conversationId: string, workspaceId = "a"): ImageCreation => ({ id, conversationId, workspaceId, prompt: id, toolId: "reklama", urls: ["image.png"], createdAt: id });
describe("durable chat grouping and input boundaries", () => {
  it("groups two generations in the same chat without including another chat/workspace", () => {
    const items = [creation("02", "chat-1"), creation("03", "chat-2"), creation("01", "chat-1"), creation("04", "chat-1", "b")];
    expect(conversationHistory(items, "chat-1", "a").map(row => row.id)).toEqual(["01", "02"]);
  });
  it("keeps active chats isolated by user, workspace and tool", () => {
    expect(new Set([activeConversationKey("a", "w", "logo"), activeConversationKey("b", "w", "logo"), activeConversationKey("a", "v", "logo"), activeConversationKey("a", "w", "reklama")]).size).toBe(4);
  });
  it("accepts a canonical UUID and rejects arbitrary conversation filters", () => {
    expect(parseV1ImageRequest({ toolId: "reklama", prompt: "Image", conversationId: chat }).conversationId).toBe(chat);
    expect(() => parseV1ImageRequest({ toolId: "reklama", prompt: "Image", conversationId: "other),id.eq.inject" })).toThrow();
  });
  it("accepts a logo follow-up with its original wizard and rejects revision on an unrelated tool", () => {
    expect(parseV1ImageRequest({ ...logoRequest(), conversationId: chat, revision: "Change the initials to AB" }).prompt).toBe("Change the initials to AB");
    expect(() => parseV1ImageRequest({ toolId: "reklama", prompt: "Image", conversationId: chat, revision: "Injected" })).toThrow("invalid_revision");
  });
  it("normalizes public handles and denies reserved names/unsafe paths", () => {
    expect(normalizeUsername(" @Erzenology ")).toBe("erzenology");
    for (const name of ["admin", "../person", "a", "spaces here", "x".repeat(31), null]) expect(normalizeUsername(name)).toBeNull();
  });
});
describe("4:3 is a real output format", () => {
  it("uses a supported provider size while recording the selected 4:3 attribute", () => {
    const parsed = parseV1ImageRequest({ toolId: "reklama", prompt: "Image", selections: { format: "4:3" } });
    expect(parsed.size).toBe("1536x1024");
    expect(parsed.selections.format).toBe("4:3");
  });
  it("frames output to exact 4:3 without upscaling and preserves other formats", async () => {
    const original = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "blue" } }).png().toBuffer();
    const result = await sharp(await imageOutputBytes(original, "4:3")).metadata();
    expect(result.width! / result.height!).toBe(4 / 3);
    expect(result.width).toBeLessThanOrEqual(1536);
    expect(result.height).toBeLessThanOrEqual(1024);
    const standard = await sharp(await imageOutputBytes(original, "wide")).metadata();
    expect([standard.width, standard.height]).toEqual([1536, 1024]);
  });
});
