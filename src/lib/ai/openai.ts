import "server-only";
import OpenAI, { toFile } from "openai";
import type { ImageQuality, ImageSize } from "@/lib/tools/registry";
import type { ChatMsg } from "@/lib/ai/chatTypes";

// "chatgpt image 2.0" == gpt-image-2 (OpenAI's flagship image model).
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

// Small, fast, cheap chat model powering maro Fjale (the writing assistant).
export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// maro Fjalë may use a dedicated key (OPENAI_CHAT_API_KEY) for separate billing;
// falls back to the shared OPENAI_API_KEY.
export function hasChatKey(): boolean {
  return Boolean(process.env.OPENAI_CHAT_API_KEY || process.env.OPENAI_API_KEY);
}

let cached: OpenAI | null = null;
function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("NO_OPENAI_KEY");
  if (!cached) cached = new OpenAI({ apiKey });
  return cached;
}

let cachedChat: OpenAI | null = null;
function chatClient(): OpenAI {
  const apiKey = process.env.OPENAI_CHAT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("NO_OPENAI_KEY");
  if (!cachedChat) cachedChat = new OpenAI({ apiKey });
  return cachedChat;
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

// Stream a chat completion as text deltas (maro Fjale assistant). Yields token
// chunks as they arrive so the UI can render a live "typing" reply.
export async function* streamChat(opts: {
  system: string;
  messages: ChatMsg[];
  model?: string;
}): AsyncGenerator<string, void, unknown> {
  const stream = await chatClient().chat.completions.create({
    model: opts.model || CHAT_MODEL,
    stream: true,
    temperature: 0.7,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// Non-streaming chat completion (fallback when streaming fails on the host).
export async function completeChat(opts: {
  system: string;
  messages: ChatMsg[];
  model?: string;
}): Promise<string> {
  const res = await chatClient().chat.completions.create({
    model: opts.model || CHAT_MODEL,
    temperature: 0.7,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  return res.choices?.[0]?.message?.content ?? "";
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

  const res = (await client().images.edit(params)) as unknown as {
    data?: Array<{ b64_json?: string }>;
  };

  const list = res.data ?? [];
  return list
    .map((d) => d.b64_json)
    .filter((b): b is string => typeof b === "string" && b.length > 0);
}
