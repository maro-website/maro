import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiGenerateRequest } from "@/lib/ai/types";
import { hasPermission } from "@/lib/admin/permissions";
import {
  canSetPipeline,
  shouldRunShadowCompilation,
  wouldUseEngineProvider,
  isEngineLiveGloballyEnabled,
} from "@/lib/engine/engineIntegrationPolicy";
import { buildWebLegacySnapshot } from "@/lib/engine/legacySnapshot";
import { buildWebStructuralDiff } from "@/lib/engine/shadowWebDiff";
import { buildTestContext } from "@/lib/engine/parityFixtures";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import { setShadowAfterHook } from "@/lib/engine/shadowSchedule";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "cmp-1" }, error: null }) }) }),
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null }),
          order: () => ({ limit: () => Promise.resolve({ data: [] }) }),
        }),
        order: () => ({ limit: () => Promise.resolve({ data: [] }) }),
      }),
      update: () => ({ eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: {} }) }) }) }),
    }),
  }),
  getWorkspaceBrainProfile: vi.fn(),
  getWorkspaceSources: vi.fn(),
  getAppSettings: vi.fn(),
}));

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  return {
    ...actual,
    loadCompileContext: vi.fn(async (toolId: string) => buildTestContext(toolId as never)),
    loadToolEngineConfigs: vi.fn(async () => {
      const map = new Map();
      map.set("maro_web", { productionPipeline: "shadow" });
      map.set("maro_imazh", { productionPipeline: "legacy" });
      map.set("maro_logo", { productionPipeline: "legacy" });
      return map;
    }),
  };
});

describe("Phase 2B.1 pipeline policy", () => {
  it("maroWeb legacy = no shadow compile", () => {
    expect(shouldRunShadowCompilation({ pipeline: "legacy", toolId: "maro_web", phase: "2b1" })).toBe(false);
  });

  it("maroWeb shadow = permitted", () => {
    expect(shouldRunShadowCompilation({ pipeline: "shadow", toolId: "maro_web", phase: "2b1" })).toBe(true);
  });

  it("maroWeb engine forbidden in 2B.1", () => {
    expect(canSetPipeline("engine", "maro_web", "2b1", true).ok).toBe(false);
  });

  it("maroImazh and maroLogo remain legacy-only for shadow in 2B.1", () => {
    expect(canSetPipeline("shadow", "maro_imazh", "2b1").ok).toBe(false);
    expect(canSetPipeline("shadow", "maro_logo", "2b1").ok).toBe(false);
    expect(shouldRunShadowCompilation({ pipeline: "shadow", toolId: "maro_imazh", phase: "2b1" })).toBe(false);
  });

  it("maroImazh shadow prep requires flag and build phase", () => {
    expect(
      shouldRunShadowCompilation({
        pipeline: "shadow",
        toolId: "maro_imazh",
        phase: "build",
        shadowFeatureFlags: { imazh: true },
      })
    ).toBe(true);
    expect(canSetPipeline("shadow", "maro_imazh", "build", false, { imazh: true }).ok).toBe(true);
  });

  it("prompt_compiler_v2=false does not block shadow and blocks engine live", () => {
    expect(isEngineLiveGloballyEnabled(false)).toBe(false);
    expect(wouldUseEngineProvider("engine", false)).toBe(false);
    expect(wouldUseEngineProvider("shadow", false)).toBe(false);
    expect(shouldRunShadowCompilation({ pipeline: "shadow", toolId: "maro_web", phase: "2b1" })).toBe(true);
  });
});

function testWebGenerateBody(overrides: Partial<AiGenerateRequest> = {}): AiGenerateRequest {
  return {
    businessName: "X",
    goal: "Website",
    category: "generic",
    language: "sq",
    primaryColor: "#253FDA",
    ...overrides,
  };
}

describe("maroWeb shadow context parity", () => {
  it("preserves legacy system/user separation in snapshot", () => {
    const legacy = buildWebLegacySnapshot({
      body: testWebGenerateBody({
        businessName: "Acme",
        userPrompt: "Modern landing page",
        websiteType: "business",
        speed: "fast",
        fort: { enabled: true, values: { tone: "warm" } },
      }),
      masterPlusOptions: "master prompt",
      fortBriefBlock: "Fort brief text",
      model: "claude-opus",
      estimatedCredits: 12,
      legacySystem: "SYSTEM BLOCK",
      legacyUser: "USER BLOCK",
      fortEnabled: true,
      selections: { type: "landing", speed: "fast" },
    });

    expect(legacy.systemInstructions).toBe("SYSTEM BLOCK");
    expect(legacy.userContent).toBe("USER BLOCK");
    expect(legacy.websiteType).toBe("business");
    expect(legacy.selections?.type).toBe("landing");
  });

  it("engine compile preserves system/user provider messages", () => {
    const ctx = buildTestContext("maro_web");
    const brief = compileGenerationBrief(
      {
        toolId: "maro_web",
        userPrompt: "Build a dental clinic site",
        selections: { type: "landing", model: "opus-4-8" },
      },
      ctx
    );
    expect(brief.providerMessages?.systemInstructions).toBeTruthy();
    expect(brief.providerMessages?.userContent).toContain("Build a dental clinic site");
  });

  it("flags critical mismatch when engine system missing", () => {
    const legacy = buildWebLegacySnapshot({
      body: testWebGenerateBody({ businessName: "X", userPrompt: "Hello world website please" }),
      masterPlusOptions: "",
      model: "m1",
      legacySystem: "sys",
      legacyUser: "Hello world website please",
    });
    const diff = buildWebStructuralDiff(legacy, {}, { compileError: "boom" });
    expect(diff.hasCriticalMismatch).toBe(true);
    expect(diff.criticalFlags).toContain("engine_compile_failed");
  });
});

describe("shadow failure isolation", () => {
  beforeEach(() => {
    setShadowAfterHook(null);
  });

  it("runShadowCompilation never throws on compiler failure", async () => {
    const { runShadowCompilation } = await import("@/lib/engine/shadowCompile");
    const { loadCompileContext } = await import("@/lib/engine/storage");
    vi.mocked(loadCompileContext).mockRejectedValueOnce(new Error("db down"));

    const legacy = buildWebLegacySnapshot({
      body: testWebGenerateBody({ businessName: "X", userPrompt: "test" }),
      masterPlusOptions: "",
      model: "m1",
      legacySystem: "sys",
      legacyUser: "user",
    });

    await expect(
      runShadowCompilation({
        toolId: "website",
        registryToolId: "website",
        model: "m1",
        userPrompt: "test",
        legacySnapshot: legacy,
        providerRequestCount: 1,
      })
    ).resolves.toMatchObject({ ok: false });
  });
});

describe("shadow permissions", () => {
  it("editor cannot inspect engine internals", () => {
    expect(hasPermission("editor", "engine.view")).toBe(false);
    expect(hasPermission("developer", "engine.view")).toBe(true);
  });
});

describe("provider instrumentation contract", () => {
  it("accepts providerRequestCount=1 without throwing", async () => {
    const { runShadowCompilation } = await import("@/lib/engine/shadowCompile");
    const legacy = buildWebLegacySnapshot({
      body: testWebGenerateBody({ businessName: "X", userPrompt: "site" }),
      masterPlusOptions: "",
      model: "m1",
      legacySystem: "sys",
      legacyUser: "user",
      estimatedCredits: 5,
    });

    const result = await runShadowCompilation({
      toolId: "website",
      registryToolId: "website",
      model: "m1",
      userPrompt: "site",
      legacySnapshot: legacy,
      providerRequestCount: 1,
    });

    expect(result).toBeDefined();
    expect(typeof result.ok).toBe("boolean");
    expect(result.compileError || result.comparisonId || result.ok).toBeTruthy();
  });
});

describe("reliable shadow scheduling", () => {
  it("uses after hook when available", async () => {
    const tasks: Array<() => void> = [];
    setShadowAfterHook((task) => {
      tasks.push(task);
    });

    const { scheduleShadowCompilationReliable } = await import("@/lib/engine/shadowSchedule");
    const run = vi.fn(async () => ({ ok: true }));

    await scheduleShadowCompilationReliable(run, {
      toolId: "website",
      registryToolId: "website",
      model: "m1",
      userPrompt: "x",
      legacySnapshot: {},
    });

    expect(tasks.length).toBe(1);
    tasks[0]();
    expect(run).toHaveBeenCalledTimes(1);
    setShadowAfterHook(null);
  });
});
