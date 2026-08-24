import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  IMAGE_PARITY_MARKERS,
  IMAGE_TEXT_OFF_WITH_REFERENCE,
  IMAGE_TEXT_OFF_WITH_WORKSPACE_BRAND_ASSET,
  WORKSPACE_BRAND_ASSET_DIRECTION,
} from "@/lib/engine/imageCompile";
import {
  compileImazhFixture,
  SAMPLE_IMAZ_DATA_URL,
  buildImazhTestContext,
} from "@/lib/engine/imageParityFixtures";
import {
  buildEngineCompileAttachments,
  enginePromptUsesReferenceAwareTextOff,
  runImageEngineInternalGeneration,
  type ImageEngineProviderCalls,
} from "@/lib/engine/imageEngineRun";
import {
  buildInitialExecutionTelemetry,
  stampJobExecutionTelemetry,
} from "@/lib/engine/executionTelemetry";
import { resolveImageEffectiveExecution } from "@/lib/engine/imageExecution";
import { DEFAULT_TOOL_PROMPTS, SAMPLE_WEB_BRAIN_PROFILE } from "@/lib/engine/parityFixtures";

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  const { buildImazhTestContext } = await import("@/lib/engine/imageParityFixtures");
  return {
    ...actual,
    loadCompileContext: vi.fn(async () => buildImazhTestContext()),
  };
});

vi.mock("@/lib/generation/jobs", () => ({
  getJob: vi.fn(async () => ({
    id: "job-imazh-1",
    metadata: { execution: { configured_pipeline: "engine", effective_execution: "legacy" } },
  })),
  updateJob: vi.fn(async () => undefined),
}));

describe("runImageEngineInternalGeneration (mocked provider)", () => {
  const generate = vi.fn(async () => ["BASE64_OUT"]);
  const edit = vi.fn(async () => ["BASE64_EDIT"]);
  const provider: ImageEngineProviderCalls = { generate, edit };

  beforeEach(() => {
    generate.mockClear();
    edit.mockClear();
  });

  it("E: simple generate → exactly one generateImages call", async () => {
    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Premium coffee bag on marble surface",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: false,
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      size: "1024x1536",
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerRequest.operation).toBe("generate");
      expect(result.providerRequestCount).toBe(1);
    }
    expect(generate).toHaveBeenCalledTimes(1);
    expect(edit).not.toHaveBeenCalled();
  });

  it("F: user-reference edit → one editImages with actual ref bytes", async () => {
    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Armani perfume bottle studio shot",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal", font: "handwritten" },
      model: "gpt-image-2",
      useBrain: false,
      attachments: [SAMPLE_IMAZ_DATA_URL],
      fetchedUrls: [],
      resolvedRefBytes: [SAMPLE_IMAZ_DATA_URL],
      n: 1,
      size: "1024x1536",
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerRequest.operation).toBe("edit");
      expect(result.finalPrompt).toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
    }
    expect(edit).toHaveBeenCalledTimes(1);
    const editCalls = edit.mock.calls as unknown as Array<[{ images: string[] }]>;
    expect(editCalls[0]?.[0].images).toEqual([SAMPLE_IMAZ_DATA_URL]);
    expect(editCalls[0]?.[0].images[0]).toContain("base64,");
    expect(generate).not.toHaveBeenCalled();
  });

  it("G: brain logo ref → edit path", async () => {
    const brainLogo = SAMPLE_IMAZ_DATA_URL;
    const ctx = buildImazhTestContext({
      brainProfile: {
        ...SAMPLE_WEB_BRAIN_PROFILE,
        brand: { ...SAMPLE_WEB_BRAIN_PROFILE.brand, logoUrl: brainLogo },
      },
    });
    const { loadCompileContext } = await import("@/lib/engine/storage");
    vi.mocked(loadCompileContext).mockResolvedValueOnce(ctx);

    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Brand-led social creative",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: true,
      brainLogoUrl: brainLogo,
      fetchedUrls: [],
      resolvedRefBytes: [brainLogo],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerRequest.prompt).toContain(WORKSPACE_BRAND_ASSET_DIRECTION);
      expect(result.providerRequest.prompt).toContain(IMAGE_TEXT_OFF_WITH_WORKSPACE_BRAND_ASSET);
      expect(result.providerRequest.prompt).not.toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
      expect(result.finalPrompt).toBe(result.providerRequest.prompt);
    }
    expect(edit).toHaveBeenCalledTimes(1);
    expect(generate).not.toHaveBeenCalled();
  });

  it("H: unusable requested refs → generate fallback, max one provider call", async () => {
    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Product in studio",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: false,
      attachments: ["https://cdn.example.com/missing.png"],
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerRequest.operation).toBe("generate");
      expect(result.providerRequest.fallbackFromEditToGenerate).toBe(true);
    }
    expect(generate).toHaveBeenCalledTimes(1);
    expect(edit).not.toHaveBeenCalled();
  });

  it("I: Text OFF + branded reference preserves reference-aware semantics", async () => {
    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Use attached perfume bottle",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal", font: "handwritten" },
      model: "gpt-image-2",
      useBrain: false,
      attachments: [SAMPLE_IMAZ_DATA_URL],
      resolvedRefBytes: [SAMPLE_IMAZ_DATA_URL],
      fetchedUrls: [],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(enginePromptUsesReferenceAwareTextOff(result.finalPrompt, true)).toBe(true);
      expect(result.finalPrompt).not.toContain(IMAGE_PARITY_MARKERS.textOn);
      expect(result.finalPrompt).not.toMatch(/typography style\./);
    }
  });

  it("J: Text ON + font unchanged", async () => {
    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Summer sale creative",
      selections: {
        model: "gpt-image-2",
        format: "ig-story",
        text: "on",
        font: "bold",
        speed: "normal",
      },
      model: "gpt-image-2",
      useBrain: false,
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalPrompt).toContain(IMAGE_PARITY_MARKERS.textOn);
      expect(result.finalPrompt).toContain("Bold Display typography style");
    }
  });

  it("K: Fort layers included in Engine provider prompt", async () => {
    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Luxury skincare campaign visual",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: false,
      fort: { enabled: true, values: { objective: "premium", mood: "calm" } },
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.brief.fort?.enabled).toBe(true);
      expect(result.finalPrompt).toContain("Luxury skincare campaign visual");
      expect(result.finalPrompt).toMatch(/DREJTIMI KREATIV|BRIEF EKSPERT/);
    }
  });

  it("M: Brain ON includes brain brief in Engine prompt", async () => {
    const ctx = buildImazhTestContext({ brainProfile: SAMPLE_WEB_BRAIN_PROFILE });
    const { loadCompileContext } = await import("@/lib/engine/storage");
    vi.mocked(loadCompileContext).mockResolvedValueOnce(ctx);

    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Product launch ad",
      selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: true,
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalPrompt).toContain(IMAGE_PARITY_MARKERS.brainHeader);
    }
  });

  it("N: preset prepended in Engine provider prompt", async () => {
    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Apply brand style to product shot",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: false,
      presetId: "preset-cinematic",
      presetPrompt: "Curated preset: cinematic product lighting, shallow depth of field.",
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalPrompt).toContain("Curated preset:");
    }
  });

  it("O/P: provider failure → one call, no retry", async () => {
    const failingProvider: ImageEngineProviderCalls = {
      generate: vi.fn(async () => {
        throw Object.assign(new Error("timeout"), { code: "timeout" });
      }),
      edit: vi.fn(async () => ["x"]),
    };

    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Simple hero",
      selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: false,
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      provider: failingProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("provider");
      expect(result.providerRequestCount).toBe(1);
    }
    expect(failingProvider.generate).toHaveBeenCalledTimes(1);
  });

  it("Q: compile failure → zero provider calls", async () => {
    const { loadCompileContext } = await import("@/lib/engine/storage");
    vi.mocked(loadCompileContext).mockRejectedValueOnce(new Error("compile_context_failed"));

    const result = await runImageEngineInternalGeneration({
      engineToolId: "maro_imazh",
      userId: "user-1",
      userPrompt: "Simple hero",
      selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      model: "gpt-image-2",
      useBrain: false,
      fetchedUrls: [],
      resolvedRefBytes: [],
      n: 1,
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("compile");
      expect(result.providerRequestCount).toBe(0);
    }
    expect(generate).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it("Engine provider prompt comes from Engine compile path", () => {
    const fixture = {
      id: "engine-source",
      toolId: "maro_imazh" as const,
      description: "engine source",
      legacy: {
        toolId: "maro_imazh" as const,
        userPrompt: "Minimal product hero shot",
        selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
        toolPrompts: DEFAULT_TOOL_PROMPTS,
      },
      engine: {
        toolId: "maro_imazh" as const,
        userPrompt: "Minimal product hero shot",
        selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      },
    };
    const { engineProvider } = compileImazhFixture(fixture);
    expect(engineProvider.prompt).toContain("Do not add any text");
  });

  it("U: compile attachments preserve data URLs for Engine reference resolution", () => {
    const attachments = buildEngineCompileAttachments([SAMPLE_IMAZ_DATA_URL]);
    expect(attachments[0]?.url).toBe(SAMPLE_IMAZ_DATA_URL);
    expect(attachments[0]?.url).not.toBe("data-url");
  });
});

describe("image execution telemetry", () => {
  it("initial telemetry distinguishes configured pipeline from effective execution", () => {
    const resolved = resolveImageEffectiveExecution({
      configuredPipeline: "engine",
      promptCompilerV2: true,
      userId: "user-1",
      internalCanaryEligible: false,
      scheduleShadowAfterSuccess: false,
      engineToolId: "maro_imazh",
    });
    const telemetry = buildInitialExecutionTelemetry({
      configuredPipeline: resolved.configuredPipeline,
      effectiveExecution: resolved.label,
      internalCanary: resolved.internalCanary,
      model: "gpt-image-2",
      module: "reklama",
      provider: "openai",
    });
    expect(telemetry.configured_pipeline).toBe("engine");
    expect(telemetry.effective_execution).toBe("legacy");
    expect(telemetry.provider).toBe("openai");
  });

  it("S: telemetry stamp merges without base64", async () => {
    const { updateJob } = await import("@/lib/generation/jobs");
    await stampJobExecutionTelemetry("job-imazh-1", {
      provider_request_count: 1,
      operation: "edit",
      reference_count_used: 1,
      success: true,
      generation_id: "gen-123",
    });
    const payload = vi.mocked(updateJob).mock.calls.at(-1)?.[1];
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/base64/i);
    expect(serialized).not.toContain("data:image/");
  });
});
