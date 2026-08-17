import { describe, expect, it, vi, beforeEach } from "vitest";
import { IMAGE_PROVIDER_REF_LIMIT } from "@/lib/engine/imageCompile";
import {
  createImageReferenceTracker,
  toSafeAttachmentMeta,
} from "@/lib/engine/imageReferenceTracker";
import {
  buildRuntimeImageLegacyProvider,
  type ImageShadowSchedulePayload,
} from "@/lib/engine/imageShadowRuntime";
import { maybeScheduleImageShadow } from "@/lib/engine/productionShadow";
import { runShadowCompilation } from "@/lib/engine/shadowCompile";
import { buildImazhTestContext, compileImazhFixture, IMAZH_PARITY_FIXTURES } from "@/lib/engine/imageParityFixtures";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import { generateImages, editImages } from "@/lib/ai/openai";

vi.mock("next/server", () => ({
  after: (fn: () => void | Promise<void>) => {
    void fn();
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "imazh-shadow-row" }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/features/flags", () => ({
  getShadowFeatureFlags: vi.fn(async () => ({ imazh: true, logo: false })),
}));

vi.mock("@/lib/engine/pipeline", () => ({
  getToolProductionPipeline: vi.fn(async () => ({
    pipeline: "shadow",
    engineId: "maro_imazh",
  })),
}));

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  const { buildImazhTestContext } = await import("@/lib/engine/imageParityFixtures");
  return {
    ...actual,
    loadCompileContext: vi.fn(async () => buildImazhTestContext()),
  };
});

vi.mock("@/lib/ai/openai", () => ({
  generateImages: vi.fn(async () => ["img-b64"]),
  editImages: vi.fn(async () => ["img-b64"]),
  IMAGE_MODEL: "gpt-image-2",
  hasOpenAiKey: vi.fn(() => true),
  OpenAIImageError: class OpenAIImageError extends Error {},
}));

const TOOL_PROMPTS = {
  "reklama.base": "You are maro Imazh, an expert visual art director.",
};

function basePayload(
  overrides: Partial<ImageShadowSchedulePayload> = {}
): ImageShadowSchedulePayload {
  const tracker = createImageReferenceTracker();
  const referenceOutcome = tracker.finalize(0);
  const legacyImageProvider = buildRuntimeImageLegacyProvider({
    finalPrompt: "Legacy prompt",
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "high",
    n: 1,
    referenceOutcome,
  });

  return {
    registryToolId: "reklama",
    finalPrompt: "Legacy prompt",
    model: "gpt-image-2",
    userId: "user-1",
    workspaceId: "ws-1",
    userPrompt: "Product photo",
    selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
    attachments: [],
    useBrain: false,
    brandOnly: false,
    estimatedCredits: 5,
    n: 1,
    size: "1024x1024",
    quality: "high",
    toolPrompts: TOOL_PROMPTS,
    fetchedUrls: [],
    legacyImageProvider,
    textMode: "off",
    ...overrides,
  };
}

describe("image reference tracker runtime outcome", () => {
  it("records actual received/usable/used counts for mixed refs", () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "data:image/png;base64,AAAA", true);
    tracker.recordAttempt("user", "https://cdn.example.com/a.png", false);
    tracker.recordAttempt("matched_source", "https://cdn.example.com/b.png", false);
    tracker.markUsable("https://cdn.example.com/b.png");

    const outcome = tracker.finalize(2);
    expect(outcome.referenceCountReceived).toBe(3);
    expect(outcome.referenceCountUsable).toBe(2);
    expect(outcome.referenceCountUsed).toBe(2);
    expect(outcome.operation).toBe("edit");
    expect(outcome.fallbackFromEditToGenerate).toBe(false);
  });

  it("records generate fallback when refs requested but none usable", () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "https://cdn.example.com/failed.png", false);
    const outcome = tracker.finalize(0);
    expect(outcome.operation).toBe("generate");
    expect(outcome.fallbackFromEditToGenerate).toBe(true);
  });

  it("caps provider used count at limit", () => {
    const tracker = createImageReferenceTracker();
    for (let i = 0; i < 6; i++) {
      tracker.recordAttempt("user", `data:image/png;base64,REF${i}`, true);
    }
    const outcome = tracker.finalize(6);
    expect(outcome.referenceCountUsable).toBe(6);
    expect(outcome.referenceCountUsed).toBe(IMAGE_PROVIDER_REF_LIMIT);
  });

  it("does not store raw base64 in safe attachment meta", () => {
    const meta = toSafeAttachmentMeta(["data:image/png;base64,SECRET"]);
    expect(meta[0]?.url).toBe("data-url");
    expect(JSON.stringify(meta)).not.toContain("SECRET");
  });
});

describe("maybeScheduleImageShadow runtime wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A: simple generate schedules shadow with tool prompts and zero provider calls from shadow", async () => {
    await maybeScheduleImageShadow(basePayload());

    expect(generateImages).not.toHaveBeenCalled();
    expect(editImages).not.toHaveBeenCalled();

    const result = await runShadowCompilation({
      toolId: "reklama",
      registryToolId: "reklama",
      model: "gpt-image-2",
      userPrompt: "Product photo",
      selections: { format: "fb-post", text: "off" },
      toolPrompts: TOOL_PROMPTS,
      legacySnapshot: {
        userContent: "Legacy prompt",
        imageProvider: basePayload().legacyImageProvider,
      },
      providerRequestCount: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.engineSnapshot?.imageProvider?.operation).toBe("generate");
  });

  it("B: edit with one reference preserves operation=edit", async () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "data:image/png;base64,AAAA", true);
    const legacyImageProvider = buildRuntimeImageLegacyProvider({
      finalPrompt: "Edit prompt",
      model: "gpt-image-2",
      size: "1024x1024",
      n: 1,
      referenceOutcome: tracker.finalize(1),
    });

    await maybeScheduleImageShadow(
      basePayload({
        finalPrompt: "Edit prompt",
        legacyImageProvider,
        attachments: [{ type: "image/png", url: "data-url" }],
      })
    );

    expect(legacyImageProvider.operation).toBe("edit");
    expect(legacyImageProvider.referenceCountUsed).toBe(1);
  });

  it("D: unusable refs record fallbackFromEditToGenerate", async () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "https://cdn.example.com/missing.png", false);
    const legacyImageProvider = buildRuntimeImageLegacyProvider({
      finalPrompt: "Fallback prompt",
      model: "gpt-image-2",
      size: "1024x1024",
      referenceOutcome: tracker.finalize(0),
    });

    expect(legacyImageProvider.fallbackFromEditToGenerate).toBe(true);
    expect(legacyImageProvider.operation).toBe("generate");
  });

  it("E: quality + n + size survive in legacy provider payload", async () => {
    const payload = basePayload({
      quality: "high",
      n: 3,
      size: "1024x1536",
      legacyImageProvider: buildRuntimeImageLegacyProvider({
        finalPrompt: "Sized prompt",
        model: "gpt-image-2",
        size: "1024x1536",
        quality: "high",
        n: 3,
        referenceOutcome: createImageReferenceTracker().finalize(0),
      }),
    });
    expect(payload.legacyImageProvider.size).toBe("1024x1536");
    expect(payload.legacyImageProvider.quality).toBe("high");
    expect(payload.legacyImageProvider.n).toBe(3);
  });

  it("J: tool prompt fragments passed through shadow compile context", async () => {
    const ctx = buildImazhTestContext();
    const brief = compileGenerationBrief(
      {
        toolId: "maro_imazh",
        userPrompt: "Coffee creative",
        selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      },
      { ...ctx, toolPrompts: TOOL_PROMPTS }
    );
    expect(brief.providerMessages?.systemInstructions).toContain("expert visual art director");
  });

  it("K: shadow compiler failure does not throw", async () => {
    const { loadCompileContext } = await import("@/lib/engine/storage");
    vi.mocked(loadCompileContext).mockRejectedValueOnce(new Error("db unavailable"));

    await expect(
      runShadowCompilation({
        toolId: "reklama",
        registryToolId: "reklama",
        model: "gpt-image-2",
        userPrompt: "fail",
        legacySnapshot: { userContent: "legacy" },
        providerRequestCount: 1,
      })
    ).resolves.toMatchObject({ ok: false, hasCriticalMismatch: true });
  });
});

describe("brand-only workspace fallback", () => {
  it("H: engine compile includes workspace brand brief when brain profile absent", () => {
    const fixture = IMAZH_PARITY_FIXTURES.find((f) => f.id === "imazh-brand-only")!;
    const { legacyProvider, engineProvider } = compileImazhFixture(fixture);
    expect(engineProvider.prompt).toContain("## Workspace brand");
    expect(engineProvider.prompt).toContain("Acme Co");
    expect(legacyProvider.prompt).toContain("## Workspace brand");
  });
});
