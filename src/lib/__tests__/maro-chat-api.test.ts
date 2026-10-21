import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), configured: vi.fn(), from: vi.fn(), rpc: vi.fn(), policy: vi.fn(), rate: vi.fn(), provider: vi.fn(), memories: vi.fn(), files: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: m.user, supabaseServerConfigured: m.configured, getSupabaseAdmin: () => ({ from: m.from, rpc: m.rpc, storage: { from: () => ({ list: m.files }) } }) }));
vi.mock("@/lib/workspaces/accountPolicyServer", () => ({ getAccountPolicy: m.policy, AccountPolicyError: class extends Error {} }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: m.rate }));
vi.mock("@/lib/brain-studio/server", () => ({ loadStudioMemories: m.memories }));
vi.mock("openai", () => { class APIError extends Error { status = 401; } return { default: class { static APIError = APIError; responses = { create: m.provider }; } }; });
import { GET, POST } from "@/app/api/maro-chat/route";
import { POST as apply } from "@/app/api/maro-chat/brain/route";
import { replySchema, estimateChatUsd, canUseMaroChat } from "@/lib/maro-chat/model";
const user = { id: "11111111-1111-4111-8111-111111111111", email: "erzen@nice.al", email_confirmed_at: "2026-10-21" };
const args = () => ({ requestId: crypto.randomUUID(), conversationId: crypto.randomUUID(), workspaceId: "ws", message: "Make an ad", useBrain: true });
const req = (body?: unknown, path = "maro-chat") => new Request(`https://maro.al/api/${path}?workspaceId=ws`, { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const generated = { messages: ["Hej, super"], choices: [], image: { title: "Coffee ad", prompt: "Original product hero, dramatic light", format: "ig-post", text: true, useBrain: true, assetId: "invented" }, brainUpdates: [], tool: null };
const saved: unknown[] = [];
let foreign = false;
beforeEach(() => {
  vi.clearAllMocks(); saved.length = 0; foreign = false; process.env.MARO_CHAT_OPENAI_API_KEY = "synthetic";
  m.user.mockResolvedValue(user); m.configured.mockReturnValue(true); m.rate.mockResolvedValue({ allowed: true }); m.policy.mockResolvedValue({ brainAccess: true }); m.memories.mockResolvedValue([]); m.files.mockResolvedValue({ data: [], error: null });
  m.rpc.mockResolvedValue({ data: { existing: false }, error: null });
  m.from.mockImplementation(table => {
    let updating = false; const q: Record<string, unknown> = {};
    const value = () => ({ data: table === "workspaces" ? (foreign ? null : { id: "ws", name: "Coffee", brain_profile: { brand: { name: "Coffee" } }, brain_name: "Coffee" }) : table === "profiles" ? { full_name: "Erzen", credits: 50, credits_reserved: 2, plan: "pro" } : [], error: null });
    for (const method of ["select", "eq", "order", "limit", "gte"]) q[method] = vi.fn(() => q);
    q.update = vi.fn((data: unknown) => { updating = true; saved.push(data); return q; });
    q.maybeSingle = vi.fn(async () => value()); q.single = vi.fn(async () => ({ data: updating ? { id: "saved", ...saved.at(-1) as object } : { id: "saved", status: "completed" }, error: null }));
    q.then = (resolve: (v: unknown) => void) => resolve(table === "workspaces" ? { data: [value().data], error: null } : value()); return q;
  });
  m.provider.mockResolvedValue({ id: "resp_synthetic", model: "gpt-5.4-mini", status: "completed", usage: { input_tokens: 1000, output_tokens: 200, total_tokens: 1200, input_tokens_details: { cached_tokens: 400 } }, output: [{ type: "function_call", name: "maro_reply", arguments: JSON.stringify(generated) }] });
});
describe("maroChat account and provider boundary", () => {
  it.each([GET, POST, apply])("blocks guests, other accounts and unconfirmed emails before context/provider access", async handler => {
    m.user.mockResolvedValueOnce(null); expect((await handler(req({}))).status).toBe(401);
    m.user.mockResolvedValueOnce({ ...user, email: "someone@example.test" }); expect((await handler(req({}))).status).toBe(403);
    m.user.mockResolvedValueOnce({ ...user, email_confirmed_at: null }); expect((await handler(req({}))).status).toBe(403);
    expect(m.from).not.toHaveBeenCalled(); expect(m.provider).not.toHaveBeenCalled();
  });
  it("checks ownership, strict rate limits, schema and dedicated key before spending", async () => {
    foreign = true; expect((await POST(req(args()))).status).toBe(404); foreign = false;
    m.rate.mockResolvedValueOnce({ allowed: false }); expect((await POST(req(args()))).status).toBe(429);
    expect((await POST(req({ ...args(), model: "expensive-model", credits: 0 }))).status).toBe(400);
    process.env.MARO_CHAT_OPENAI_API_KEY = ""; expect((await POST(req(args()))).status).toBe(503);
    expect(m.provider).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
  });
  it("reserves before one stateless provider call, records actual usage and refuses invented asset ids", async () => {
    const response = await POST(req(args())); expect(response.status).toBe(200);
    expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(m.provider.mock.invocationCallOrder[0]);
    expect(m.provider).toHaveBeenCalledOnce(); expect(m.provider.mock.calls[0][0]).toMatchObject({ store: false, model: "gpt-5.4-mini", max_output_tokens: 2400, parallel_tool_calls: false });
    expect(saved[0]).toMatchObject({ charged_tokens: 1200, input_tokens: 1000, cached_tokens: 400, output_tokens: 200, reply: { image: { storageRef: null, assetId: null } } });
  });
  it("does not call the provider on replay, quota rejection or plan denial", async () => {
    m.rpc.mockResolvedValueOnce({ data: { existing: true }, error: null }); expect((await POST(req(args()))).status).toBe(200);
    m.rpc.mockResolvedValueOnce({ error: { message: "CHAT_MONTHLY_LIMIT" } }); expect((await POST(req(args()))).status).toBe(429);
    m.policy.mockResolvedValue({ brainAccess: false }); expect((await POST(req(args()))).status).toBe(403);
    expect(m.provider).not.toHaveBeenCalled();
  });
  it("retains conservative reservation for ambiguous network failure and records billable invalid replies", async () => {
    m.provider.mockRejectedValueOnce(new Error("connection dropped")); expect((await POST(req(args()))).status).toBe(503); expect(saved.at(-1)).not.toHaveProperty("charged_tokens");
    m.provider.mockResolvedValueOnce({ status: "incomplete", id: "resp", model: "gpt-5.4-mini", usage: { input_tokens: 100, output_tokens: 40, total_tokens: 140 }, output: [] });
    expect((await POST(req(args()))).status).toBe(502); expect(saved.at(-1)).toMatchObject({ charged_tokens: 140, status: "failed" });
  });
  it("allows no-Brain chat without loading memories and rejects unsafe actions", async () => {
    const response = await POST(req({ ...args(), useBrain: false })); expect(response.status).toBe(200); expect(m.memories).not.toHaveBeenCalled();
    expect(saved.at(-1)).toMatchObject({ reply: { image: { useBrain: false } } });
    expect(replySchema.safeParse({ ...generated, brainUpdates: [{ section: "brand", field: "logoUrl", value: "x" }] }).success).toBe(false);
    expect(replySchema.safeParse({ ...generated, tool: "https://evil.invalid" }).success).toBe(false);
    expect(estimateChatUsd(1000, 400, 200)).toBeCloseTo(0.00138); expect(canUseMaroChat(" ERZEN@nice.al ")).toBe(true);
  });
});
