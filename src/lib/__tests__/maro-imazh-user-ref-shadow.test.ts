import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  IMAGE_PROVIDER_REF_LIMIT,
  IMAGE_REFERENCE_PRESERVATION,
  IMAGE_TEXT_OFF,
  applyRuntimeReferenceOutcome,
} from "@/lib/engine/imageCompile";
import {
  createImageReferenceTracker,
  toSafeAttachmentMeta,
} from "@/lib/engine/imageReferenceTracker";
import {
  buildRuntimeImageLegacyProvider,
} from "@/lib/engine/imageShadowRuntime";
import { runShadowCompilation } from "@/lib/engine/shadowCompile";
import { buildImageStructuralDiff } from "@/lib/engine/shadowImageDiff";
import { buildImazhTestContext } from "@/lib/engine/imageParityFixtures";

vi.mock("next/server", () => ({
  after: (fn: () => void | Promise<void>) => {
    void fn();
  },
}));

let capturedInsert: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        capturedInsert = payload;
        return {
          select: () => ({
            single: async () => ({ data: { id: "user-ref-shadow-row" }, error: null }),
          }),
        };
      },
    }),
  }),
}));

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  const { buildImazhTestContext } = await import("@/lib/engine/imageParityFixtures");
  return {
    ...actual,
    loadCompileContext: vi.fn(async () => buildImazhTestContext()),
  };
});

const TOOL_PROMPTS = {
  "reklama.base": "You are maro Imazh, an expert visual art director.",
};

function buildLegacySnapshotWithRefs(
  referenceOutcome: ReturnType<ReturnType<typeof createImageReferenceTracker>["finalize"]>,
  opts?: { text?: "on" | "off"; userPrompt?: string }
) {
  const textOff = opts?.text !== "on";
  const userPrompt =
    opts?.userPrompt ??
    "Use the attached perfume bottle as the main product reference. Premium studio photo.";
  let finalPrompt = `${userPrompt}\n\n${IMAGE_REFERENCE_PRESERVATION}`;
  if (textOff) finalPrompt = `${finalPrompt}\n\n${IMAGE_TEXT_OFF}`;

  const legacyImageProvider = buildRuntimeImageLegacyProvider({
    finalPrompt,
    model: "gpt-image-2",
    size: "1024x1536",
    quality: "high",
    n: 1,
    referenceOutcome,
  });

  return {
    legacyImageProvider,
    legacySnapshot: {
      userContent: finalPrompt,
      imageProvider: legacyImageProvider,
      model: "gpt-image-2",
    },
  };
}

async function compileShadowWithLegacy(legacySnapshot: {
  userContent: string;
  imageProvider: ReturnType<typeof buildRuntimeImageLegacyProvider>;
  model: string;
}, extra?: Partial<Parameters<typeof runShadowCompilation>[0]>) {
  return runShadowCompilation({
    toolId: "reklama",
    registryToolId: "reklama",
    model: "gpt-image-2",
    userId: "fec01baa-8451-4112-84fb-8552f8b31686",
    workspaceId: "ws_msjshl8gp24",
    userPrompt: "Use the attached perfume bottle as the main product reference. Premium studio photo.",
    selections: {
      model: "gpt-image-2",
      format: "ig-post",
      text: "off",
      speed: "normal",
      font: "handwritten",
    },
    attachments: toSafeAttachmentMeta(["data:image/png;base64,SECRET_UPLOAD"]),
    useBrain: false,
    quality: "high",
    n: 1,
    explicitSize: "1024x1536",
    toolPrompts: TOOL_PROMPTS,
    textMode: "off",
    legacySnapshot,
    providerRequestCount: 1,
    ...extra,
  });
}

describe("applyRuntimeReferenceOutcome", () => {
  it("copies structural ref fields without changing prompt", () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "data:image/png;base64,AAAA", true);
    const runtime = buildRuntimeImageLegacyProvider({
      finalPrompt: "Runtime prompt with preservation",
      model: "gpt-image-2",
      size: "1024x1536",
      referenceOutcome: tracker.finalize(1),
    });

    const compiled = {
      ...runtime,
      prompt: "Engine compiled prompt only",
      operation: "generate" as const,
      references: [],
      referenceCountReceived: 0,
      referenceCountUsable: 0,
      referenceCountUsed: 0,
      referencesRequested: false,
      fallbackFromEditToGenerate: false,
    };

    const merged = applyRuntimeReferenceOutcome(compiled, runtime);
    expect(merged.prompt).toBe("Engine compiled prompt only");
    expect(merged.operation).toBe("edit");
    expect(merged.referenceCountUsed).toBe(1);
    expect(merged.references[0]?.sourceType).toBe("user");
  });
});

describe("user-upload shadow structural parity", () => {
  beforeEach(() => {
    capturedInsert = null;
    vi.clearAllMocks();
  });

  it("A: one manual user data-image ref → legacy and engine edit / 1 used", async () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "data:image/png;base64,AAAA", true);
    const { legacySnapshot } = buildLegacySnapshotWithRefs(tracker.finalize(1));

    const result = await compileShadowWithLegacy(legacySnapshot);
    expect(result.ok).toBe(true);

    const legacyP = legacySnapshot.imageProvider;
    const engineP = result.engineSnapshot?.imageProvider;

    expect(legacyP.operation).toBe("edit");
    expect(engineP?.operation).toBe("edit");
    expect(legacyP.referenceCountUsed).toBe(1);
    expect(engineP?.referenceCountUsed).toBe(1);
    expect(engineP?.references[0]?.sourceType).toBe("user");
    expect(engineP?.references[0]?.usable).toBe(true);
    expect(engineP?.references[0]?.includedInProviderRequest).toBe(true);

    const diff = buildImageStructuralDiff(legacySnapshot, result.engineSnapshot!, {
      brainUsed: false,
      presetPresent: false,
    });
    expect(diff.hasCriticalMismatch).toBe(false);
    expect(diff.criticalFlags).toEqual([]);
  });

  it("B: multiple user refs preserve order and cap used at 4", async () => {
    const tracker = createImageReferenceTracker();
    for (let i = 0; i < 6; i++) {
      tracker.recordAttempt("user", `data:image/png;base64,REF${i}`, true);
    }
    const outcome = tracker.finalize(6);
    const { legacySnapshot } = buildLegacySnapshotWithRefs(outcome);

    const result = await compileShadowWithLegacy(legacySnapshot);
    const engineP = result.engineSnapshot?.imageProvider;

    expect(engineP?.operation).toBe("edit");
    expect(engineP?.referenceCountReceived).toBe(6);
    expect(engineP?.referenceCountUsable).toBe(6);
    expect(engineP?.referenceCountUsed).toBe(IMAGE_PROVIDER_REF_LIMIT);
    expect(engineP?.references.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(engineP?.references.every((r) => r.sourceType === "user")).toBe(true);
    expect(engineP?.references.filter((r) => r.includedInProviderRequest)).toHaveLength(4);
  });

  it("C: user ref requested but unusable → generate fallback parity", async () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "https://cdn.example.com/missing.png", false);
    const { legacySnapshot } = buildLegacySnapshotWithRefs(tracker.finalize(0));

    const result = await compileShadowWithLegacy(legacySnapshot, {
      attachments: [{ type: "image", url: "https://cdn.example.com/missing.png" }],
    });
    const engineP = result.engineSnapshot?.imageProvider;

    expect(engineP?.operation).toBe("generate");
    expect(engineP?.fallbackFromEditToGenerate).toBe(true);
    expect(engineP?.referenceCountUsed).toBe(0);

    const diff = buildImageStructuralDiff(legacySnapshot, result.engineSnapshot!, {});
    expect(diff.hasCriticalMismatch).toBe(false);
  });

  it("D: workspace_brain ref path still passes after runtime overlay", async () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("workspace_brain", "https://cdn.example.com/logo.png", true);
    const { legacySnapshot } = buildLegacySnapshotWithRefs(tracker.finalize(1));

    const result = await compileShadowWithLegacy(legacySnapshot, {
      useBrain: true,
      brainBrief: "## maroBrain — workspace context\nBrand: erzenology",
      attachments: [],
    });
    const engineP = result.engineSnapshot?.imageProvider;

    expect(engineP?.operation).toBe("edit");
    expect(engineP?.references[0]?.sourceType).toBe("workspace_brain");

    const diff = buildImageStructuralDiff(legacySnapshot, result.engineSnapshot!, {
      brainUsed: true,
      presetPresent: false,
    });
    expect(diff.hasCriticalMismatch).toBe(false);
  });

  it("E: text OFF + user ref keeps preservation and text-off prompts with structural parity", async () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "data:image/png;base64,AAAA", true);
    const { legacySnapshot } = buildLegacySnapshotWithRefs(tracker.finalize(1), { text: "off" });

    const result = await compileShadowWithLegacy(legacySnapshot);
    const legacyPrompt = legacySnapshot.imageProvider.prompt;
    const enginePrompt = result.engineSnapshot?.imageProvider?.prompt ?? "";

    expect(legacyPrompt).toContain(IMAGE_REFERENCE_PRESERVATION);
    expect(enginePrompt).toContain(IMAGE_REFERENCE_PRESERVATION);
    expect(legacyPrompt).toContain(IMAGE_TEXT_OFF);
    expect(enginePrompt).toContain(IMAGE_TEXT_OFF);
    expect(enginePrompt).not.toContain("Text: render any requested headline/text");
    expect(enginePrompt).not.toMatch(/Use a Handwritten typography style\./);

    const diff = buildImageStructuralDiff(legacySnapshot, result.engineSnapshot!, {});
    expect(diff.hasCriticalMismatch).toBe(false);
  });

  it("F: shadow storage contains no raw data URL or base64 payload", async () => {
    const tracker = createImageReferenceTracker();
    tracker.recordAttempt("user", "data:image/png;base64,SECRET_BYTES", true);
    const { legacySnapshot } = buildLegacySnapshotWithRefs(tracker.finalize(1));

    await compileShadowWithLegacy(legacySnapshot);
    const serialized = JSON.stringify(capturedInsert);
    expect(serialized).not.toContain("data:image/");
    expect(serialized).not.toContain("SECRET_BYTES");
    expect(serialized).not.toMatch(/base64/i);
  });
});
