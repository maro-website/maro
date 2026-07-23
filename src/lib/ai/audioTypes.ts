import type { ToolId } from "@/lib/tools/registry";

export interface AiAudioRequest {
  toolId: ToolId; // "zo"
  /** Selected mode: tts | music | sfx | sts | isolate | stt */
  mode: string;
  /** Text prompt (TTS / music / SFX). */
  prompt?: string;
  /** Input audio as a data URL (STS / isolation / STT). */
  audio?: string;
  /** Selected options per setting id (drives cost + model/voice/length). */
  selections?: Record<string, string>;
}

export interface AiAudioResponse {
  /** Public URL of the generated audio (all modes except STT). */
  audioUrl?: string;
  /** Transcribed text (STT mode). */
  text?: string;
  creditsSpent: number;
}
