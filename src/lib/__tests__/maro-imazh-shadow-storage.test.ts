import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createImageReferenceTracker,
  toSafeAttachmentMeta,
} from "@/lib/engine/imageReferenceTracker";
import { buildRuntimeImageLegacyProvider } from "@/lib/engine/imageShadowRuntime";
import { runShadowCompilation } from "@/lib/engine/shadowCompile";
import { buildImazhTestContext } from "@/lib/engine/imageParityFixtures";

const CASE1_GENERATION_ID = "0ba64686-74d0-4ce8-9063-850c838413cf";
const CASE1_JOB_ID = "6ed3d0cf-9e1b-4498-9468-e8aa1939e6fe";
const CASE1_USER_ID = "fec01baa-8451-4112-84fb-8552f8b31686";
const CASE1_WORKSPACE_ID = "ws_msjshl8gp24";

let capturedInsert: Record<string, unknown> | null = null;

vi.mock("next/server", () => ({
  after: (fn: () => void | Promise<void>) => {
    void fn();
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        capturedInsert = payload;
        return {
          select: () => ({
            single: async () => ({ data: { id: "shadow-row-case1" }, error: null }),
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

describe("maroImazh shadow storage workspace id", () => {
  beforeEach(() => {
    capturedInsert = null;
    vi.clearAllMocks();
  });

  it("stores canonical ws_* workspace id without uuid parser errors", async () => {
    const tracker = createImageReferenceTracker();
    const legacyImageProvider = buildRuntimeImageLegacyProvider({
      finalPrompt: "Legacy prompt",
      model: "gpt-image-2",
      size: "1024x1536",
      quality: "high",
      n: 1,
      referenceOutcome: tracker.finalize(0),
    });

    const result = await runShadowCompilation({
      toolId: "reklama",
      registryToolId: "reklama",
      model: "gpt-image-2",
      userId: CASE1_USER_ID,
      workspaceId: CASE1_WORKSPACE_ID,
      userPrompt: "Product photo",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
      attachments: toSafeAttachmentMeta(["data:image/png;base64,SECRET"]),
      useBrain: true,
      legacySnapshot: {
        userContent: "Legacy prompt",
        imageProvider: legacyImageProvider,
      },
      generationId: CASE1_GENERATION_ID,
      jobId: CASE1_JOB_ID,
      providerRequestCount: 1,
      quality: "high",
      n: 1,
      explicitSize: "1024x1536",
      toolPrompts: { "reklama.base": "You are maro Imazh." },
    });

    expect(result.ok).toBe(true);
    expect(result.comparisonId).toBe("shadow-row-case1");
    expect(capturedInsert).not.toBeNull();

    expect(capturedInsert?.workspace_id).toBe(CASE1_WORKSPACE_ID);
    expect(capturedInsert?.generation_id).toBe(CASE1_GENERATION_ID);
    expect(capturedInsert?.job_id).toBe(CASE1_JOB_ID);
    expect(capturedInsert?.user_id).toBe(CASE1_USER_ID);
    expect(capturedInsert?.tool_id).toBe("maro_imazh");
    expect(capturedInsert?.registry_tool_id).toBe("reklama");

    const context = capturedInsert?.context_metadata as Record<string, unknown>;
    expect(context?.workspaceId).toBe(CASE1_WORKSPACE_ID);
    expect(context?.generationId).toBe(CASE1_GENERATION_ID);
    expect(context?.jobId).toBe(CASE1_JOB_ID);

    const serialized = JSON.stringify(capturedInsert);
    expect(serialized).not.toContain("data:image/");
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toMatch(/base64/i);
  });
});
