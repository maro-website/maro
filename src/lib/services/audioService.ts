"use client";

import { getAccessToken } from "@/lib/supabase/client";
import { InsufficientCreditsError } from "@/lib/services/generationService";
import type { AiAudioRequest, AiAudioResponse } from "@/lib/ai/audioTypes";

export { InsufficientCreditsError };

export class AudioGenerationError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "AudioGenerationError";
    this.code = code;
    this.status = status;
  }
}

// Generate audio (or transcribe) via /api/ai/audio. Throws
// InsufficientCreditsError (402) or AudioGenerationError on failure.
export async function generateAudio(req: AiAudioRequest): Promise<AiAudioResponse> {
  const token = await getAccessToken();
  const res = await fetch("/api/ai/audio", {
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
    throw new AudioGenerationError(j.error || `http-${res.status}`, res.status);
  }

  return (await res.json()) as AiAudioResponse;
}
