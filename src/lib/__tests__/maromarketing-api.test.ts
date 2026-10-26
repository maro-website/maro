import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), configured: vi.fn(), from: vi.fn(), rpc: vi.fn(), policy: vi.fn(), rate: vi.fn(), provider: vi.fn(), memories: vi.fn(), assets: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: m.user, supabaseServerConfigured: m.configured, getSupabaseAdmin: () => ({ from: m.from, rpc: m.rpc }), resolveAssetListForClient: m.assets }));
vi.mock("@/lib/workspaces/accountPolicyServer", () => ({ getAccountPolicy: m.policy, requireBrainAccess: vi.fn(), AccountPolicyError: class extends Error {} }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: m.rate }));
vi.mock("@/lib/brain-studio/server", () => ({ loadStudioMemories: m.memories }));
vi.mock("openai", () => { class APIError extends Error { status = 401; } return { default: class { static APIError = APIError; responses = { create: m.provider }; } }; });
import { GET, POST } from "@/app/api/marketing/route";
import { POST as action } from "@/app/api/marketing/action/route";
import { GET as images } from "@/app/api/marketing/images/route";
import { localDate, assemblePlan, type MarketingCampaign, type CampaignBrief } from "@/lib/marketing/model";
const user = { id: "11111111-1111-4111-8111-111111111111", email: "erzen@nice.al", email_confirmed_at: "2026-10-26" };
const brief: CampaignBrief = { title: "Launch", focus: "Our actual product launch", offer: "", goal: "launch", language: "sq", startDate: localDate(), days: 30, channels: ["instagram"], liveResearch: false };
const generated = { strategy: "Original campaign built around actual capabilities", researchNote: "No live research", posts: Array.from({ length: 9 }, () => ({ title: "One post", hook: "An actual benefit", caption: "Actual brand context", cta: "See it", visual: "A composed product photograph with exact reference identity", purpose: "Trust", metric: "Saves" })) };
const req = (body?: unknown, path = "marketing") => new Request(`https://maro.al/api/${path}?workspaceId=ws`, { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const args = () => ({ requestId: crypto.randomUUID(), workspaceId: "ws", brief });
let campaign: MarketingCampaign, foreign = false, updateConflict = false;
let sourceRecords: { id: string; name: string; file_url: string; mime_type: string }[] = [];
let imageFeed: Record<string, unknown> | null = null, imageAttempts: { slot: number; job_id: string }[] = [];
let brainProfile: { brand: { name: string; description: string }; target: { audience: string }; content: { avoid: string; voice: string; tone: string } };
const writes: { table: string; value: Record<string, unknown> }[] = [];
beforeEach(() => {
  vi.clearAllMocks(); writes.length = 0; sourceRecords = []; imageFeed = null; imageAttempts = []; foreign = false; updateConflict = false; process.env.MARO_MARKETING_OPENAI_API_KEY = "synthetic-marketing-key";
  brainProfile = { brand: { name: "Brain A", description: "A real brand with real products" }, target: { audience: "Local customers" }, content: { avoid: "No invented claims", voice: "Natural", tone: "Useful" } };
  m.user.mockResolvedValue(user); m.configured.mockReturnValue(true); m.rate.mockResolvedValue({ allowed: true }); m.policy.mockResolvedValue({ brainAccess: true }); m.memories.mockResolvedValue([]); m.assets.mockResolvedValue([]); m.rpc.mockResolvedValue({ data: { existing: false }, error: null });
  campaign = { id: crypto.randomUUID(), workspace_id: "ws", brand: "Brain A", brief, plan: assemblePlan(generated, brief, []), revision: 0, status: "completed", created_at: new Date().toISOString(), estimated_usd: .003, reserved_usd: .1, input_tokens: 1000, cached_tokens: 0, output_tokens: 200, search_calls: 0, model: "gpt-6-luna", error_code: null };
  m.from.mockImplementation(table => {
    let updating = false; const q: Record<string, unknown> = {};
    const one = () => ({ data: table === "workspaces" ? foreign ? null : { id: "ws", name: "Brain A", brain_profile: brainProfile } : updating ? updateConflict ? null : { id: campaign.id } : table === "maro_marketing_campaigns" ? campaign : table === "maro_feeds" ? imageFeed : null, error: null });
    for (const name of ["select", "eq", "gte", "not", "in", "order", "limit"]) q[name] = vi.fn(() => q);
    q.update = vi.fn((value: Record<string, unknown>) => { updating = true; writes.push({ table, value }); return q; });
    q.maybeSingle = q.single = vi.fn(async () => one());
    q.then = (done: (v: unknown) => void) => Promise.resolve(done({ data: table === "workspace_sources" ? sourceRecords : table === "maro_feed_attempts" ? imageAttempts : [], error: null })); return q;
  });
  m.provider.mockResolvedValue({ id: "resp_synthetic", model: "gpt-6-luna", status: "completed", usage: { input_tokens: 1000, output_tokens: 200, total_tokens: 1200, input_tokens_details: { cached_tokens: 400 } }, output: [], output_text: JSON.stringify(generated) });
});
describe("marketing authorization, accounting and content isolation", () => {
  it.each([GET, POST, action, images])("rejects guests, other users and unconfirmed owner before database access", async handler => {
    m.user.mockResolvedValueOnce(null); expect((await handler(req({}))).status).toBe(401);
    m.user.mockResolvedValueOnce({ ...user, email: "other@example.test" }); expect((await handler(req({}))).status).toBe(403);
    m.user.mockResolvedValueOnce({ ...user, email_confirmed_at: null }); expect((await handler(req({}))).status).toBe(403);
    expect(m.from).not.toHaveBeenCalled(); expect(m.provider).not.toHaveBeenCalled();
  });
  it("checks ownership, key, plan and input before reserve/provider work", async () => {
    foreign = true; expect((await POST(req(args()))).status).toBe(404); foreign = false;
    expect((await POST(req({ ...args(), model: "expensive" }))).status).toBe(400);
    m.policy.mockResolvedValueOnce({ brainAccess: false }); expect((await POST(req(args()))).status).toBe(403);
    process.env.MARO_MARKETING_OPENAI_API_KEY = ""; process.env.OPENAI_API_KEY = "must-not-fallback"; expect((await POST(req(args()))).status).toBe(503);
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.provider).not.toHaveBeenCalled();
  });
  it("reserves before a bounded stateless call and records actual usage on completion", async () => {
    expect((await POST(req(args()))).status).toBe(200);
    expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(m.provider.mock.invocationCallOrder[0]);
    expect(m.provider).toHaveBeenCalledOnce(); expect(m.provider.mock.calls[0][0]).toMatchObject({ model: "gpt-6-luna", store: false, max_output_tokens: 8000, parallel_tool_calls: false });
    expect(m.provider.mock.calls[0][0].input).toContain("Brain A");
    expect(writes[0].value).toMatchObject({ status: "completed", input_tokens: 1000, cached_tokens: 400, output_tokens: 200, estimated_usd: .000164 });
  });
  it("does not call the provider on idempotent replay or quota rejection", async () => {
    m.rpc.mockResolvedValueOnce({ data: { existing: true }, error: null }); expect((await POST(req(args()))).status).toBe(200);
    m.rpc.mockResolvedValueOnce({ error: { message: "MARKETING_DAILY_LIMIT" } }); expect((await POST(req(args()))).status).toBe(429);
    expect(m.provider).not.toHaveBeenCalled();
  });
  it("retains late Brain exclusions and voice within the input budget even with a very long description", async () => {
    brainProfile.brand.description = "Long brand background. ".repeat(2000); brainProfile.content.avoid = "EXCLUSION_MARKER: never make efficacy claims";
    expect((await POST(req(args()))).status).toBe(200);
    const input = m.provider.mock.calls[0][0].input;
    expect(input).toContain("EXCLUSION_MARKER"); expect(input).toContain("Natural"); expect(input.length).toBeLessThan(20000);
  });
  it("keeps unknown cost reserved and records billable invalid structured output", async () => {
    m.provider.mockRejectedValueOnce(new Error("network lost")); expect((await POST(req(args()))).status).toBe(503); expect(writes.at(-1)?.value).not.toHaveProperty("estimated_usd");
    m.provider.mockResolvedValueOnce({ ...m.provider.mock.results[0]?.value, usage: { input_tokens: 1000, output_tokens: 200 }, id: "resp_invalid", model: "gpt-6-luna", status: "completed", output: [], output_text: "invalid JSON" });
    expect((await POST(req(args()))).status).toBe(503); expect(writes.at(-1)?.value.estimated_usd).toBeCloseTo(.0002);
  });
  it("requires a real research call and source evidence, recording its cost even if verification fails", async () => {
    expect((await POST(req({ ...args(), brief: { ...brief, liveResearch: true } }))).status).toBe(503);
    expect(writes.at(-1)?.value.error_code).toBe("research_unverified");
    m.provider.mockResolvedValueOnce({ id: "resp_research", model: "gpt-6-luna", status: "completed", usage: { input_tokens: 1000, output_tokens: 200 }, output: [{ type: "web_search_call", action: { type: "search", sources: [{ type: "url", url: "https://example.test/official" }] } }], output_text: JSON.stringify(generated) });
    expect((await POST(req({ ...args(), brief: { ...brief, liveResearch: true } }))).status).toBe(200);
    expect(m.provider.mock.calls.at(-1)?.[0]).toMatchObject({ max_tool_calls: 1, tool_choice: "required" });
    expect(writes.at(-1)?.value).toMatchObject({ search_calls: 1, estimated_usd: .0102 });
  });
  it("rejects stale edits and protects asset refs from client input", async () => {
    const post = campaign.plan!.posts[0], { title, hook, caption, cta, visual, date, time, channel } = post;
    const body = { action: "edit", workspaceId: "ws", campaignId: campaign.id, revision: 0, postId: post.id, post: { title, hook, caption, cta, visual, date, time, channel, status: "approved" } };
    expect((await action(req({ ...body, revision: 1 }))).status).toBe(409);
    expect((await action(req({ ...body, post: { ...body.post, assetRef: "foreign" } }))).status).toBe(400);
    updateConflict = true; expect((await action(req(body))).status).toBe(409);
    updateConflict = false; expect((await action(req(body))).status).toBe(200);
    expect(m.provider).not.toHaveBeenCalled();
  });
  it("offers only private images from the owned Brain and prepares a bounded image brief", async () => {
    sourceRecords = [{ id: "photo", name: "Product", file_url: `storage:generations/${user.id}/refs/product.png`, mime_type: "image/png" }, { id: "foreign", name: "Foreign", file_url: "storage:generations/22222222-2222-4222-8222-222222222222/refs/product.png", mime_type: "image/png" }, { id: "public", name: "Remote", file_url: "https://example.test/image.png", mime_type: "image/png" }];
    brainProfile.target.audience = "Audience. ".repeat(100); m.assets.mockResolvedValue(["https://signed.test/product.png"]);
    const response = await images(new Request(`https://maro.al/api/marketing/images?workspaceId=ws&campaignId=${campaign.id}`, { headers: { Authorization: "Bearer synthetic" } }));
    const data = await response.json(); expect(response.status).toBe(200); expect(data.references).toHaveLength(1); expect(data.references[0].id).toBe("photo"); expect(data.brief.audience).toHaveLength(300);
    const builder = m.from.mock.results.find((_, i) => m.from.mock.calls[i][0] === "workspace_sources")!.value;
    expect(builder.eq).toHaveBeenCalledWith("owner_id", user.id); expect(builder.eq).toHaveBeenCalledWith("workspace_id", "ws");
    expect(m.provider).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("imports completed images automatically without resetting unchanged approvals on reload", async () => {
    const feedId = crypto.randomUUID(), jobId = crypto.randomUUID();
    imageFeed = { id: feedId, workspace_id: "ws", brief: { marketing: { campaignId: campaign.id } } }; imageAttempts = [{ slot: 0, job_id: jobId }];
    campaign.plan!.posts[0] = { ...campaign.plan!.posts[0], assetRef: `storage:generations/${user.id}/${jobId}/output.png`, feedId, studio: "feed", status: "approved" };
    const body = { action: "import", workspaceId: "ws", campaignId: campaign.id, revision: 0, feedId, studio: "feed" };
    expect((await action(req(body))).status).toBe(200); expect(writes).toHaveLength(0);
    imageAttempts[0].job_id = crypto.randomUUID(); expect((await action(req(body))).status).toBe(200);
    expect((writes[0].value.plan as { posts: { status: string }[] }).posts[0].status).toBe("draft");
  });
});
