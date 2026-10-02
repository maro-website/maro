import { beforeEach, describe, expect, it, vi } from "vitest";
import { modelRow, imazhRequest, logoRequest } from "./helpers/v1ImageFixtures";

const mocks = vi.hoisted(() => ({
  storagePolicy: vi.fn(), brainPolicy: vi.fn(),
  rows: [] as unknown[], workspace: vi.fn(), reference: vi.fn(), preset: vi.fn(), auth: vi.fn(),
  prepare: vi.fn(), generate: vi.fn(), edit: vi.fn(), settle: vi.fn(), brain: vi.fn(),
  models: vi.fn(), log: vi.fn(), execution: vi.fn(), compileContext: vi.fn(), shadow: vi.fn(),
  canonical: vi.fn(), trace: vi.fn(), store: vi.fn(), fail: vi.fn(), costs: vi.fn(), telemetry: vi.fn(),
}));
vi.mock("@/lib/workspaces/accountPolicyServer", async (original) => ({
  ...await original<typeof import("@/lib/workspaces/accountPolicyServer")>(),
  requireStorageSpace: mocks.storagePolicy, requireBrainAccess: mocks.brainPolicy,
}));
vi.mock("@/lib/generation/v1ImagePersistence", async (original) => ({
  ...await original<typeof import("@/lib/generation/v1ImagePersistence")>(),
  storeV1ImageOutput: mocks.store, persistV1ImageHistory: mocks.log, settleV1ImageJob: mocks.settle, failV1ImageJob: mocks.fail,
}));
vi.mock("@/lib/generation/v1ImagePrompt", async (original) => ({
  ...await original<typeof import("@/lib/generation/v1ImagePrompt")>(),
  compileTrustedImageRequest: mocks.canonical, recordCanonicalImageTrace: mocks.trace,
}));
vi.mock("@/lib/engine/v1ImageModels", async (original) => ({
  ...await original<typeof import("@/lib/engine/v1ImageModels")>(),
  loadV1ImageModelRows: mocks.models,
}));
vi.mock("@/lib/generation/v1ImageRequest", async (original) => {
  const actual = await original<typeof import("@/lib/generation/v1ImageRequest")>();
  return { ...actual, resolveV1ImageRequest: (input: Parameters<typeof actual.resolveV1ImageRequest>[0], user: string) => actual.resolveV1ImageRequest(input, user, {
    loadModels: mocks.models, resolveWorkspace: mocks.workspace, resolveReference: mocks.reference, loadPreset: mocks.preset,
  }) };
});
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: vi.fn(() => { throw new Error("Unexpected database access"); }),
  getUserFromToken: mocks.auth, supabaseServerConfigured: () => true,
  getAppSettings: vi.fn(async () => ({ tool_prompts: {}, pricing: { options: { "reklama:format:ig-post": 0 } } })),
  getWorkspaceBrainProfile: mocks.brain, getWorkspaceBrand: mocks.brain, getWorkspaceSources: mocks.brain,
  incrementPromptUse: vi.fn(), logGeneration: mocks.log,
  uploadGeneratedImage: vi.fn(async () => "storage:generations/user/result.png"),
  resolveAssetListForClient: vi.fn(async () => ["https://test.invalid/result.png"]),
}));
vi.mock("@/lib/ai/openai", () => ({
  hasOpenAiKey: () => true, generateImages: mocks.generate, editImages: mocks.edit,
  OpenAIImageError: class extends Error {},
}));
vi.mock("@/lib/generation/orchestrator", () => ({
  prepareGeneration: mocks.prepare, settlePreparedGeneration: mocks.settle,
  recordCompletedGenerationCosts: mocks.costs,
  ensurePreparedGenerationTerminal: vi.fn(), guardErrorResponse: () => Response.json({ error: "guard" }, { status: 400 }),
}));
vi.mock("@/lib/engine/executionTelemetry", () => ({ buildInitialExecutionTelemetry: vi.fn(), stampJobExecutionTelemetry: mocks.telemetry }));
vi.mock("@/lib/engine/imageExecution", () => ({ resolveImageExecutionContext: mocks.execution }));
vi.mock("@/lib/engine/productionShadow", () => ({ maybeScheduleImageShadow: mocks.shadow }));
vi.mock("@/lib/engine/storage", () => ({ loadCompileContext: mocks.compileContext }));

import { POST } from "@/app/api/ai/image/route";
import { GET } from "@/app/api/ai/image/models/route";
import { buildImazhTestContext } from "@/lib/engine/imageParityFixtures";
import { buildTestContext } from "@/lib/engine/parityFixtures";

async function request(body: unknown) {
  return POST(new Request("http://localhost/api/ai/image", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test" }, body: JSON.stringify(body) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storagePolicy.mockResolvedValue({ usedBytes: 0, limitBytes: 1000000000 });
  mocks.brainPolicy.mockResolvedValue({ brainAccess: true });
  mocks.rows = [modelRow(), modelRow("sunburst"), modelRow("flare", "maro_logo")];
  mocks.models.mockImplementation(async (module: string) => mocks.rows.filter((row) => (row as { tool_id: string }).tool_id === module));
  mocks.workspace.mockResolvedValue("owned-workspace");
  mocks.auth.mockResolvedValue({ id: "user" });
  mocks.reference.mockResolvedValue({ dataUrl: "data:image/png;base64,TEST", mime: "image/png", digest: "digest", normalized: false });
  mocks.preset.mockResolvedValue(null);
  mocks.prepare.mockResolvedValue({ userId: "user", userEmail: "test@example.invalid", job: { id: "job" }, cost: 7, isFort: false });
  mocks.generate.mockResolvedValue(["BASE64"]);
  mocks.edit.mockResolvedValue(["BASE64"]);
  mocks.log.mockResolvedValue("generation");
  mocks.store.mockResolvedValue("storage:generations/user/job/output.png");
  mocks.settle.mockResolvedValue("finalized");
  mocks.fail.mockResolvedValue("released");
  mocks.costs.mockResolvedValue(undefined);
  mocks.telemetry.mockResolvedValue(undefined);
  mocks.brain.mockResolvedValue(null);
  mocks.trace.mockResolvedValue("private-trace");
  mocks.canonical.mockImplementation(async (trusted) => {
    const { buildCanonicalImagePrompt } = await import("@/lib/generation/v1ImagePrompt");
    const s = trusted.snapshot;
    const config = { system: { id: "production", version_label: "v1", tool_id: s.module, status: "live", content: "Private published instructions" }, layers: [] };
    return { config, compilation: buildCanonicalImagePrompt(s, config, { presetPrompt: trusted.presetPrompt,
      references: s.references.map((r: { id: string; digest: string }) => ({ ...r, source: "user" })) }),
      images: [...trusted.resolvedReferences.values()].map((r) => (r as { dataUrl: string }).dataUrl) };
  });
  mocks.execution.mockResolvedValue({ mode: "legacy", engineToolId: "maro_imazh", configuredPipeline: "legacy", scheduleShadowAfterSuccess: false });
  mocks.compileContext.mockImplementation(async (module, options) => ({
    ...(module === "maro_logo" ? buildTestContext("maro_logo") : buildImazhTestContext()),
    trustedImageModel: options.trustedImageModel,
  }));
});

describe("active route preflight before job/reservation/provider", () => {
  it.each(["storage", "brain"])("enforces the %s policy before reserving credits or calling a provider", async (kind) => {
    const { AccountPolicyError } = await import("@/lib/workspaces/accountPolicyServer");
    const status = kind === "storage" ? 413 : 403;
    const code = kind === "storage" ? "storage_quota_exceeded" : "brain_plan_required";
    (kind === "storage" ? mocks.storagePolicy : mocks.brainPolicy).mockRejectedValueOnce(new AccountPolicyError(code, status));
    const response = await request({ ...imazhRequest, useWorkspaceBrand: kind === "brain" });
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: code });
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.edit).not.toHaveBeenCalled();
  });
  it.each([null, {}, "a".repeat(64001)])("request validation does no financial or provider work (%#)", async (prompt) => {
    const response = await request({ ...imazhRequest, prompt });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ field: "prompt", requestId: expect.any(String) });
    for (const mock of [mocks.prepare, mocks.generate, mocks.edit, mocks.settle, mocks.fail, mocks.trace]) expect(mock).not.toHaveBeenCalled();
  });
  it.each(["flare", "sunburst"])("validates exact compiled boundaries for %s, generate and edit", async (model) => {
    const compile = mocks.canonical.getMockImplementation()!;
    for (const withReference of [false, true]) {
      for (const length of [31999, 32000, 32001]) {
        vi.clearAllMocks();
        mocks.canonical.mockImplementation(async (...args) => {
          const result = await compile(...args);
          return { ...result, compilation: { ...result.compilation, prompt: "x".repeat(length) } };
        });
        const response = await request({ ...imazhRequest, model, ...(withReference ? { attachments: ["storage:generations/user/refs/a.png"] } : {}) });
        if (length > 32000) {
          expect(response.status).toBe(400);
          expect(await response.json()).toMatchObject({ error: "prompt_too_long", field: "prompt",
            userPromptLength: imazhRequest.prompt.length, compiledPromptLength: length, maxCompiledPromptLength: 32000, requestId: expect.any(String) });
          for (const mock of [mocks.prepare, mocks.generate, mocks.edit, mocks.settle, mocks.fail, mocks.trace]) expect(mock).not.toHaveBeenCalled();
        } else {
          expect(await response.text()).toContain('"ok":true');
          expect(withReference ? mocks.edit : mocks.generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ prompt: "x".repeat(length) }));
        }
      }
    }
  });
  it("counts internal instructions and emits private-safe rejection diagnostics", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      const prompt = "PRIVATE-USER-".padEnd(31999, "x");
      const response = await request({ ...imazhRequest, prompt });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.compiledPromptLength).toBeGreaterThan(32000);
      const diagnostic = JSON.parse(spy.mock.calls.at(-1)![0]);
      expect(diagnostic).toMatchObject({ requestId: body.requestId, field: "prompt", code: "prompt_too_long", userPromptLength: 31999,
        compiledPromptLength: body.compiledPromptLength, model: "gpt-image-2.5-flare", hasReferences: false });
      expect(JSON.stringify(spy.mock.calls)).not.toContain("PRIVATE-USER");
      expect(JSON.stringify(spy.mock.calls)).not.toContain("Private published instructions");
      expect(mocks.prepare).not.toHaveBeenCalled();
      expect(mocks.generate).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
  it("accepts a long input through the actual compiler, with one provider execution", async () => {
    expect(await (await request({ ...imazhRequest, prompt: "a".repeat(8000) })).text()).toContain('"ok":true');
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.generate.mock.calls[0][0].prompt).toContain("a".repeat(8000));
  });
  it.each([
    { model: "unknown" }, { model: "gpt-image-2" }, { n: 4 }, { quality: "low" },
    { selections: { format: "zero-credit-bypass" } }, { selections: { speed: "free" } },
    { cost: 0 }, { credits: 0 }, { selections: null }, { prompt: {} },
    { maroPrompt: { id: "unpublished" } },
  ])("rejects %j without side effects", async (change) => {
    const response = await request({ ...imazhRequest, ...change });
    expect(response.status).toBe(400);
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.edit).not.toHaveBeenCalled();
  });
  it.each(["missing", "zero", "disabled"])("rejects %s authoritative configuration before side effects", async (mode) => {
    mocks.rows = mode === "missing" ? [] : [{ ...modelRow(), ...(mode === "zero" ? { cost_metadata: { customerCredits: 0 } } : { enabled: false }) }];
    expect((await request(imazhRequest)).status).toBe(503);
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects unauthorized references before reservation", async () => {
    mocks.reference.mockRejectedValue(new Error("forbidden_reference"));
    expect((await request({ ...imazhRequest, attachments: ["storage:generations/other/refs/a.png"] })).status).toBe(403);
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.edit).not.toHaveBeenCalled();
  });
  it("requires authentication even in development", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await request(imazhRequest)).status).toBe(401);
    expect(mocks.models).not.toHaveBeenCalled();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("a configured 6-credit price reaches the next route reservation, execution and response", async () => {
    mocks.rows = [modelRow("flare", "maro_imazh", 6), modelRow("sunburst", "maro_imazh", 5)];
    const response = await request(imazhRequest);
    expect(await response.text()).toContain('"creditsSpent":6');
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ cost: 6, metadata: expect.objectContaining({ v1_request: expect.objectContaining({ model: expect.objectContaining({ customerCredits: 6 }) }) }) }));
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-image-2.5-flare" }));
    expect(mocks.log).toHaveBeenCalledExactlyOnceWith("job");
    expect(mocks.settle).toHaveBeenCalledExactlyOnceWith("job");
  });
  it.each(["flare", "sunburst"])("bills and executes exactly the frozen %s snapshot", async (model) => {
    // Change authoritative config after prepare; execution must retain the resolved values.
    mocks.prepare.mockImplementation(async () => {
      mocks.rows = [modelRow("flare", "maro_imazh", 99)];
      return { userId: "user", userEmail: "test@example.invalid", job: { id: "job" } };
    });
    const response = await request({ ...imazhRequest, model });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('"ok":true');
    expect(mocks.models).toHaveBeenCalledTimes(1);
    const prepared = mocks.prepare.mock.calls[0][0];
    expect(prepared).toMatchObject({ cost: 7, model: `gpt-image-2.5-${model}`, metadata: { v1_request: { logicalModel: model, model: { customerCredits: 7 } } } });
    expect(Object.isFrozen(prepared.metadata.v1_request)).toBe(true);
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ model: prepared.metadata.v1_request.model.providerModelId, n: 1, quality: "high", size: "1024x1536" }));
    expect(mocks.settle).toHaveBeenCalledExactlyOnceWith("job");
    expect(mocks.costs).toHaveBeenCalledWith(expect.objectContaining({ cost: 7, model: `gpt-image-2.5-${model}` }));
    expect(mocks.brain).not.toHaveBeenCalled();
  });
  it.each(["legacy", "engine_internal"])("Logo cannot load Brain in %s, even with a tampered true flag", async (mode) => {
    mocks.execution.mockResolvedValue({ mode, engineToolId: "maro_logo", configuredPipeline: "legacy", scheduleShadowAfterSuccess: false });
    const response = await request({ ...logoRequest(), useWorkspaceBrand: true });
    expect(await response.text()).toContain('"ok":true');
    expect(mocks.brain).not.toHaveBeenCalled();
    expect(mocks.prepare.mock.calls[0][0].metadata.v1_request.useBrain).toBe(false);
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-image-2.5-flare" }));
    expect(mocks.compileContext).not.toHaveBeenCalled();
  });
  it("does not let retained shadow configuration choose the V1 prompt", async () => {
    mocks.execution.mockResolvedValue({ mode: "legacy", engineToolId: "maro_imazh", configuredPipeline: "shadow", scheduleShadowAfterSuccess: true });
    const response = await request(imazhRequest);
    expect(await response.text()).toContain('"ok":true');
    expect(mocks.shadow).not.toHaveBeenCalled();
    expect(mocks.execution).not.toHaveBeenCalled();
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("records the exact executable prompt privately and omits it from user history and response", async () => {
    const response = await request(imazhRequest);
    const text = await response.text();
    const sent = mocks.generate.mock.calls[0][0].prompt;
    expect(mocks.trace.mock.calls[0][2].prompt).toBe(sent);
    expect(mocks.log).toHaveBeenCalledExactlyOnceWith("job");
    expect(mocks.prepare.mock.calls[0][0].metadata.v1_request.prompt).toBe(imazhRequest.prompt);
    expect(text).not.toContain("Private published instructions");
    expect(JSON.stringify(mocks.prepare.mock.calls[0][0].metadata)).not.toContain("Private published instructions");
  });
  it("fails configuration before any reservation or provider call", async () => {
    mocks.canonical.mockRejectedValue(new Error("missing production prompt"));
    expect((await request(imazhRequest)).status).toBe(503);
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("does not spend at the provider if the required private trace cannot be recorded", async () => {
    mocks.trace.mockRejectedValue(new Error("trace unavailable"));
    const body = await (await request(imazhRequest)).text();
    expect(body).toContain('"ok":false');
    expect(body).not.toContain("generation_started");
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledExactlyOnceWith("job", "execution_trace_unavailable");
  });
  it.each(["legacy", "engine_internal"])("forwards the same resolved Sunburst ID for reference edits in %s", async (mode) => {
    mocks.execution.mockResolvedValue({ mode, engineToolId: "maro_imazh", configuredPipeline: "legacy", scheduleShadowAfterSuccess: false });
    const response = await request({ ...imazhRequest, model: "sunburst", attachments: ["storage:generations/user/refs/a.png"] });
    expect(await response.text()).toContain('"ok":true');
    expect(mocks.edit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ model: "gpt-image-2.5-sunburst", images: ["data:image/png;base64,TEST"], n: 1, quality: "high" }));
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.models).toHaveBeenCalledTimes(1);
  });
});

describe("V1 durability failure injection", () => {
  it("provider failure releases without storage, history or charge", async () => {
    mocks.generate.mockRejectedValue(new Error("private provider detail"));
    const text = await (await request(imazhRequest)).text();
    expect(text).toContain('"error":"provider_failed"');
    expect(text).toContain('"refunded":true');
    expect(text.indexOf("generation_started")).toBeLessThan(text.indexOf("provider_failed"));
    expect(text).not.toContain("private provider detail");
    expect(mocks.store).not.toHaveBeenCalled(); expect(mocks.log).not.toHaveBeenCalled(); expect(mocks.settle).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledWith("job", "provider_failed");
  });
  it("storage failure cannot fall back to inline success or charge", async () => {
    mocks.store.mockRejectedValue(new Error("upload failed"));
    const text = await (await request(imazhRequest)).text();
    expect(text).toContain('"error":"storage_failed"'); expect(text).not.toContain("BASE64");
    expect(mocks.log).not.toHaveBeenCalled(); expect(mocks.settle).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledWith("job", "storage_failed");
  });
  it("history failure retains stored output but does not finalize", async () => {
    mocks.log.mockRejectedValue(new Error("insert failure"));
    expect(await (await request(imazhRequest)).text()).toContain('"error":"history_failed"');
    expect(mocks.store).toHaveBeenCalledOnce(); expect(mocks.settle).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledWith("job", "history_failed");
  });
  it("uncertain history commit remains recoverable instead of claiming a refund", async () => {
    mocks.log.mockRejectedValue(new Error("lost response")); mocks.fail.mockResolvedValue("settlement_pending");
    const text = await (await request(imazhRequest)).text();
    expect(text).toContain('"recoverable":true'); expect(text).toContain('"refunded":false');
  });
  it.each(["settlement_pending", "invalid_state", "evidence_missing"])("%s preserves durable identifiers and never releases", async (state) => {
    mocks.settle.mockResolvedValue(state);
    const text = await (await request(imazhRequest)).text();
    expect(text).toContain('"ok":false'); expect(text).toContain('"generationId":"generation"');
    expect(text).toContain('"storageRefs":["storage:generations/user/job/output.png"]');
    expect(mocks.fail).not.toHaveBeenCalled(); expect(mocks.costs).not.toHaveBeenCalled();
  });
  it("telemetry and accounting exceptions cannot corrupt verified success", async () => {
    mocks.telemetry.mockRejectedValue(new Error("telemetry unavailable")); mocks.costs.mockRejectedValue(new Error("analytics unavailable"));
    expect(await (await request(imazhRequest)).text()).toContain('"ok":true');
    expect(mocks.settle).toHaveBeenCalledOnce(); expect(mocks.fail).not.toHaveBeenCalled();
  });
  it("verified already-finalized settlement is normal recoverable success", async () => {
    mocks.settle.mockResolvedValue("already_finalized");
    const text = await (await request(imazhRequest)).text();
    expect(text).toContain('"ok":true'); expect(text).toContain('"generationId":"generation"'); expect(text).toContain('"model":"flare"');
    expect(mocks.fail).not.toHaveBeenCalled();
  });
  it("SSE cancellation cannot interrupt durable completion or trigger release", async () => {
    let finish!: (v: string[]) => void;
    mocks.generate.mockImplementation(() => new Promise<string[]>((resolve) => { finish=resolve; }));
    const response=await request(imazhRequest);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    await response.body!.cancel(); finish(["BASE64"]);
    await vi.waitFor(() => expect(mocks.settle).toHaveBeenCalledOnce());
    expect(mocks.fail).not.toHaveBeenCalled(); expect(mocks.log).toHaveBeenCalledOnce();
  });
});

describe("safe public model projection", () => {
  it("returns current labels/credits without provider IDs, metadata or prompts", async () => {
    const response = await GET(new Request("http://localhost/api/ai/image/models?toolId=reklama"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.models.map((model: { key: string }) => model.key)).toEqual(["flare", "sunburst"]);
    expect(JSON.stringify(body)).not.toMatch(/gpt-image|private|provider|metadata/);
  });
  it("does not reopen parked modules", async () => {
    expect((await GET(new Request("http://localhost/api/ai/image/models?toolId=web"))).status).toBe(403);
    expect(mocks.models).not.toHaveBeenCalled();
  });
});
