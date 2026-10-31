import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCanonicalImagePrompt } from "@/lib/generation/v1ImagePrompt";
import { parseV1ImageRequest, resolveV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { imazhRequest, modelRow } from "./helpers/v1ImageFixtures";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), finished: vi.fn(), create: vi.fn(), circuit: vi.fn(), client: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { create: mocks.create }; constructor(options: unknown) { mocks.client(options); } } }));
vi.mock("@/lib/security/circuitBreaker", () => ({ assertCircuitAllows: mocks.circuit }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ rpc: mocks.rpc, from: () => ({ update: mocks.update }) }) }));
import { optimizeImageCompilation } from "@/lib/prompt-optimizer/server";
async function fixture() {
  const trusted = await resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, workspaceId: "workspace-a" }), "owner", {
    loadModels: async () => [modelRow()], resolveWorkspace: async () => "workspace-a", resolveReference: vi.fn(), loadPreset: vi.fn(),
  });
  const config = { system: { id: "live", tool_id: "maro_imazh", version_label: "v1", status: "live", content: "PRIVATE ENGINE" }, layers: [] };
  const context = { brainText: "Long private context. ".repeat(2000), protectedBrainText: 'Brand: Maro; language: shqip; avoid invented discounts', references: [] };
  const request = { ...trusted.snapshot, useBrain: true };
  return { request, compilation: buildCanonicalImagePrompt(request, config, context) };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("MARO_OPTIMIZER_ENABLED", "true"); vi.stubEnv("MARO_OPTIMIZER_OPENAI_API_KEY", "dedicated-test-key"); vi.stubEnv("MARO_OPTIMIZER_USER_IDS", "owner");
  vi.stubEnv("MARO_OPTIMIZER_AUDIENCE", "allowlist");
  mocks.circuit.mockResolvedValue({ ok: true });
  mocks.rpc.mockResolvedValue({ data: { action: "run", id: "attempt" }, error: null });
  const chain = { eq: vi.fn(), select: vi.fn(), single: mocks.finished }; chain.eq.mockReturnValue(chain); chain.select.mockReturnValue(chain);
  mocks.finished.mockResolvedValue({ data: { id: "attempt" }, error: null });
  mocks.update.mockReturnValue(chain);
  mocks.create.mockResolvedValue({ id: "resp", model: "gpt-6.1-sol", status: "completed", output_text: JSON.stringify({ context: "Short accurate context." }),
    usage: { input_tokens: 10000, input_tokens_details: { cached_tokens: 5000 }, output_tokens: 1000 }, service_tier: "default" });
});
afterEach(() => vi.unstubAllEnvs());
describe("background context optimization accounting", () => {
  it("uses only the dedicated key, persists all usage before accepting output, and hashes the exact final prompt", async () => {
    const f = await fixture();
    const result = await optimizeImageCompilation(f.request, f.compilation, "transport-key");
    expect(result.prompt.length).toBeLessThanOrEqual(30000); expect(result.prompt).toContain("PRIVATE ENGINE");
    expect(result.prompt).toContain("avoid invented discounts"); expect(result.prompt.endsWith(imazhRequest.prompt)).toBe(true);
    expect(result.provenance.optimizer).toMatchObject({ attemptId: "attempt", sourceCharacters: f.compilation.prompt.length, cacheHit: false });
    expect(result.provenance.promptHash).not.toBe(f.compilation.provenance.promptHash);
    expect(mocks.client).toHaveBeenCalledWith({ apiKey: "dedicated-test-key", maxRetries: 0, timeout: 60000 });
    expect(mocks.rpc).toHaveBeenCalledWith("maro_optimizer_reserve", expect.objectContaining({ p_user: "owner", p_workspace: "workspace-a", p_request_key: "transport-key" }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-6.1-sol", store: false, service_tier: "default", reasoning: { effort: "low" } }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", input_tokens: 10000, cached_tokens: 5000, output_tokens: 1000, estimated_usd: 0.0205 }));
  });
  it("reuses a same-scope durable cache with no API spend", async () => {
    const f = await fixture(); mocks.rpc.mockResolvedValue({ data: { action: "cache", id: "cached", final_prompt: "CACHED PRIVATE PROMPT" } });
    const result = await optimizeImageCompilation(f.request, f.compilation);
    expect(result.prompt).toBe("CACHED PRIVATE PROMPT"); expect(result.provenance.optimizer?.cacheHit).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["budget", "busy", "conflict", "failed"])("never calls a provider after denied admission: %s", async action => {
    const f = await fixture(); mocks.rpc.mockResolvedValue({ data: { action } });
    await expect(optimizeImageCompilation(f.request, f.compilation)).rejects.toThrow(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("accounts rejected overlength output and retains timeout uncertainty without leaking provider text", async () => {
    const f = await fixture(); const response = await mocks.create(); mocks.create.mockClear();
    mocks.create.mockResolvedValueOnce({ ...response, output_text: JSON.stringify({ context: "x".repeat(30001) }) });
    await expect(optimizeImageCompilation(f.request, f.compilation)).rejects.toThrow("optimizer_unavailable");
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ status: "rejected", estimated_usd: 0.0205, final_prompt: null }));
    mocks.create.mockRejectedValueOnce(new Error("PRIVATE PROVIDER ERROR WITH KEY"));
    await expect(optimizeImageCompilation(f.request, f.compilation)).rejects.toThrow("optimizer_unavailable");
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ status: "uncertain", error_code: "optimizer_cost_uncertain" }));
    expect(JSON.stringify(mocks.update.mock.calls)).not.toContain("PRIVATE PROVIDER ERROR");
  });
  it("does no provider or database work for non-pilot users, paused AI or missing key", async () => {
    const f = await fixture();
    const disabled = await optimizeImageCompilation({ ...f.request, userId: "other" }, f.compilation);
    expect(disabled).toBe(f.compilation); expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.circuit.mockResolvedValue({ ok: false });
    await expect(optimizeImageCompilation(f.request, f.compilation)).rejects.toThrow("optimizer_unavailable");
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("fails closed if the durable usage receipt cannot be saved", async () => {
    const f = await fixture(); mocks.finished.mockResolvedValue({ error: true });
    await expect(optimizeImageCompilation(f.request, f.compilation)).rejects.toThrow("optimizer_unavailable");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ estimated_usd: 0.0205 }));
  });
  it("does not fall back to the ordinary image key when the dedicated key disappears", async () => {
    const f = await fixture(); vi.stubEnv("MARO_OPTIMIZER_OPENAI_API_KEY", ""); vi.stubEnv("OPENAI_API_KEY", "ordinary-image-key");
    await expect(optimizeImageCompilation(f.request, f.compilation)).rejects.toThrow("optimizer_unavailable");
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("attributes an all-audience user's provider call and cache fingerprint to that user's own workspace", async () => {
    const f = await fixture(); vi.stubEnv("MARO_OPTIMIZER_AUDIENCE", "all");
    await optimizeImageCompilation(f.request, f.compilation, "owner-request");
    const ownerFingerprint = mocks.rpc.mock.calls[0][1].p_fingerprint;
    const request = { ...f.request, userId: "another-user", workspaceId: "workspace-b" };
    await optimizeImageCompilation(request, f.compilation, "other-request");
    expect(mocks.rpc).toHaveBeenLastCalledWith("maro_optimizer_reserve", expect.objectContaining({ p_user: "another-user", p_workspace: "workspace-b", p_request_key: "other-request" }));
    expect(mocks.rpc.mock.calls[1][1].p_fingerprint).not.toBe(ownerFingerprint);
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
  it("keeps budget denial ahead of provider spend for users outside the original pilot", async () => {
    const f = await fixture(); vi.stubEnv("MARO_OPTIMIZER_AUDIENCE", "all"); mocks.rpc.mockResolvedValue({ data: { action: "budget" } });
    await expect(optimizeImageCompilation({ ...f.request, userId: "another-user", workspaceId: "workspace-b" }, f.compilation)).rejects.toThrow("optimizer_budget_limit");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
