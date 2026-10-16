import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), configured: vi.fn(), from: vi.fn(), rpc: vi.fn(), policy: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: mocks.user, supabaseServerConfigured: mocks.configured, getSupabaseAdmin: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/lib/workspaces/accountPolicyServer", async () => { const actual = await vi.importActual<typeof import("@/lib/workspaces/accountPolicyServer")>("@/lib/workspaces/accountPolicyServer"); return { ...actual, requireBrainAccess: mocks.policy }; });
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate }));
import { GET, POST } from "@/app/api/brain/memories/route";
import { AccountPolicyError } from "@/lib/workspaces/accountPolicyServer";
import { BRAIN_STUDIO_OWNER } from "@/lib/brain-studio/pilot";
import { emptyMemoryMetadata, encodeMemoryCard } from "@/lib/brain-studio/memories";
import { loadStudioMemories } from "@/lib/brain-studio/server";
const workspaceId = "ws_actual_text_id";
const metadata = { ...emptyMemoryMetadata(), title: "Manual rule", kind: "rule" as const };
const body = () => ({ workspaceId, key: "card_1", content: "Keep product names unchanged.", metadata, expectedRevision: 0, resetAt: null });
const request = (input?: unknown) => new Request(`https://maro.al/api/brain/memories?workspaceId=${workspaceId}`, { method: input ? "POST" : "GET", headers: { Authorization: "Bearer fixture", "Content-Type": "application/json" }, ...(input ? { body: JSON.stringify(input) } : {}) });
let workspace: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> };
let memories: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.resetAllMocks(); mocks.configured.mockReturnValue(true); mocks.user.mockResolvedValue({ id: BRAIN_STUDIO_OWNER, email: "erzen@nice.al" }); mocks.policy.mockResolvedValue({ brainAccess: true, brainResetAt: null }); mocks.rate.mockResolvedValue({ allowed: true }); mocks.rpc.mockResolvedValue({ data: { saved: true, revision: 1 }, error: null });
  workspace = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: workspaceId }, error: null }) };
  memories = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [], error: null }) };
  mocks.from.mockImplementation(table => table === "workspaces" ? workspace : memories);
});
describe("verified account-only memory API", () => {
  it.each([GET, POST])("denies anonymous, wrong identity/email and unavailable setup before data access", async handler => {
    const req = () => handler === POST ? request(body()) : request();
    mocks.user.mockResolvedValueOnce(null); expect((await handler(req())).status).toBe(401);
    mocks.user.mockResolvedValueOnce({ id: "other", email: "erzen@nice.al" }); expect((await handler(req())).status).toBe(404);
    mocks.user.mockResolvedValueOnce({ id: BRAIN_STUDIO_OWNER, email: "other@example.test" }); expect((await handler(req())).status).toBe(404);
    mocks.configured.mockReturnValue(false); expect((await handler(req())).status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires ownership, active plan and rate allowance before reading or writing cards", async () => {
    workspace.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); expect((await POST(request(body()))).status).toBe(404);
    mocks.policy.mockRejectedValueOnce(new AccountPolicyError("brain_plan_required", 403)); expect((await POST(request(body()))).status).toBe(403);
    mocks.rate.mockResolvedValueOnce({ allowed: false }); expect((await POST(request(body()))).status).toBe(429);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(memories.range).not.toHaveBeenCalled();
    expect(workspace.eq).toHaveBeenCalledWith("owner_id", BRAIN_STUDIO_OWNER);
  });
  it("saves a versioned card using the existing conflict-aware RPC and private response headers", async () => {
    const response = await POST(request(body())); expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("maro_mcp_remember", expect.objectContaining({ p_user: BRAIN_STUDIO_OWNER, p_workspace: workspaceId, p_key: "card_1", p_expected: 0, p_content: encodeMemoryCard(body().content, metadata) }));
    expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("vary")).toBe("Authorization");
  });
  it("rejects injected identity, invalid dates, oversized records, reset races and stale revisions", async () => {
    expect((await POST(request({ ...body(), ownerId: "someone" }))).status).toBe(400);
    expect((await POST(request({ ...body(), metadata: { ...metadata, expiresOn: "2026-02-30" } }))).status).toBe(400);
    expect((await POST(request({ ...body(), content: "x".repeat(4000) }))).status).toBe(422);
    mocks.policy.mockResolvedValueOnce({ brainAccess: true, brainResetAt: "2026-10-16T00:00:00Z" }); expect((await POST(request(body()))).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ error: { message: "MEMORY_CONFLICT private detail" } }); const conflict = await POST(request(body())); expect(conflict.status).toBe(409); expect(await conflict.text()).not.toContain("private detail");
  });
  it("reads newest revisions only, retaining archives and refusing to resurrect malformed current cards", async () => {
    memories.range.mockResolvedValueOnce({ data: [{ memory_key: "one", revision: 5, content: encodeMemoryCard("Archived", { ...metadata, archived: true }) }, { memory_key: "bad", revision: 4, content: "[maro-memory-card:v1]\nbroken" }, { memory_key: "one", revision: 3, content: "Old active" }, { memory_key: "bad", revision: 2, content: "Old should stay hidden" }, { memory_key: "legacy", revision: 1, content: "Legacy plain fact" }], error: null });
    const items = await loadStudioMemories(BRAIN_STUDIO_OWNER, workspaceId);
    expect(items.map(item => item.key)).toEqual(["one", "legacy"]); expect(items[0].metadata.archived).toBe(true);
    expect(memories.eq.mock.calls).toContainEqual(["owner_id", BRAIN_STUDIO_OWNER]); expect(memories.eq.mock.calls).toContainEqual(["workspace_id", workspaceId]);
  });
  it("fails closed on unavailable memory reads without leaking database messages", async () => {
    memories.range.mockResolvedValueOnce({ error: { message: "private connection" }, data: null }); const response = await GET(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private connection");
  });
});
