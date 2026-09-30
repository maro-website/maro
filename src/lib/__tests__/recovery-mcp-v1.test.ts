import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MaroMcpActor } from "@/lib/mcp/auth";

const m = vi.hoisted(() => ({ execute: vi.fn(), exact: vi.fn(), inflight: vi.fn(), result: vi.fn(), assets: vi.fn() }));
vi.mock("@/lib/generation/v1ImageApplication", () => ({ executeV1ImageApplication: m.execute }));
vi.mock("@/lib/generation/jobs", () => ({
  findJobByIdempotency: m.exact, findRecentInFlightMcpJob: m.inflight,
  getGenerationResultForJob: m.result, isInFlightJobStatus: (s: string) => ["pending", "reserved", "processing"].includes(s),
}));
vi.mock("@/lib/commerce/entitlements", () => ({ resolveEntitlements: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getMaroAccountSummary: vi.fn(), resolveAssetListForClient: m.assets }));
import { generateMaroImageTool } from "@/lib/mcp/tools";

const actor: MaroMcpActor = { userId: "owner", clientId: "verified-client", token: "verified-token", expiresAt: 4000000000, permissions: ["image:generate"] };
const input = () => ({ actor, args: { request: "A green coffee cup" }, idempotencyKey: "mcp-exact-key", sourceRequest: new Request("http://localhost/api/mcp") });
function stream(payload: object) {
  return new Response(`data: {"event":"generation_started"}\n\n: heartbeat\n\ndata: ${JSON.stringify(payload)}\n\n`, { headers: { "content-type": "text/event-stream" } });
}
beforeEach(() => {
  vi.clearAllMocks(); m.exact.mockResolvedValue(null); m.inflight.mockResolvedValue(null);
  m.assets.mockResolvedValue(["https://test.invalid/signed-result.png"]);
});
describe("MCP uses the trusted V1 image contract", () => {
  it("uses the published default model and maps the final settled SSE result", async () => {
    m.execute.mockResolvedValue(stream({ ok: true, images: ["https://test.invalid/image.png"], creditsSpent: 5 }));
    const output = await generateMaroImageTool(input());
    expect(output).toMatchObject({ ok: true, structuredContent: { credits_spent: 5, asset_url: "https://test.invalid/image.png" } });
    const request = m.execute.mock.calls[0][0] as Request;
    expect(request.headers.get("authorization")).toBe("Bearer verified-token");
    expect(await request.json()).toEqual({ toolId: "reklama", prompt: "A green coffee cup", selections: { speed: "normal", format: "ig-post", text: "off" }, useWorkspaceBrand: false, n: 1, idempotencyKey: "mcp-exact-key" });
  });
  it("replays the exact completed durable job without provider or financial execution", async () => {
    m.exact.mockResolvedValue({ id: "job", status: "completed" });
    m.result.mockResolvedValue({ generationId: "generation", outputUrls: ["storage:generations/owner/job/output.png"], creditsSpent: 5 });
    expect(await generateMaroImageTool(input())).toMatchObject({ ok: true, structuredContent: { credits_spent: 5 } });
    expect(m.result).toHaveBeenCalledWith("job", "owner"); expect(m.execute).not.toHaveBeenCalled();
  });
  it("keeps uncertain settlement recoverable and never reports a refund", async () => {
    m.execute.mockResolvedValue(stream({ ok: false, error: "settlement_pending", recoverable: true, refunded: false, jobId: "job" }));
    expect(await generateMaroImageTool(input())).toMatchObject({ ok: false, code: "GENERATION_IN_PROGRESS", details: { job_id: "job" } });
  });
  it("does not start new work when completed history is temporarily missing", async () => {
    m.exact.mockResolvedValue({ id: "job", status: "completed" }); m.result.mockResolvedValue(null);
    expect(await generateMaroImageTool(input())).toMatchObject({ ok: false, code: "GENERATION_IN_PROGRESS" });
    expect(m.execute).not.toHaveBeenCalled();
  });
});
