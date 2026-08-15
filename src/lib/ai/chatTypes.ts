// Shared, client-safe types for maro Fjale (the writing/planning assistant).
// No server-only imports here.

export type ChatRole = "user" | "assistant";

export interface ChatMsg {
  role: ChatRole;
  content: string;
}

export interface AiChatRequest {
  /** Current tool for context (e.g. "logo", "reklama", "website"). Optional
   * on the standalone /fjale page (general writing/planning). */
  toolId?: string;
  /** Conversation so far (server caps the history to keep tokens low). */
  messages: ChatMsg[];
  /** Workspace that owns this chat generation (frozen at insert time). */
  workspaceId?: string;
  idempotencyKey?: string;
}

// Max turns of history sent to the model (keeps token cost predictable).
export const CHAT_HISTORY_LIMIT = 12;
