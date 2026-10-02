import type { ImageCreation } from "@/lib/types";

export interface ConversationJob {
  id: string;
  prompt: string;
  createdAt: string;
  status: "thinking" | "error";
}

export function imageConversationId(creation: ImageCreation) {
  return creation.conversationId ?? creation.serverId ?? creation.id;
}
export function conversationHistory(creations: ImageCreation[], id: string, workspaceId: string) {
  return creations.filter(item => imageConversationId(item) === id && (!item.workspaceId || item.workspaceId === workspaceId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function activeConversationKey(userId: string | undefined, workspaceId: string, toolId: string) {
  return `maro:active-conversation:v1:${encodeURIComponent(userId ?? "guest")}:${encodeURIComponent(workspaceId)}:${toolId}`;
}
