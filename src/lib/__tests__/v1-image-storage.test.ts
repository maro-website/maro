import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { imazhRequest, modelRow } from "./helpers/v1ImageFixtures";

const mock = vi.hoisted(() => ({
  from: vi.fn(), brain: vi.fn(), active: "owned", fail: "",
  rows: [] as unknown[], preset: null as Record<string, unknown> | null,
  queries: [] as Array<{ table: string; filters: Record<string, unknown> }>,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mock.from }) }));
vi.mock("@/lib/features/flags", () => ({ isFeatureEnabled: async () => false, FEATURE_PROMPT_COMPILER_V2: "test" }));
vi.mock("@/lib/engine/brainLoader", () => ({ loadBrainContext: mock.brain }));

let boundary: typeof import("@/lib/generation/v1ImageRequest");
let storage: typeof import("@/lib/engine/storage");
beforeAll(async () => {
  // Dummy credentials, with the SDK entirely mocked. Network is never used.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  vi.resetModules();
  boundary = await import("@/lib/generation/v1ImageRequest");
  storage = await import("@/lib/engine/storage");
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.clearAllMocks();
  mock.queries = [];
  mock.rows = [modelRow()];
  mock.active = "owned";
  mock.fail = "";
  mock.preset = { full_prompt: "Private instructions", target_tool: "reklama", active: true, status: "published" };
  mock.from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {};
    mock.queries.push({ table, filters });
    const result = () => {
      if (mock.fail === table) return { data: null, error: new Error("database unavailable") };
      const data = table === "tool_model_configs" ? mock.rows
        : table === "profiles" ? { active_workspace_id: mock.active }
        : table === "workspaces" ? filters.id === "owned" && filters.owner_id === "user" ? { id: "owned" } : null
        : table === "maro_prompts" ? mock.preset
        : [];
      return { data, error: null };
    };
    const query = {
      select: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; },
      in: () => query, order: () => query,
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
});

describe("real storage boundaries with mocked SDK", () => {
  it("checks explicit workspace ownership and does not silently fall back", async () => {
    await expect(boundary.resolveV1ImageRequest(boundary.parseV1ImageRequest({ ...imazhRequest, workspaceId: "other" }), "user"))
      .rejects.toMatchObject({ code: "forbidden_workspace", status: 403 });
    expect(mock.queries.find((query) => query.table === "workspaces")?.filters).toEqual({ id: "other", owner_id: "user" });
    expect(mock.queries.some((query) => query.table === "profiles")).toBe(false);
  });
  it("checks the active workspace belongs to the authenticated user too", async () => {
    mock.active = "other";
    await expect(boundary.resolveV1ImageRequest(boundary.parseV1ImageRequest(imazhRequest), "user")).rejects.toThrow("forbidden_workspace");
  });
  it.each(["profiles", "workspaces", "tool_model_configs"])("fails closed on %s read errors", async (table) => {
    mock.fail = table;
    await expect(boundary.resolveV1ImageRequest(boundary.parseV1ImageRequest(imazhRequest), "user")).rejects.toMatchObject({ status: 503 });
  });
  it.each([
    null, { active: false }, { status: "draft" }, { status: "archived" }, { target_tool: "logo" }, { full_prompt: "" },
  ])("rejects unpublishable or incompatible stored preset %j", async (change) => {
    mock.preset = change === null ? null : { ...mock.preset, ...change };
    await expect(boundary.resolveV1ImageRequest(boundary.parseV1ImageRequest({ ...imazhRequest, maroPrompt: { id: "preset" } }), "user"))
      .rejects.toThrow("invalid_preset");
  });
  it("loads a published compatible preset and reads model configuration once", async () => {
    const result = await boundary.resolveV1ImageRequest(boundary.parseV1ImageRequest({ ...imazhRequest, maroPrompt: { id: "preset" } }), "user");
    expect(result.presetPrompt).toBe("Private instructions");
    expect(result.snapshot.presetContentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mock.queries.filter((query) => query.table === "tool_model_configs")).toHaveLength(1);
  });
  it("Engine consumes the supplied configuration without reading model rows again", async () => {
    const { snapshot } = await boundary.resolveV1ImageRequest(boundary.parseV1ImageRequest(imazhRequest), "user");
    mock.queries = [];
    mock.rows = [];
    const context = await storage.loadCompileContext("maro_imazh", { trustedImageModel: snapshot.model });
    expect(context.model).toBe("gpt-image-2.5-flare");
    expect(context.models).toHaveLength(1);
    expect(context.models[0].modelId).toBe("gpt-image-2.5-flare");
    expect(context.trustedImageModel?.customerCredits).toBe(7);
    expect(mock.queries.some((query) => query.table === "tool_model_configs")).toBe(false);
    const { compileGenerationBrief } = await import("@/lib/engine/compiler");
    expect(compileGenerationBrief({ toolId: snapshot.module, model: snapshot.model.providerModelId, userPrompt: snapshot.prompt, selections: snapshot.selections }, context).estimatedCredits?.total).toBe(7);
  });
  it("Logo cannot load Brain even if an internal caller passes workspace context", async () => {
    await storage.loadCompileContext("maro_logo", { ownerUserId: "user", workspaceId: "owned" });
    expect(mock.brain).not.toHaveBeenCalled();
  });
});
