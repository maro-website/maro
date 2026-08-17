import "server-only";
import OpenAI, { toFile } from "openai";
import type { ImageQuality, ImageSize } from "@/lib/tools/registry";
import { MODULE_LIMITS } from "@/lib/generation/limits";

// "chatgpt image 2.0" == gpt-image-2 (OpenAI's flagship image model).
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

/** Wall-clock budget for a single OpenAI image generate/edit call. */
export const OPENAI_TIMEOUT_MS =
  parseInt(process.env.OPENAI_TIMEOUT_MS || "", 10) || MODULE_LIMITS.image.timeoutMs;

export class OpenAIImageError extends Error {
  code: string;
  detail: string;
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
  if (!cached) cached = new OpenAI({ apiKey });
  return cached;
}

function extractB64Images(res: { data?: Array<{ b64_json?: string }> }): string[] {
  return (res.data ?? [])
    .map((d) => d.b64_json)
    .filter((b): b is string => typeof b === "string" && b.length > 0);
}

async function withOpenAITimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs = OPENAI_TIMEOUT_MS
): Promise<T> {
  const ac = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, timeoutMs);
  try {
    return await run(ac.signal);
  } catch (err) {
    if (timedOut || (err as Error)?.name === "AbortError") {
      throw new OpenAIImageError(
        "timeout",
        `exceeded ${Math.round(timeoutMs / 1000)}s time budget`
      );
    }
    if (err instanceof OpenAIImageError) throw err;
    const message = (err as Error)?.message ?? "openai_failed";
    throw new OpenAIImageError("provider_failed", message);
  } finally {
    clearTimeout(timer);
  }
}

// Generate one or more images. Returns base64-encoded PNG strings (gpt-image
// models return b64_json by default — no expiring URLs).
export async function generateImages(opts: {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  timeoutMs?: number;
}): Promise<string[]> {
  const params = {
    model: IMAGE_MODEL,
    prompt: opts.prompt,
    size: opts.size ?? "1024x1024",
    quality: opts.quality ?? "high",
    n: Math.min(Math.max(opts.n ?? 1, 1), 4),
  } as unknown as OpenAI.ImageGenerateParams;

  const res = await withOpenAITimeout(async (signal) => {
    return (await client().images.generate(params, { signal })) as unknown as {
      data?: Array<{ b64_json?: string }>;
    };
  }, opts.timeoutMs);

  const images = extractB64Images(res);
  if (!images.length) {
    throw new OpenAIImageError("empty", "openai returned no image data");
  }
  return images;
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
  prompt: string;
  images: string[];
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  timeoutMs?: number;
}): Promise<string[]> {
  const files = await Promise.all(
    opts.images.slice(0, 4).map((d, i) => dataUrlToFile(d, i))
  );

  const params = {
    model: IMAGE_MODEL,
    prompt: opts.prompt,
    image: files,
    size: opts.size ?? "1024x1024",
    quality: opts.quality ?? "high",
    n: Math.min(Math.max(opts.n ?? 1, 1), 4),
  } as unknown as OpenAI.ImageEditParams;

  const res = await withOpenAITimeout(async (signal) => {
    return (await client().images.edit(params, { signal })) as unknown as {
      data?: Array<{ b64_json?: string }>;
    };
  }, opts.timeoutMs);

  const images = extractB64Images(res);
  if (!images.length) {
    throw new OpenAIImageError("empty", "openai returned no image data");
  }
  return images;
}
