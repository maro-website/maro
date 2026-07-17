import type { ImageQuality, ImageSize, ToolId } from "@/lib/tools/registry";

export interface AiImageRequest {
  toolId: ToolId;
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  /** Optional reference images as data URLs (used as extra prompt context). */
  attachments?: string[];
}

export interface AiImageResponse {
  images: string[]; // public URLs
  creditsSpent: number;
}
