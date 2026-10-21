import { handoffSchema } from "./model";
/** Scope the browser transfer to the authenticated owner, workspace and new image conversation. */
export function parseChatHandoff(raw: string, ownerId: string, workspaceId: string, conversationId: string, now = Date.now()) {
  const setup = handoffSchema.parse(JSON.parse(raw));
  if (setup.ownerId !== ownerId || setup.workspaceId !== workspaceId || setup.conversationId !== conversationId || now - setup.createdAt > 30 * 60_000 || setup.createdAt > now + 60_000) throw new Error("invalid_handoff");
  if (setup.image.storageRef && (!setup.image.storageRef.startsWith(`storage:generations/${ownerId}/`) || setup.image.storageRef.split("/").some(part => part === ".." || part === "."))) throw new Error("invalid_handoff");
  return setup;
}
