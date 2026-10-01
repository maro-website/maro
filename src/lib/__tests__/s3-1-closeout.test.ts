import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

const AI_ROUTES = [
  {
    route: "/api/ai/generate",
    file: "src/app/api/ai/generate/route.ts",
    limitKey: "jsonWebGenerate" as const,
  },
  {
    route: "/api/ai/image",
    file: "src/app/api/ai/image/route.ts",
    limitKey: "jsonAi" as const,
  },
  {
    route: "/api/ai/chat",
    file: "src/app/api/ai/chat/route.ts",
    limitKey: "jsonAiChat" as const,
  },
  {
    route: "/api/ai/edit",
    file: "src/app/api/ai/edit/route.ts",
    limitKey: "jsonAiEdit" as const,
  },
  {
    route: "/api/ai/edit-html",
    file: "src/app/api/ai/edit-html/route.ts",
    limitKey: "jsonEditHtml" as const,
  },
  {
    route: "/api/ai/audio",
    file: "src/app/api/ai/audio/route.ts",
    limitKey: "jsonAiAudio" as const,
  },
] as const;

function oversizedJson(maxBytes: number): string {
  return JSON.stringify({ pad: "x".repeat(maxBytes + 1) });
}

describe("Batch S3.1 — readJsonBody size gate", () => {
  it("rejects oversized bodies with 413 before JSON parse", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversizedJson(REQUEST_LIMITS.jsonAiChat),
    });
    const result = await readJsonBody(req, REQUEST_LIMITS.jsonAiChat);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
      const json = await result.response.json();
      expect(json.error).toBe("payload_too_large");
    }
  });

  it("rejects oversized Content-Length without reading the body", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(REQUEST_LIMITS.jsonAiEdit + 1),
      },
      body: "{}",
    });
    const result = await readJsonBody(req, REQUEST_LIMITS.jsonAiEdit);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });
});

describe("Batch S3.1 — cost-bearing AI route contracts", () => {
  it("every paid AI route reads JSON through canonical request limits", () => {
    for (const { file, limitKey } of AI_ROUTES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("readJsonBody");
      expect(source).toContain(`REQUEST_LIMITS.${limitKey}`);
      expect(source).not.toMatch(/await req\.json\(\)/);
    }
  });
});

describe("Batch S3.1 — oversized AI routes reject before providers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 413 for oversized /api/ai/chat without calling Anthropic", async () => {
    vi.stubEnv("ANTHROPIC_CHAT_API_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "development");
    const streamChat = vi.fn();
    vi.doMock("@/lib/ai/anthropic", () => ({
      CHAT_MODEL: "claude-opus-5",
      hasChatKey: () => true,
      streamChat,
      completeChat: vi.fn(),
    }));
    const { POST } = await import("@/app/api/ai/chat/route");
    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedJson(REQUEST_LIMITS.jsonAiChat),
      })
    );
    expect(res.status).toBe(413);
    expect(streamChat).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized /api/ai/edit without calling Anthropic", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "development");
    const callClaudeJSON = vi.fn();
    vi.doMock("@/lib/ai/anthropic", () => ({
      AI_MODEL: "claude-opus-4-8",
      hasAiKey: () => true,
      callClaudeJSON,
    }));
    const { POST } = await import("@/app/api/ai/edit/route");
    const res = await POST(
      new Request("http://localhost/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedJson(REQUEST_LIMITS.jsonAiEdit),
      })
    );
    expect(res.status).toBe(413);
    expect(callClaudeJSON).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized /api/ai/edit-html without calling Anthropic", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "development");
    const callClaudeText = vi.fn();
    vi.doMock("@/lib/ai/anthropic", () => ({
      hasAiKey: () => true,
      callClaudeText,
    }));
    const { POST } = await import("@/app/api/ai/edit-html/route");
    const res = await POST(
      new Request("http://localhost/api/ai/edit-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedJson(REQUEST_LIMITS.jsonEditHtml),
      })
    );
    expect(res.status).toBe(413);
    expect(callClaudeText).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized /api/ai/audio without calling ElevenLabs", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "development");
    const textToSpeech = vi.fn();
    vi.doMock("@/lib/ai/elevenlabs", () => ({
      hasElevenKey: () => true,
      textToSpeech,
      generateMusic: vi.fn(),
      generateSoundEffect: vi.fn(),
      speechToSpeech: vi.fn(),
      isolateAudio: vi.fn(),
      speechToText: vi.fn(),
    }));
    const { POST } = await import("@/app/api/ai/audio/route");
    const res = await POST(
      new Request("http://localhost/api/ai/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedJson(REQUEST_LIMITS.jsonAiAudio),
      })
    );
    expect(res.status).toBe(413);
    expect(textToSpeech).not.toHaveBeenCalled();
  });
});

describe("Batch S3.1 — Sharp runtime contract", () => {
  it("Next image optimizer resolves patched sharp >= 0.35.0", () => {
    const optimizer = fs.realpathSync(
      path.join(process.cwd(), "node_modules/next/dist/server/image-optimizer.js")
    );
    const req = createRequire(optimizer);
    const sharp = req("sharp") as { versions: { sharp: string } };
    const version = sharp.versions.sharp;
    const [major, minor] = version.split(".").map(Number);
    expect(major > 0 || minor >= 35).toBe(true);
  });
});

describe("Batch S3.1 — upload storage does not re-encode rasters", () => {
  it("stores validated bytes as-is without sharp decode/re-encode", () => {
    const server = fs.readFileSync(
      path.join(process.cwd(), "src/lib/supabase/server.ts"),
      "utf8"
    );
    const validation = fs.readFileSync(
      path.join(process.cwd(), "src/lib/security/uploadValidation.ts"),
      "utf8"
    );
    expect(server).toContain("upload(path, bytes, { contentType");
    expect(server).not.toMatch(/from\s+["']sharp["']/);
    expect(validation).not.toMatch(/from\s+["']sharp["']/);
    expect(validation).toContain("detectRasterKind");
  });
});
