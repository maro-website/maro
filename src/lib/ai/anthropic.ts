import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMsg } from "@/lib/ai/chatTypes";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
const AI_EFFORT = process.env.ANTHROPIC_EFFORT || "high";
const AI_MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || "", 10) || 64000;
// Wall-clock budget for a single website generation/edit. Our own abort fires
// before any platform timeout: this stops Anthropic from generating (and
// billing) more tokens and lets the route refund cleanly instead of an
// unhandled 504. Railway max HTTP duration is 15 min; default 14.5 min.
const CLAUDE_TIMEOUT_MS = parseInt(process.env.ANTHROPIC_TIMEOUT_MS || "", 10) || 870000;

// maro Fjalë (writing assistant) runs on Opus 5 with thinking disabled for fast,
// cheap replies. It may use a dedicated key (ANTHROPIC_CHAT_API_KEY) for separate
// billing; falls back to the shared ANTHROPIC_API_KEY.
export const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-opus-5";
const CHAT_MAX_TOKENS = parseInt(process.env.ANTHROPIC_CHAT_MAX_TOKENS || "", 10) || 2048;

// A precise, surfaced Claude failure so the UI can show the real cause.
export class ClaudeError extends Error {
  code: string;
  detail: string;
  status?: number;
  constructor(code: string, detail = "", status?: number) {
    super(code);
    this.name = "ClaudeError";
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export function hasAiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function hasChatKey(): boolean {
  return Boolean(process.env.ANTHROPIC_CHAT_API_KEY || process.env.ANTHROPIC_API_KEY);
}

let cached: Anthropic | null = null;
function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");
  if (!cached) cached = new Anthropic({ apiKey });
  return cached;
}

let cachedChat: Anthropic | null = null;
function chatClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_CHAT_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");
  if (!cachedChat) cachedChat = new Anthropic({ apiKey });
  return cachedChat;
}

// Shared params for the maro Fjalë assistant. Thinking disabled (allowed at the
// default `high` effort) keeps replies fast and `max_tokens` as pure output.
function chatParams(system: string, messages: ChatMsg[]) {
  return {
    model: CHAT_MODEL,
    max_tokens: CHAT_MAX_TOKENS,
    thinking: { type: "disabled" },
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  } as unknown as Anthropic.MessageStreamParams;
}

// Stream an assistant reply as text deltas (maro Fjalë).
export async function* streamChat(opts: {
  system: string;
  messages: ChatMsg[];
}): AsyncGenerator<string, void, unknown> {
  const stream = chatClient().messages.stream(chatParams(opts.system, opts.messages));
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

// Non-streaming reply (fallback when streaming fails on the host).
export async function completeChat(opts: {
  system: string;
  messages: ChatMsg[];
}): Promise<string> {
  const stream = chatClient().messages.stream(chatParams(opts.system, opts.messages));
  const res = await stream.finalMessage();
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// Extract a JSON object from a model response that should be pure JSON but may
// occasionally arrive wrapped in prose or ```json fences.
function extractJson<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI response did not contain JSON");
  }
  return JSON.parse(t.slice(start, end + 1)) as T;
}

// Run a Claude streaming request with a hard wall-clock budget. On timeout we
// abort the underlying HTTP request (which stops Anthropic from generating and
// billing further tokens) and surface a precise "timeout" error so the caller
// can refund. Streaming is required for the large max_tokens a full site needs.
async function runClaudeStream(
  params: Anthropic.MessageStreamParams,
  timeoutMs = CLAUDE_TIMEOUT_MS
): Promise<Anthropic.Message> {
  const ac = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, timeoutMs);

  try {
    const stream = client().messages.stream(params, { signal: ac.signal });
    return await stream.finalMessage();
  } catch (e) {
    if (timedOut) {
      throw new ClaudeError("timeout", `exceeded ${Math.round(timeoutMs / 1000)}s time budget`);
    }
    // API-level failure: bad key, no model access, rate limit, overloaded, timeout.
    const anyE = e as {
      status?: number;
      message?: string;
      error?: { error?: { message?: string; type?: string } };
    };
    const detail = anyE?.error?.error?.message || anyE?.message || "unknown error";
    throw new ClaudeError("api-error", detail, anyE?.status);
  } finally {
    clearTimeout(timer);
  }
}

// Call Claude Opus 5 (adaptive thinking) and parse the JSON answer.
export async function callClaudeJSON<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  effort?: string;
}): Promise<T> {
  const res = await runClaudeStream({
    model: AI_MODEL,
    max_tokens: opts.maxTokens ?? AI_MAX_TOKENS,
    // Opus 5 uses adaptive thinking (on by default); depth is controlled via effort.
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort || AI_EFFORT },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    // Cast: output_config/adaptive are supported at runtime; keep params loose
    // so the build doesn't depend on exact SDK minor-version typings.
  } as unknown as Anthropic.MessageStreamParams);

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (!text.trim()) {
    throw new ClaudeError("empty", `stop_reason=${res.stop_reason}`);
  }

  try {
    return extractJson<T>(text);
  } catch {
    // The most common real failure: the JSON got cut off because the response
    // hit the token ceiling (thinking + output combined).
    const code = res.stop_reason === "max_tokens" ? "truncated" : "parse-failed";
    throw new ClaudeError(code, `stop_reason=${res.stop_reason} chars=${text.length}`);
  }
}

// Call Claude and return the raw text (used for HTML generation/editing where the
// payload is large and JSON string-escaping would be fragile).
export async function callClaudeText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  effort?: string;
}): Promise<{ text: string; truncated: boolean }> {
  const res = await runClaudeStream({
    model: AI_MODEL,
    max_tokens: opts.maxTokens ?? AI_MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort || AI_EFFORT },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  } as unknown as Anthropic.MessageStreamParams);

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (!text.trim()) {
    throw new ClaudeError("empty", `stop_reason=${res.stop_reason}`);
  }

  return { text, truncated: res.stop_reason === "max_tokens" };
}
