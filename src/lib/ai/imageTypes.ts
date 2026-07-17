import type { ImageQuality, ImageSize, ToolId } from "@/lib/tools/registry";

export interface AiImageRequest {
  toolId: ToolId;
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
}

export interface AiImageResponse {
  images: string[]; // public URLs
  creditsSpent: number;
}
