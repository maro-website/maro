"use client";

import { getAccessToken } from "@/lib/supabase/client";
import { InsufficientCreditsError } from "@/lib/services/generationService";
import type { AiImageRequest, AiImageResponse } from "@/lib/ai/imageTypes";

export { InsufficientCreditsError };

export class ImageGenerationError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "ImageGenerationError";
    this.code = code;
    this.status = status;
  }
}

// Generate images via /api/ai/image. Throws InsufficientCreditsError (402) or
// ImageGenerationError on failure so the UI can show a precise message.
export async function generateImages(req: AiImageRequest): Promise<AiImageResponse> {
  const token = await getAccessToken();
  const res = await fetch("/api/ai/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });

  if (res.status === 402) {
    const j = await res.json().catch(() => ({}));
    throw new InsufficientCreditsError(j.needed ?? 0, j.have ?? 0);
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ImageGenerationError(j.error || `http-${res.status}`, res.status);
  }

  return (await res.json()) as AiImageResponse;
}
