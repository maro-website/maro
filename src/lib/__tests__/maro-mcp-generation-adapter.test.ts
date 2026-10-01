import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMaroImageApplication = vi.hoisted(() => vi.fn());
const generationJobs = vi.hoisted(() => ({
  findJobByIdempotency: vi.fn(),
  findRecentCompletedMcpGeneration: vi.fn(),
  findRecentInFlightMcpJob: vi.fn(),
  getGenerationResultForJob: vi.fn(),
}));
const resolveAssetListForClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/maro-imazh/applicationService", () => ({
  executeMaroImageApplication,
}));
vi.mock("@/lib/commerce/entitlements", () => ({ resolveEntitlements: vi.fn() }));
vi.mock("@/lib/generation/jobs", () => ({
  ...generationJobs,
  isInFlightJobStatus: (status: string) =>
    status === "pending" || status === "reserved" || status === "processing",
}));
vi.mock("@/lib/supabase/server", () => ({
  getMaroAccountSummary: vi.fn(),
  resolveAssetListForClient,
}));

import { generateMaroImageTool } from "@/lib/mcp/tools";

const actor = {
  userId: "user-1",
  clientId: "client-1",
  token: "verified-token",
  expiresAt: 4_000_000_000,
  permissions: ["account:read", "image:generate"] as const,
};

describe("maroMCP canonical maroImazh adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generationJobs.findJobByIdempotency.mockResolvedValue(null);
    generationJobs.findRecentCompletedMcpGeneration.mockResolvedValue(null);
    generationJobs.findRecentInFlightMcpJob.mockResolvedValue(null);
    generationJobs.getGenerationResultForJob.mockResolvedValue(null);
    resolveAssetListForClient.mockImplementation(async (urls: string[]) => urls);
  });

  it("reuses the completed generation linked to the same MCP job", async () => {
    generationJobs.findJobByIdempotency.mockResolvedValue({
      id: "job-completed",
      user_id: "user-1",
      module: "reklama",
      status: "completed",
    });
    generationJobs.getGenerationResultForJob.mockResolvedValue({
      generationId: "generation-existing",
      outputUrls: ["storage:generations/user-1/existing.png"],
      creditsSpent: 6,
    });
    resolveAssetListForClient.mockResolvedValue([
      "https://project.supabase.co/storage/v1/object/sign/generations/existing.png?token=signed",
    ]);

    const result = await generateMaroImageTool({
      actor: { ...actor, permissions: [...actor.permissions] },
      args: { request: "Premium cinematic campaign" },
      idempotencyKey: "mcp-stable-key",
      sourceRequest: new Request("https://maro.al/api/mcp"),
    });

    expect(result).toMatchObject({
      ok: true,
      structuredContent: {
        asset_url:
          "https://project.supabase.co/storage/v1/object/sign/generations/existing.png?token=signed",
        credits_spent: 6,
      },
    });
    expect(executeMaroImageApplication).not.toHaveBeenCalled();
  });

  it("returns processing for the same in-flight MCP job without generating again", async () => {
    generationJobs.findJobByIdempotency.mockResolvedValue({
      id: "job-processing",
      user_id: "user-1",
      module: "reklama",
      status: "processing",
    });

    const result = await generateMaroImageTool({
      actor: { ...actor, permissions: [...actor.permissions] },
      args: { request: "Premium cinematic campaign" },
      idempotencyKey: "mcp-stable-key",
      sourceRequest: new Request("https://maro.al/api/mcp"),
    });

    expect(result).toMatchObject({
      ok: false,
      code: "GENERATION_IN_PROGRESS",
      details: { job_id: "job-processing", status: "processing", retry_after_seconds: 15 },
    });
    expect(executeMaroImageApplication).not.toHaveBeenCalled();
  });

  it("calls the canonical service with active workspace only and sanitizes the result", async () => {
    executeMaroImageApplication.mockImplementation(async (request, body, adapter) => {
      expect(request.headers.get("authorization")).toBe("Bearer verified-token");
      expect(request.headers.get("idempotency-key")).toBe("mcp-key-1");
      expect(body).toMatchObject({
        toolId: "reklama",
        prompt: "Premium cinematic campaign",
        useWorkspaceBrand: true,
        idempotencyKey: "mcp-key-1",
        selections: { format: "yt-thumb", text: "off" },
      });
      expect(body).not.toHaveProperty("workspaceId");
      expect(body).not.toHaveProperty("maroPrompt");
      expect(body).not.toHaveProperty("attachments");
      return adapter.stream(async (send: (payload: Record<string, unknown>) => void) => {
        send({
          ok: true,
          images: [
            "data:image/png;base64,secret",
            "https://project.supabase.co/storage/v1/object/sign/generations/a.png?token=signed",
          ],
          storageRefs: ["storage:generations/user-1/a.png"],
          generationId: "internal-generation-id",
          creditsSpent: 5,
          final_prompt: "must-not-leak",
        });
      });
    });

    const result = await generateMaroImageTool({
      actor: { ...actor, permissions: [...actor.permissions] },
      args: { request: "Premium cinematic campaign", aspect_ratio: "landscape" },
      idempotencyKey: "mcp-key-1",
      sourceRequest: new Request("https://maro.al/api/mcp"),
    });

    expect(result).toMatchObject({
      ok: true,
      structuredContent: {
        asset_url:
          "https://project.supabase.co/storage/v1/object/sign/generations/a.png?token=signed",
        media_type: "image/png",
        aspect_ratio: "landscape",
        credits_spent: 5,
      },
    });
    expect(executeMaroImageApplication).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain("data:image");
    expect(JSON.stringify(result)).not.toContain("storage:generations");
    expect(JSON.stringify(result)).not.toContain("final_prompt");
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("returns the existing signed asset without a secondary rendering fetch", async () => {
    executeMaroImageApplication.mockImplementation(async (_request, _body, adapter) =>
      adapter.stream(async (send: (payload: Record<string, unknown>) => void) => {
        send({
          ok: true,
          images: ["https://project.supabase.co/storage/v1/object/sign/generations/a.png"],
          storageRefs: ["storage:generations/user-1/a.png"],
          creditsSpent: 6,
        });
      })
    );

    const result = await generateMaroImageTool({
      actor: { ...actor, permissions: [...actor.permissions] },
      args: { request: "Premium cinematic campaign" },
      idempotencyKey: "mcp-key-inline-fallback",
      sourceRequest: new Request("https://maro.al/api/mcp"),
    });

    expect(result).toMatchObject({
      ok: true,
      structuredContent: {
        asset_url: "https://project.supabase.co/storage/v1/object/sign/generations/a.png",
        credits_spent: 6,
      },
    });
    expect(result).not.toHaveProperty("content");
    expect(executeMaroImageApplication).toHaveBeenCalledOnce();
  });

  it.each([
    [402, "insufficient-credits", "INSUFFICIENT_CREDITS"],
    [429, "rate_limited", "RATE_LIMITED"],
    [503, "platform_busy", "SERVICE_UNAVAILABLE"],
    [502, "provider-secret-body", "GENERATION_FAILED"],
  ])("maps canonical failure %s/%s to a safe MCP error", async (status, error, expected) => {
    executeMaroImageApplication.mockImplementation(async (_request, _body, adapter) =>
      adapter.failure({ error, sql: "secret", final_prompt: "hidden" }, status)
    );
    const result = await generateMaroImageTool({
      actor: { ...actor, permissions: [...actor.permissions] },
      args: { request: "Premium cinematic campaign" },
      idempotencyKey: "mcp-key-2",
      sourceRequest: new Request("https://maro.al/api/mcp"),
    });
    expect(result).toMatchObject({ ok: false, code: expected });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("hidden");
  });

  it("fails closed instead of returning a base64-only provider result", async () => {
    executeMaroImageApplication.mockImplementation(async (_request, _body, adapter) =>
      adapter.stream(async (send: (payload: Record<string, unknown>) => void) => {
        send({ ok: true, images: ["data:image/png;base64,secret"] });
      })
    );
    const result = await generateMaroImageTool({
      actor: { ...actor, permissions: [...actor.permissions] },
      args: { request: "Premium cinematic campaign" },
      idempotencyKey: "mcp-key-3",
      sourceRequest: new Request("https://maro.al/api/mcp"),
    });
    expect(result).toMatchObject({ ok: false, code: "GENERATION_FAILED" });
  });
});
