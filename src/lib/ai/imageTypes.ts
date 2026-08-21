import type { ImageQuality, ImageSize, ToolId } from "@/lib/tools/registry";
import type { FortPayload } from "@/lib/fort/types";

export interface AiImageRequest {
  toolId: ToolId;
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  /** Canonical private `storage:generations/...` image references. */
  attachments?: string[];
  /** Product variant (e.g. logo package) — legacy. */
  variant?: string;
  /** Selected options per setting id (drives cost + prompt composition). */
  selections?: Record<string, string>;
  /** maroFort expert payload (ignored server-side unless the user is entitled). */
  fort?: FortPayload;
  /** maro Prompts: id of an attached curated prompt. The hidden template text
   * is fetched server-side and never sent from the client. */
  maroPrompt?: { id: string };
  /** Workspace that owns this generation (frozen at insert time). */
  workspaceId?: string;
  /** Inject active workspace brand colors/logo into the prompt. */
  useWorkspaceBrand?: boolean;
  idempotencyKey?: string;
}

export interface AiImageResponse {
  images: string[]; // public URLs
  /** Stable database/storage identities; display URLs may expire and change. */
  generationId?: string;
  storageRefs?: string[];
  creditsSpent: number;
  jobId?: string;
}
