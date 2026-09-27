import "server-only";

// ElevenLabs integration for maro Zo. Uses the REST API directly (no SDK) so we
// stay dependency-light. Audio-returning calls hand back base64 mp3 strings so
// the route can upload them the same way images are handled; speech-to-text
// returns plain text.

const BASE = "https://api.elevenlabs.io";

export function hasElevenKey(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function key(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("NO_ELEVEN_KEY");
  return k;
}

// Registry model ids -> ElevenLabs model ids (text-to-speech).
const TTS_MODEL_MAP: Record<string, string> = {
  "eleven-v3": "eleven_multilingual_v2",
  "eleven-multi-v2": "eleven_multilingual_v2",
  "gpt4o-mini-tts": "eleven_multilingual_v2",
};

// Curated default voices per "Personi" (gender). Multilingual v2 handles
// Albanian text fine; these are ElevenLabs' stable public voices.
const VOICE_MAP: Record<string, string> = {
  female: process.env.ELEVEN_VOICE_FEMALE || "21m00Tcm4TlvDq8ikWAM", // Rachel
  male: process.env.ELEVEN_VOICE_MALE || "pNInz6obpgDQGcFmaJgB", // Adam
};

export function resolveVoiceId(voice: string | undefined): string {
  return VOICE_MAP[voice ?? "female"] ?? VOICE_MAP.female;
}

function resolveTtsModel(model: string | undefined): string {
  return TTS_MODEL_MAP[model ?? ""] ?? "eleven_multilingual_v2";
}

// Parse a data URL ("data:audio/mpeg;base64,....") into a Blob for multipart.
function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const match = /^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  const mime = match?.[1] ?? "audio/mpeg";
  const b64 = match?.[2] ?? "";
  const ext = mime.split("/")[1]?.split("+")[0] || "mp3";
  const bytes = Buffer.from(b64, "base64");
  return { blob: new Blob([bytes], { type: mime }), ext };
}

async function audioResponseToB64(res: Response): Promise<string> {
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

async function ensureOk(res: Response, where: string) {
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`ELEVEN_${where}_${res.status}: ${detail.slice(0, 300)}`);
  }
}

// ---- Text to Speech ----
export async function textToSpeech(opts: {
  text: string;
  voice?: string;
  model?: string;
}): Promise<string> {
  const voiceId = resolveVoiceId(opts.voice);
  const res = await fetch(
    `${BASE}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: opts.text, model_id: resolveTtsModel(opts.model) }),
    }
  );
  await ensureOk(res, "TTS");
  return audioResponseToB64(res);
}

// ---- Music generation ----
export async function generateMusic(opts: {
  prompt: string;
  lengthMs?: number;
}): Promise<string> {
  const res = await fetch(`${BASE}/v1/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: opts.prompt,
      music_length_ms: Math.min(Math.max(opts.lengthMs ?? 15000, 3000), 120000),
    }),
  });
  await ensureOk(res, "MUSIC");
  return audioResponseToB64(res);
}

// ---- Sound effects ----
export async function generateSoundEffect(opts: {
  text: string;
  durationSeconds?: number;
}): Promise<string> {
  const body: Record<string, unknown> = { text: opts.text };
  if (opts.durationSeconds) {
    body.duration_seconds = Math.min(Math.max(opts.durationSeconds, 0.5), 22);
  }
  const res = await fetch(`${BASE}/v1/sound-generation?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await ensureOk(res, "SFX");
  return audioResponseToB64(res);
}

// ---- Speech to speech (voice changer) ----
export async function speechToSpeech(opts: {
  audio: string; // data URL
  voice?: string;
}): Promise<string> {
  const voiceId = resolveVoiceId(opts.voice);
  const { blob, ext } = dataUrlToBlob(opts.audio);
  const form = new FormData();
  form.append("audio", blob, `input.${ext}`);
  form.append("model_id", "eleven_multilingual_sts_v2");
  const res = await fetch(
    `${BASE}/v1/speech-to-speech/${voiceId}?output_format=mp3_44100_128`,
    { method: "POST", headers: { "xi-api-key": key() }, body: form }
  );
  await ensureOk(res, "STS");
  return audioResponseToB64(res);
}

// ---- Audio isolation (remove background noise) ----
export async function isolateAudio(opts: { audio: string }): Promise<string> {
  const { blob, ext } = dataUrlToBlob(opts.audio);
  const form = new FormData();
  form.append("audio", blob, `input.${ext}`);
  const res = await fetch(`${BASE}/v1/audio-isolation`, {
    method: "POST",
    headers: { "xi-api-key": key() },
    body: form,
  });
  await ensureOk(res, "ISOLATION");
  return audioResponseToB64(res);
}

// ---- Speech to text (transcription) ----
export async function speechToText(opts: { audio: string }): Promise<string> {
  const { blob, ext } = dataUrlToBlob(opts.audio);
  const form = new FormData();
  form.append("file", blob, `input.${ext}`);
  form.append("model_id", "scribe_v1");
  const res = await fetch(`${BASE}/v1/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": key() },
    body: form,
  });
  await ensureOk(res, "STT");
  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}
