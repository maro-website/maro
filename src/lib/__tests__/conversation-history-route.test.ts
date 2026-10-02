import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/creations/route";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), eq: vi.fn(), jobs: [] as unknown[], generations: [] as unknown[], error: null as { code: string } | null }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: mocks.admin, getUserFromToken: async () => ({ id: "owner" }), getActiveWorkspaceId: async () => "workspace-a",
  supabaseServerConfigured: () => true, resolveAssetListForClient: async (refs: string[]) => refs.map(ref => `https://fixture.invalid/${encodeURIComponent(ref)}`) }));
const chat = "44444444-4444-4444-8444-444444444444";
beforeEach(() => {
  vi.clearAllMocks(); mocks.jobs = []; mocks.generations = []; mocks.error = null;
  mocks.admin.mockReturnValue({ from: (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const key of ["select", "eq", "order", "in", "range", "or", "limit"]) builder[key] = vi.fn((...args: unknown[]) => { if (key === "eq") mocks.eq(...args); return builder; });
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === "generation_jobs" ? mocks.jobs : mocks.generations, error: mocks.error }).then(resolve);
    return builder;
  } });
});
describe("conversation reload boundary", () => {
  it("returns in-progress state after leaving the page without revealing job internals", async () => {
    mocks.jobs = [ { id: "job", status: "processing", created_at: "2026-10-02", request: { userId: "owner", workspaceId: "workspace-a", prompt: "Visible user request", compiled_prompt: "PRIVATE" } } ];
    const response = await GET(new Request(`https://maro.test/api/creations?conversation=${chat}`));
    expect(await response.json()).toEqual({ items: [], nextOffset: null, jobs: [{ id: "job", status: "thinking", createdAt: "2026-10-02", prompt: "Visible user request" }] });
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.eq).toHaveBeenCalledWith("workspace_id", "workspace-a");
    expect(mocks.eq).toHaveBeenCalledWith("metadata->v1_request->>conversationId", chat);
  });
  it("does not show another owner/workspace's snapshot even if a malformed job row is returned", async () => {
    mocks.jobs = [{ id: "foreign", request: { userId: "other", workspaceId: "workspace-a", prompt: "Secret" } }, { id: "other-workspace", request: { userId: "owner", workspaceId: "workspace-b", prompt: "Secret" } }];
    const response = await GET(new Request(`https://maro.test/api/creations?conversation=${chat}`));
    expect((await response.json()).jobs).toEqual([]);
  });
  it("does not treat an unavailable history query as an empty conversation", async () => {
    mocks.error = { code: "08006" };
    const response = await GET(new Request(`https://maro.test/api/creations?conversation=${chat}`));
    expect(response.status).toBe(503);
  });
  it("returns saved selections, wizard and fresh attachment URLs after reload", async () => {
    mocks.generations = [{ id: "saved", conversation_id: chat, tool_id: "logo", output_urls: ["storage:generations/owner/logo.png"], input_refs: ["storage:generations/owner/ref.png"], selections: { model: "flare" }, logo_wizard: { brand: { name: "Saved" } }, brain: false, prompt: "Logo", created_at: "2026-10-02" }];
    const response = await GET(new Request(`https://maro.test/api/creations?conversation=${chat}`));
    const result = await response.json();
    expect(result.items[0]).toMatchObject({ conversationId: chat, selections: { model: "flare" }, logoWizard: { brand: { name: "Saved" } }, inputRefs: ["storage:generations/owner/ref.png"] });
    expect(result.items[0].inputUrls).toHaveLength(1);
  });
});
