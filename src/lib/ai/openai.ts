import "server-only";
import OpenAI, { toFile } from "openai";
import { buildImageObservation, type ImageObservationCallback } from "./imageObservation";
import type { ImageQuality, ImageSize } from "@/lib/tools/registry";
import { MODULE_LIMITS } from "@/lib/generation/limits";

/** Wall-clock budget for a single OpenAI image generate/edit call. */
export const OPENAI_TIMEOUT_MS =
  parseInt(process.env.OPENAI_TIMEOUT_MS || "", 10) || MODULE_LIMITS.image.timeoutMs;

export class OpenAIImageError extends Error {
  code: string;
  detail: string;
  requestId?: string;
  providerCode?: string;
  status?: number;
  constructor(code: string, detail = "") {
    super(code);
    this.name = "OpenAIImageError";
    this.code = code;
    this.detail = detail;
  }
}

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let cached: OpenAI | null = null;
function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("NO_OPENAI_KEY");
  if (!cached) cached = new OpenAI({ apiKey, maxRetries: 0 });
  return cached;
}

function extractB64Images(res: { data?: Array<{ b64_json?: string }> }): string[] {
  return (res.data ?? [])
    .map((d) => d.b64_json)
    .filter((b): b is string => typeof b === "string" && b.length > 0);
}

function linkExternalAbort(ac: AbortController, external?: AbortSignal): () => void {
  if (!external) return () => undefined;
  if (external.aborted) {
    ac.abort();
    return () => undefined;
  }
  const onAbort = () => ac.abort();
  external.addEventListener("abort", onAbort);
  return () => external.removeEventListener("abort", onAbort);
}

async function withOpenAITimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs = OPENAI_TIMEOUT_MS,
  externalSignal?: AbortSignal
): Promise<T> {
  const ac = new AbortController();
  const unlinkExternal = linkExternalAbort(ac, externalSignal);
  let timedOut = false;
  let clientAborted = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, timeoutMs);
  if (externalSignal?.aborted) clientAborted = true;
  else if (externalSignal) {
    externalSignal.addEventListener(
      "abort",
      () => {
        clientAborted = true;
      },
      { once: true }
    );
  }
  try {
    if (ac.signal.aborted) {
      if (clientAborted && !timedOut) {
        throw new OpenAIImageError("client_disconnect", "client disconnected");
      }
      throw new OpenAIImageError(
        "timeout",
        `exceeded ${Math.round(timeoutMs / 1000)}s time budget`
      );
    }
    return await run(ac.signal);
  } catch (err) {
    if (clientAborted && !timedOut) {
      throw new OpenAIImageError("client_disconnect", "client disconnected");
    }
    if (timedOut || (err as Error)?.name === "AbortError") {
      throw new OpenAIImageError(
        "timeout",
        `exceeded ${Math.round(timeoutMs / 1000)}s time budget`
      );
    }
    if (err instanceof OpenAIImageError) throw err;
    const message = (err as Error)?.message ?? "openai_failed";
    const wrapped = new OpenAIImageError("provider_failed", message);
    const source = err as { requestID?: string; request_id?: string; code?: string; status?: number };
    wrapped.requestId = source.requestID ?? source.request_id;
    wrapped.providerCode = source.code;
    wrapped.status = source.status;
    throw wrapped;
  } finally {
    unlinkExternal();
    clearTimeout(timer);
  }
}

// Generate one or more images. Returns base64-encoded PNG strings (gpt-image
// models return b64_json by default — no expiring URLs).
export async function generateImages(opts: {
  model: string;
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  onObservation?: ImageObservationCallback;
}): Promise<string[]> {
  const params = {
    model: opts.model,
    prompt: opts.prompt,
    size: opts.size ?? "1024x1024",
    quality: opts.quality ?? "high",
    n: Math.min(Math.max(opts.n ?? 1, 1), 4),
  } as unknown as OpenAI.ImageGenerateParams;

  return observedImages(opts, "generate", 0, async () => withOpenAITimeout(
    async (signal) => await client().images.generate(params, { signal }) as unknown as ImageResponse,
    opts.timeoutMs, opts.abortSignal
  ));
}

// Convert a data URL ("data:image/png;base64,....") into an OpenAI upload File.
async function dataUrlToFile(dataUrl: string, index: number) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  const mime = match?.[1] ?? "image/png";
  const b64 = match?.[2] ?? dataUrl;
  const ext = mime.split("/")[1]?.split("+")[0] || "png";
  const buffer = Buffer.from(b64, "base64");
  return toFile(buffer, `ref-${index}.${ext}`, { type: mime });
}

// Generate images using one or more reference images as extra context
// (gpt-image edit endpoint). References are data URLs.
export async function editImages(opts: {
  model: string;
  prompt: string;
  images: string[];
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  onObservation?: ImageObservationCallback;
}): Promise<string[]> {
  const files = await Promise.all(
    opts.images.slice(0, 4).map((d, i) => dataUrlToFile(d, i))
  );

  const params = {
    model: opts.model,
    prompt: opts.prompt,
    image: files,
    size: opts.size ?? "1024x1024",
    quality: opts.quality ?? "high",
    n: Math.min(Math.max(opts.n ?? 1, 1), 4),
  } as unknown as OpenAI.ImageEditParams;

  return observedImages(opts, "edit", files.length, async () => withOpenAITimeout(
    async (signal) => await client().images.edit(params, { signal }) as unknown as ImageResponse,
    opts.timeoutMs, opts.abortSignal
  ));
}


type ImageResponse = Record<string, unknown> & { data?: Array<{ b64_json?: string }> };
async function observedImages(
  opts: { model: string; prompt: string; size?: string; quality?: string; n?: number; onObservation?: ImageObservationCallback },
  operation: "generate" | "edit", referenceCount: number, run: () => Promise<ImageResponse>
): Promise<string[]> {
  const startedAt = new Date().toISOString();
  let response: ImageResponse | undefined;
  let failure: unknown;
  try {
    response = await run();
    const images = extractB64Images(response);
    if (!images.length) throw new OpenAIImageError("empty", "openai returned no image data");
    return images;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (opts.onObservation) {
      const observation = buildImageObservation({ ...opts, operation, referenceCount, startedAt, response, error: failure });
      // Observability must not turn a completed provider request into a retry/fallback.
      try { await opts.onObservation(observation); }
      catch { console.error("[ai/image] provider observation could not be persisted"); }
    }
  }
}
