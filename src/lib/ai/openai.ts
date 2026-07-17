import "server-only";
import OpenAI from "openai";
import type { ImageQuality, ImageSize } from "@/lib/tools/registry";

// "chatgpt image 2.0" == gpt-image-2 (OpenAI's flagship image model).
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

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

// Generate one or more images. Returns base64-encoded PNG strings (gpt-image
// models return b64_json by default — no expiring URLs).
export async function generateImages(opts: {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
}): Promise<string[]> {
  const params = {
    model: IMAGE_MODEL,
    prompt: opts.prompt,
    size: opts.size ?? "1024x1024",
    quality: opts.quality ?? "high",
    n: Math.min(Math.max(opts.n ?? 1, 1), 4),
  } as unknown as OpenAI.ImageGenerateParams;

  // The generate() overload can return a Stream union; we always request the
  // non-streaming form, so narrow the result to the images response shape.
  const res = (await client().images.generate(params)) as unknown as {
    data?: Array<{ b64_json?: string }>;
  };

  const list = res.data ?? [];
  return list
    .map((d) => d.b64_json)
    .filter((b): b is string => typeof b === "string" && b.length > 0);
}
