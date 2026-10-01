"use client";

import { getAccessToken } from "@/lib/supabase/client";
import { aiFetchHeaders, newIdempotencyKey } from "@/lib/client/idempotency";
import { InsufficientCreditsError } from "@/lib/services/generationService";
import type { AiImageRequest, AiImageResponse } from "@/lib/ai/imageTypes";

export { InsufficientCreditsError };

export interface ImageErrorDiagnostics {
  field?: string;
  requestId?: string;
  jobId?: string;
  userPromptLength?: number;
  compiledPromptLength?: number;
  maxCompiledPromptLength?: number;
  maxUserPromptLength?: number;
}

function safeDiagnostics(value: unknown): ImageErrorDiagnostics {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: Record<string, string | number> = {};
  for (const key of ["field", "requestId", "jobId"]) {
    if (typeof raw[key] === "string" && raw[key].length <= 128) result[key] = raw[key];
  }
  for (const key of ["userPromptLength", "compiledPromptLength", "maxCompiledPromptLength", "maxUserPromptLength"]) {
    if (typeof raw[key] === "number" && Number.isSafeInteger(raw[key]) && raw[key] >= 0) result[key] = raw[key];
  }
  return result;
}

export class ImageGenerationError extends Error {
  code: string;
  status: number;
  field?: string;
  diagnostics: ImageErrorDiagnostics;
  constructor(code: string, status: number, details?: unknown) {
    const raw = details && typeof details === "object" ? details as Record<string, unknown> : {};
    super(typeof raw.message === "string" ? raw.message.slice(0, 500) : code);
    this.name = "ImageGenerationError";
    this.code = code;
    this.status = status;
    this.diagnostics = safeDiagnostics(details);
    this.field = this.diagnostics.field;
  }
}

function responseError(payload: unknown, status: number, requestId?: string | null) {
  const raw = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const code = typeof raw.error === "string" ? raw.error : typeof raw.code === "string" ? raw.code : `http-${status}`;
  const error = new ImageGenerationError(code, status, { requestId, ...raw });
  // Deliberately omit messages, private input and arbitrary response properties.
  console.warn("[image_request_failed]", { code: error.code, status, ...error.diagnostics });
  return error;
}

type ImageStreamPayload =
  | { event: "generation_started"; jobId: string; requestId?: string }
  | { ok: true; images: string[]; creditsSpent?: number; jobId?: string; generationId?: string; storageRefs?: string[] }
  | { ok: false; error?: string; detail?: string; refunded?: boolean; jobId?: string };

export function serializeImageGenerationRequest(req: AiImageRequest, idempotencyKey: string): string {
  if ((req.attachments ?? []).some((ref) => ref.startsWith("data:image/") || ref.startsWith("blob:"))) {
    throw new ImageGenerationError("reference_not_uploaded", 400);
  }
  return JSON.stringify({ ...req, idempotencyKey });
}

async function readImageStream(res: Response, onStarted: () => void): Promise<AiImageResponse> {
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
        if ("event" in payload) {
          if (payload.event === "generation_started") onStarted();
          continue;
        }
        if (payload.ok) {
          onStarted(); // Compatibility with servers that return only a final result.
          return {
            images: payload.images,
            creditsSpent: payload.creditsSpent ?? 0,
            jobId: payload.jobId,
            generationId: payload.generationId,
            storageRefs: payload.storageRefs,
          };
        }
        lastError = responseError(payload, 502, res.headers.get("x-request-id"));
      }
      sep = buf.indexOf("\n\n");
    }
  }

  if (lastError) throw lastError;
  throw new ImageGenerationError("ai-failed", 502);
}

// Generate images via /api/ai/image. Throws InsufficientCreditsError (402) or
// ImageGenerationError on failure so the UI can show a precise message.
export async function generateImages(req: AiImageRequest, options?: { onStarted?: () => void }): Promise<AiImageResponse> {
  let started = false;
  const onStarted = () => {
    if (started) return;
    started = true;
    options?.onStarted?.();
  };
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
    return readImageStream(res, onStarted);
  }

  if (!res.ok) {
    const j: unknown = await res.json().catch(() => ({}));
    throw responseError(j, res.status, res.headers.get("x-request-id"));
  }

  const result = (await res.json()) as AiImageResponse;
  onStarted();
  return result;
}
