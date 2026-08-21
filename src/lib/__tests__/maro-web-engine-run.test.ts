import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiGenerateRequest } from "@/lib/ai/types";
import { WEB_PARITY_MARKERS } from "@/lib/engine/webCompile";
import { WEB_PARITY_FIXTURES } from "@/lib/engine/parityFixtures";
import { runWebEngineInternalGeneration, type WebEngineProviderCall } from "@/lib/engine/webEngineRun";
import {
  buildInitialExecutionTelemetry,
  stampJobExecutionTelemetry,
} from "@/lib/engine/executionTelemetry";
import { resolveWebEffectiveExecution } from "@/lib/engine/webExecution";

const VALID_PAGE = `===PAGE===
SLUG: home
NAME: Home
---HTML---
<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body><h1>Home</h1></body></html>
===END===`;

function webBody(overrides: Partial<AiGenerateRequest> = {}): AiGenerateRequest {
  return {
    businessName: "X",
    category: "generic",
    language: "sq",
    goal: "Site",
    userPrompt: "Site",
    primaryColor: "#253FDA",
    ...overrides,
  };
}

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  const { buildWebTestContext } = await import("@/lib/engine/parityFixtures");
  return {
    ...actual,
    loadCompileContext: vi.fn(async () => buildWebTestContext()),
  };
});

vi.mock("@/lib/generation/jobs", () => ({
  getJob: vi.fn(async () => ({
    id: "job-1",
    metadata: { execution: { configured_pipeline: "engine", effective_execution: "legacy" } },
  })),
  updateJob: vi.fn(async () => undefined),
}));

describe("runWebEngineInternalGeneration (mocked provider)", () => {
  const provider = vi.fn<WebEngineProviderCall>(async () => ({ text: VALID_PAGE }));

  beforeEach(() => {
    provider.mockClear();
  });

  it("simple generation: compile → map → provider → parse", async () => {
    const fixture = WEB_PARITY_FIXTURES.find((f) => f.id === "web-simple")!;
    const result = await runWebEngineInternalGeneration({
      body: webBody(fixture.engine.webRequest ?? {}),
      userId: "user-1",
      selections: fixture.engine.selections,
      claudeModel: "opus-4-8",
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.providerRequestCount).toBe(1);
    }
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("mapped Claude request includes system contract and business user content", async () => {
    const fixture = WEB_PARITY_FIXTURES.find((f) => f.id === "web-simple")!;
    await runWebEngineInternalGeneration({
      body: webBody(fixture.engine.webRequest ?? {}),
      userId: "user-1",
      selections: fixture.engine.selections,
      claudeModel: "opus-4-8",
      provider,
    });

    const call = provider.mock.calls[0]?.[0];
    expect(call?.system).toContain(WEB_PARITY_MARKERS.pageDelimiter);
    expect(call?.system).toContain("elite web designer");
    expect(call?.user).toContain(WEB_PARITY_MARKERS.businessDetails);
    expect(call?.user).toContain(fixture.engine.userPrompt);
  });

  it("passes maroWeb reference images through the compiler to Claude", async () => {
    const referenceImages = [
      "https://project.supabase.co/storage/v1/object/public/generations/public/project-assets/user-1/brand.png",
      "https://project.supabase.co/storage/v1/object/public/generations/public/project-assets/user-1/product.webp",
    ];
    await runWebEngineInternalGeneration({
      body: webBody({ referenceImages }),
      userId: "user-1",
      claudeModel: "opus-4-8",
      provider,
    });

    const call = provider.mock.calls[0]?.[0];
    expect(call?.imageUrls).toEqual(referenceImages);
    expect(call?.user).toContain("REFERENCE IMAGES (2 attached)");
  });

  it("Fort brief lands in user message when enabled", async () => {
    const fixture = WEB_PARITY_FIXTURES.find((f) => f.id === "web-fort")!;
    await runWebEngineInternalGeneration({
      body: webBody(fixture.engine.webRequest ?? {}),
      userId: "user-1",
      selections: fixture.engine.selections,
      fort: fixture.engine.fort,
      claudeModel: "opus-4-8",
      provider,
    });

    const call = provider.mock.calls[0]?.[0];
    expect(call?.user).toContain(WEB_PARITY_MARKERS.fortHeader);
    expect(call?.system).not.toContain(WEB_PARITY_MARKERS.fortHeader);
  });

  it("compiler failure: provider call count = 0", async () => {
    const { loadCompileContext } = await import("@/lib/engine/storage");
    vi.mocked(loadCompileContext).mockRejectedValueOnce(new Error("compile_context_failed"));

    const result = await runWebEngineInternalGeneration({
      body: webBody(),
      userId: "user-1",
      claudeModel: "opus-4-8",
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("compile");
      expect(result.providerRequestCount).toBe(0);
    }
    expect(provider).not.toHaveBeenCalled();
  });

  it("map failure: provider call count = 0", async () => {
    const mapMod = await import("@/lib/engine/adapters/mapBrief");
    const spy = vi.spyOn(mapMod, "mapEngineBriefToProviderRequest").mockReturnValueOnce(null);

    const result = await runWebEngineInternalGeneration({
      body: webBody(),
      userId: "user-1",
      claudeModel: "opus-4-8",
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("map");
      expect(result.providerRequestCount).toBe(0);
    }
    expect(provider).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("provider failure: exactly one provider call, no retry", async () => {
    const failingProvider = vi.fn(async () => {
      throw new Error("anthropic_down");
    });

    const result = await runWebEngineInternalGeneration({
      body: webBody(),
      userId: "user-1",
      claudeModel: "opus-4-8",
      provider: failingProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("provider");
      expect(result.providerRequestCount).toBe(1);
    }
    expect(failingProvider).toHaveBeenCalledTimes(1);
  });

  it("malformed HTML: one provider call then parse failure", async () => {
    const badProvider = vi.fn(async () => ({ text: "no html here" }));

    const result = await runWebEngineInternalGeneration({
      body: webBody(),
      userId: "user-1",
      claudeModel: "opus-4-8",
      provider: badProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("parse");
      expect(result.providerRequestCount).toBe(1);
      expect(result.code).toBe("empty_html");
    }
    expect(badProvider).toHaveBeenCalledTimes(1);
  });
});

describe("execution telemetry stamps", () => {
  it("distinguishes legacy, shadow_legacy, and engine_internal labels", () => {
    const legacy = resolveWebEffectiveExecution({
      configuredPipeline: "legacy",
      promptCompilerV2: false,
      userId: "u1",
      internalCanaryEligible: false,
    });
    const shadow = resolveWebEffectiveExecution({
      configuredPipeline: "shadow",
      promptCompilerV2: false,
      userId: "u1",
      internalCanaryEligible: false,
    });
    const engine = resolveWebEffectiveExecution({
      configuredPipeline: "engine",
      promptCompilerV2: true,
      userId: "u1",
      internalCanaryEligible: true,
    });

    expect(legacy.label).toBe("legacy");
    expect(shadow.label).toBe("shadow_legacy");
    expect(engine.label).toBe("engine_internal");
  });

  it("stamps generation_jobs.metadata.execution", async () => {
    const { updateJob } = await import("@/lib/generation/jobs");
    await stampJobExecutionTelemetry(
      "job-1",
      buildInitialExecutionTelemetry({
        configuredPipeline: "engine",
        effectiveExecution: "engine_internal",
        internalCanary: true,
        model: "opus-4-8",
        compiler: "maro_engine_v1",
      })
    );

    expect(updateJob).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          execution: expect.objectContaining({
            effective_execution: "engine_internal",
            compiler: "maro_engine_v1",
            internal_canary: true,
            provider_request_count: 0,
          }),
        }),
      })
    );
  });
});

describe("duplicate-provider protection invariant", () => {
  it("engine provider failure does not invoke a second provider call", async () => {
    const failingProvider = vi.fn(async () => {
      throw new Error("anthropic_down");
    });

    await runWebEngineInternalGeneration({
      body: webBody(),
      userId: "user-1",
      claudeModel: "opus-4-8",
      provider: failingProvider,
    });

    expect(failingProvider).toHaveBeenCalledTimes(1);
  });
});
