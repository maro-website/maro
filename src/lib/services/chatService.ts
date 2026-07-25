"use client";

import { getAccessToken } from "@/lib/supabase/client";
import { InsufficientCreditsError } from "@/lib/services/generationService";
import type { AiChatRequest } from "@/lib/ai/chatTypes";

export { InsufficientCreditsError };

export class ChatError extends Error {
  code: string;
  detail?: string;
  constructor(code: string, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ChatError";
    this.code = code;
    this.detail = detail;
  }
}

// Stream an assistant reply via /api/ai/chat (SSE). Calls onToken for each text
// delta. Returns the credits spent (from the response header). Throws
// InsufficientCreditsError (402) or ChatError on failure.
export async function streamChat(
  req: AiChatRequest,
  onToken: (delta: string) => void
): Promise<{ creditsSpent: number }> {
  const token = await getAccessToken();
  const res = await fetch("/api/ai/chat", {
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
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ChatError(j.error || `http-${res.status}`);
  }

  const creditsSpent = Number(res.headers.get("X-Credits-Spent") || "0") || 0;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError: string | null = null;
  let streamErrorDetail: string | undefined;

  // Parse the SSE stream: events separated by a blank line, each line "data: {...}".
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          const obj = JSON.parse(payload) as {
            t?: string;
            done?: boolean;
            error?: string;
            detail?: string;
          };
          if (obj.error) {
            streamError = obj.error;
            streamErrorDetail = obj.detail;
          } else if (typeof obj.t === "string") onToken(obj.t);
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
  }

  if (streamError) throw new ChatError(streamError, streamErrorDetail);
  return { creditsSpent };
}
