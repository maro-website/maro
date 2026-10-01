"use client";

import { getAccessToken } from "@/lib/supabase/client";
import { aiFetchHeaders, newIdempotencyKey } from "@/lib/client/idempotency";
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

type ImageStreamPayload =
  | { ok: true; images: string[]; creditsSpent?: number; jobId?: string; generationId?: string; storageRefs?: string[] }
  | { ok: false; error?: string; refunded?: boolean; jobId?: string };

export function serializeImageGenerationRequest(req: AiImageRequest, idempotencyKey: string): string {
  if ((req.attachments ?? []).some((ref) => ref.startsWith("data:image/") || ref.startsWith("blob:"))) {
    throw new ImageGenerationError("reference_not_uploaded", 400);
  }
  return JSON.stringify({ ...req, idempotencyKey });
}

async function readImageStream(res: Response): Promise<AiImageResponse> {
  if (!res.body) throw new ImageGenerationError("ai-failed", 502);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let lastError: ImageGenerationError | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    let sep = buf.indexOf("\n\n");
    while (sep !== -1) {
      const chunk = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6)) as ImageStreamPayload;
        if (payload.ok) {
          return {
            images: payload.images,
            creditsSpent: payload.creditsSpent ?? 0,
            jobId: payload.jobId,
            generationId: payload.generationId,
            storageRefs: payload.storageRefs,
          };
        }
        lastError = new ImageGenerationError(payload.error || "ai-failed", 502);
      }
      sep = buf.indexOf("\n\n");
    }
  }

  if (lastError) throw lastError;
  throw new ImageGenerationError("ai-failed", 502);
}

// Generate images via /api/ai/image. Throws InsufficientCreditsError (402) or
// ImageGenerationError on failure so the UI can show a precise message.
export async function generateImages(req: AiImageRequest): Promise<AiImageResponse> {
  const token = await getAccessToken();
  const idempotencyKey = req.idempotencyKey ?? newIdempotencyKey("img");
  const res = await fetch("/api/ai/image", {
    method: "POST",
    headers: aiFetchHeaders(token, idempotencyKey),
    body: serializeImageGenerationRequest(req, idempotencyKey),
  });

  if (res.status === 402) {
    const j = await res.json().catch(() => ({}));
    throw new InsufficientCreditsError(j.needed ?? 0, j.have ?? 0);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    if (!res.ok) {
      throw new ImageGenerationError(`http-${res.status}`, res.status);
    }
    return readImageStream(res);
  }

  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ImageGenerationError(j.error || `http-${res.status}`, res.status);
  }

  return (await res.json()) as AiImageResponse;
}
