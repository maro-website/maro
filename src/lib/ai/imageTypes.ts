import type { ImageQuality, ImageSize, ToolId } from "@/lib/tools/registry";

export interface AiImageRequest {
  toolId: ToolId;
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  /** Optional reference images as data URLs (used as extra prompt context). */
  attachments?: string[];
  /** Product variant (e.g. logo package) — legacy. */
  variant?: string;
  /** Selected options per setting id (drives cost + prompt composition). */
  selections?: Record<string, string>;
}

export interface AiImageResponse {
  images: string[]; // public URLs
  creditsSpent: number;
}
