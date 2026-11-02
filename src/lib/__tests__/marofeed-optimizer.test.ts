import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { legacyFeedDesign } from "@/lib/feed/campaign";
import { defaultConfig } from "@/lib/feed/model";
import { feedPlanFixture } from "./helpers/feedPlanFixture";
const m = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), saved: vi.fn(), create: vi.fn(), client: vi.fn(), circuit: vi.fn(), select: vi.fn(), rejected: vi.fn(), readEq: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { create: m.create }; constructor(options: unknown) { m.client(options); } } }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ rpc: m.rpc, from: () => ({ update: m.update, select: m.select }) }) }));
vi.mock("@/lib/security/circuitBreaker", () => ({ assertCircuitAllows: m.circuit }));
import { planFeedCampaign, type FeedPlannerInput } from "@/lib/prompt-optimizer/feed";
async function fixture(): Promise<FeedPlannerInput> {
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#258147" } }).png().toBuffer();
  return { userId: "owner", workspaceId: "workspace-a", requestKey: "feed-plan:request", imageModel: "gpt-image-2.5-flare", design: legacyFeedDesign(2),
    brief: { brand: "Brand", description: "Two separate original products", notes: "Chrismas Themed", audience: "", goal: "sales", language: "sq", colors: "" },
    brain: "Private original brand context", category: "drinks", config: defaultConfig, contentType: "mix", textMode: true,
    references: [0, 1].map(index => ({ digest: String(index).repeat(64), dataUrl: `data:image/png;base64,${png.toString("base64")}` })),
  };
}
function generated(input: FeedPlannerInput) { const { version: unused, optimizer: ignored, ...value } = feedPlanFixture(input.design); void unused; void ignored; return value; }
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("MARO_OPTIMIZER_ENABLED", "true"); vi.stubEnv("MARO_OPTIMIZER_OPENAI_API_KEY", "dedicated-optimizer-test-key");
  vi.stubEnv("MARO_OPTIMIZER_AUDIENCE", "allowlist"); vi.stubEnv("MARO_OPTIMIZER_USER_IDS", "owner");
  m.circuit.mockResolvedValue({ ok: true }); m.rpc.mockResolvedValue({ data: { action: "run", id: "attempt" }, error: null });
  const read = { eq: m.readEq, gte: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: m.rejected }; read.eq.mockReturnValue(read); read.gte.mockReturnValue(read); read.order.mockReturnValue(read); read.limit.mockReturnValue(read); m.select.mockReturnValue(read); m.rejected.mockResolvedValue({ data: null, error: null });
  const q = { eq: vi.fn(), select: vi.fn(), single: m.saved, maybeSingle: m.saved }; q.eq.mockReturnValue(q); q.select.mockReturnValue(q); m.update.mockReturnValue(q);
  m.saved.mockResolvedValue({ data: { id: "attempt" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("maroFeed uses the existing dedicated optimizer and durable budget", () => {
  it("reuses an accounted, same-input rejected plan after completing omitted assigned products, without another provider call", async () => {
    const input = await fixture(), value = generated(input); value.posts[8].subjects = [value.posts[8].subjects[0]];
    m.rejected.mockResolvedValue({ data: { id: "repaired", final_prompt: JSON.stringify(value), estimated_usd: ".036246", finished_at: new Date().toISOString() }, error: null });
    m.rpc.mockImplementation(async () => ({ data: { action: "cache", id: "repaired", final_prompt: m.update.mock.calls[0][0].final_prompt }, error: null }));
    const plan = await planFeedCampaign(input);
    expect(plan.optimizer.attemptId).toBe("repaired"); expect(plan.posts[8].subjects.map(subject => subject.reference)).toEqual(input.design.assignments[8]);
    expect(m.create).not.toHaveBeenCalled();
    expect(m.readEq).toHaveBeenCalledWith("user_id", input.userId); expect(m.readEq).toHaveBeenCalledWith("workspace_id", input.workspaceId);
    expect(m.readEq).toHaveBeenCalledWith("fingerprint", expect.stringMatching(/^[a-f0-9]{64}$/)); expect(m.readEq).toHaveBeenCalledWith("status", "rejected");
    const update = m.update.mock.calls[0][0]; expect(update.status).toBe("completed");
    for (const field of ["estimated_usd", "reserved_usd", "input_tokens", "output_tokens", "provider_response_id", "finished_at"]) expect(update).not.toHaveProperty(field);
  });
  it.each(["unaccounted", "unsafe"])("never promotes an %s rejected candidate", async kind => {
    const input = await fixture(), value = generated(input); value.posts[0].subjects[0].reference = 1;
    m.rejected.mockResolvedValue({ data: { id: "rejected", final_prompt: JSON.stringify(value), estimated_usd: kind === "unaccounted" ? null : ".036246", finished_at: new Date().toISOString() }, error: null });
    m.rpc.mockResolvedValue({ data: { action: "budget" }, error: null });
    await expect(planFeedCampaign(input)).rejects.toThrow("optimizer_budget_limit"); expect(m.update).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  });
  it("plans nine images in one vision call, accounts actual usage before returning and uses no ordinary image key", async () => {
    const input = await fixture(); input.design.font = "playfair";
    m.create.mockResolvedValue({ id: "response", model: "gpt-6.1-sol", status: "completed", service_tier: "default", output_text: JSON.stringify(generated(input)), usage: { input_tokens: 8000, output_tokens: 2000, input_tokens_details: { cached_tokens: 4000 } } });
    const plan = await planFeedCampaign(input);
    expect(plan.posts).toHaveLength(9); expect(plan.optimizer.attemptId).toBe("attempt");
    expect(m.create).toHaveBeenCalledTimes(1); expect(m.client).toHaveBeenCalledWith({ apiKey: "dedicated-optimizer-test-key", maxRetries: 0, timeout: 60000 });
    const call = m.create.mock.calls[0][0]; expect(call.model).toBe("gpt-6.1-sol"); expect(call.store).toBe(false);
    expect(JSON.parse(call.input[0].content[0].text)).not.toHaveProperty("font");
    expect(call.instructions).toContain("one coherent type family"); expect(call.instructions).toContain("Avoid grunge, distressed"); expect(call.instructions).not.toContain("selected actual font");
    expect(call.input[0].content.filter((item: { type: string }) => item.type === "input_image")).toHaveLength(2);
    expect(call.input[0].content[0].text).toContain("Chrismas Themed"); expect(call.text.format.type).toBe("json_schema");
    expect(m.rpc).toHaveBeenCalledWith("maro_optimizer_reserve", expect.objectContaining({ p_user: "owner", p_workspace: "workspace-a", p_request_key: "feed-plan:request", p_module: "reklama" }));
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", version: "maro-feed-plan/1", input_tokens: 8000, cached_tokens: 4000, output_tokens: 2000, estimated_usd: .0284 }));
  });
  it("validates and reuses the private durable plan cache without another provider call", async () => {
    const input = await fixture(); m.rpc.mockResolvedValue({ data: { action: "cache", id: "cached", final_prompt: JSON.stringify(generated(input)) } });
    expect((await planFeedCampaign(input)).optimizer.attemptId).toBe("cached"); expect(m.create).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
  });
  it.each(["budget", "busy", "conflict", "failed", "paused"])("blocks provider spend when optimizer admission says %s", async action => {
    const input = await fixture(); m.rpc.mockResolvedValue({ data: { action } });
    await expect(planFeedCampaign(input)).rejects.toThrow(); expect(m.create).not.toHaveBeenCalled();
  });
  it("fails before admission when the audience, global switch, key or circuit disallows optimization", async () => {
    const input = await fixture(); vi.stubEnv("MARO_OPTIMIZER_ENABLED", "false");
    await expect(planFeedCampaign(input)).rejects.toThrow("optimizer_unavailable");
    vi.stubEnv("MARO_OPTIMIZER_ENABLED", "true"); vi.stubEnv("MARO_OPTIMIZER_OPENAI_API_KEY", "");
    await expect(planFeedCampaign(input)).rejects.toThrow("optimizer_unavailable");
    vi.stubEnv("MARO_OPTIMIZER_OPENAI_API_KEY", "dedicated-optimizer-test-key"); m.circuit.mockResolvedValue({ ok: false });
    await expect(planFeedCampaign(input)).rejects.toThrow("optimizer_unavailable");
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  });
  it("records a specific private rejection and candidate, keeping timeout uncertainty without leaking provider errors", async () => {
    const input = await fixture(), value = generated(input); value.posts[1].concept = value.posts[0].concept;
    m.create.mockResolvedValueOnce({ model: "gpt-6.1-sol", status: "completed", output_text: JSON.stringify(value), usage: { input_tokens: 1000, output_tokens: 1000 } });
    await expect(planFeedCampaign(input)).rejects.toThrow("feed_plan_invalid");
    expect(m.update).toHaveBeenLastCalledWith(expect.objectContaining({ status: "rejected", error_code: "feed_plan_repeated", final_prompt: JSON.stringify(value), estimated_usd: .012 }));
    m.create.mockRejectedValueOnce(new Error("PRIVATE API KEY OR BRAND INPUT"));
    await expect(planFeedCampaign(input)).rejects.toThrow("optimizer_unavailable");
    expect(m.update).toHaveBeenLastCalledWith(expect.objectContaining({ status: "uncertain", error_code: "optimizer_cost_uncertain" }));
    expect(JSON.stringify(m.update.mock.calls)).not.toContain("PRIVATE API KEY");
  });
  it("retains a valid visual plan while removing unsupported copy and repairing catalog aliases in one call", async () => {
    const input = await fixture(), value = generated(input); value.posts[3].headline = "Më shumë fibra."; value.posts[0].subjects[0].product = "Wrong alias for the single original";
    m.create.mockResolvedValueOnce({ model: "gpt-6.1-sol", status: "completed", output_text: JSON.stringify(value), usage: { input_tokens: 1000, output_tokens: 1000 } });
    const result = await planFeedCampaign(input);
    expect(result.posts[3].headline).toBe(""); expect(result.posts[0].subjects[0].product).toBe(input.design.assets[0].label);
    expect(m.create).toHaveBeenCalledTimes(1); expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
  });
  it("never accepts an unaccounted plan or an invalid cached plan", async () => {
    const input = await fixture();
    m.create.mockResolvedValue({ model: "gpt-6.1-sol", status: "completed", output_text: JSON.stringify(generated(input)), usage: { input_tokens: 1000, output_tokens: 1000 } });
    m.saved.mockResolvedValue({ error: true }); await expect(planFeedCampaign(input)).rejects.toThrow("optimizer_unavailable");
    m.rpc.mockResolvedValue({ data: { action: "cache", id: "cached", final_prompt: "{}" } });
    await expect(planFeedCampaign(input)).rejects.toThrow("optimizer_unavailable"); expect(m.create).toHaveBeenCalledTimes(1);
  });
});
