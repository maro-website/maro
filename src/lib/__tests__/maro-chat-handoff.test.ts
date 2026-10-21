import { describe, expect, it } from "vitest";
import { parseChatHandoff } from "@/lib/maro-chat/handoff";
const id = "11111111-1111-4111-8111-111111111111", now = 1800000000000;
const data = { ownerId: id, workspaceId: "ws", conversationId: "22222222-2222-4222-8222-222222222222", createdAt: now, image: { title: "Coffee", prompt: "Product hero", format: "ig-story", text: false, useBrain: true, assetId: "brain:photo", storageRef: `storage:generations/${id}/workspace-assets/ws/product.png`, assetName: "Product" } };
describe("maroChat private image setup transfer", () => {
  it("preserves prompt, format, text, Brain and canonical private product reference", () => {
    expect(parseChatHandoff(JSON.stringify(data), id, "ws", data.conversationId, now)).toEqual(data);
    expect(parseChatHandoff(JSON.stringify({ ...data, image: { ...data.image, storageRef: null, assetId: null, assetName: null } }), id, "ws", data.conversationId, now).image.storageRef).toBeNull();
  });
  it("rejects cross-account/workspace/conversation, expired and future transfers or foreign refs", () => {
    for (const patch of [{ ownerId: "other" }, { workspaceId: "other" }, { conversationId: crypto.randomUUID() }, { createdAt: now - 1800001 }, { createdAt: now + 60001 }, { image: { ...data.image, storageRef: "storage:generations/other/secret.png" } }, { image: { ...data.image, storageRef: `storage:generations/${id}/../other/secret.png` } }]) expect(() => parseChatHandoff(JSON.stringify({ ...data, ...patch }), id, "ws", data.conversationId, now)).toThrow();
  });
});
