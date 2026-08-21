import "server-only";

import { NextResponse } from "next/server";

export const REQUEST_LIMITS = {
  jsonDefault: 64 * 1024,
  jsonAi: 512 * 1024,
  /** maro Fjale chat: up to 12 short turns (text only). */
  jsonAiChat: 512 * 1024,
  /** In-editor section JSON edit (no full HTML page). */
  jsonAiEdit: 512 * 1024,
  jsonWebGenerate: 2 * 1024 * 1024,
  jsonEditHtml: 2 * 1024 * 1024,
  /** maro Zo audio upload JSON (12 MiB client cap + base64 overhead). */
  jsonAiAudio: 16 * 1024 * 1024,
  jsonAvatar: 8 * 1024 * 1024,
  /** Authenticated website asset upload (5 MiB decoded + base64 overhead). */
  jsonProjectAsset: 8 * 1024 * 1024,
  jsonAdminUpload: 10 * 1024 * 1024,
  jsonCreateOrder: 32 * 1024,
  jsonTrack: 8 * 1024,
  jsonPromoTrack: 4 * 1024,
  promptChars: 4000,
  trackPromptChars: 200,
  billingFieldMax: 200,
  promoCodeMax: 64,
  orderIdMax: 64,
} as const;

export type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; response: NextResponse };

export async function readJsonBody(
  req: Request,
  maxBytes: number
): Promise<JsonBodyResult> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "payload_too_large" }, { status: 413 }),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "bad-json" }, { status: 400 }),
    };
  }

  if (text.length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "payload_too_large" }, { status: 413 }),
    };
  }

  if (!text.trim()) {
    return { ok: true, body: {} };
  }

  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "bad-json" }, { status: 400 }),
    };
  }
}

export function enforceMaxText(
  value: string,
  maxChars: number,
  field = "text"
): NextResponse | null {
  if (value.length <= maxChars) return null;
  return NextResponse.json(
    { error: "field_too_long", field, max: maxChars },
    { status: 400 }
  );
}
