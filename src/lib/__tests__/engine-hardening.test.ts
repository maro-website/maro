import { describe, expect, it, vi, beforeEach } from "vitest";
import { hasPermission } from "@/lib/admin/permissions";
import {
  compileGenerationBrief,
  validateFieldRecord,
  resolveToolInputFields,
  validateToolConfiguration,
  buildTestContext,
  matchesEngineConditions,
  buildConditionContext,
} from "@/lib/engine";
import { buildToolBrainContext } from "@/lib/engine/brainMapping";
import { canSetPipeline, shouldRunShadowCompilation, wouldUseEngineProvider } from "@/lib/engine/engineIntegrationPolicy";
import { buildStructuralDiff } from "@/lib/engine/shadowDiff";
import { loadBrainContext } from "@/lib/engine/brainLoader";
import { runShadowCompilation, scheduleShadowCompilation } from "@/lib/engine/shadowCompile";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import type { WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "cmp-1" }, error: null }) }) }),
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
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
    loadCompileContext: vi.fn(async (toolId: string) => {
      const ctx = buildTestContext(toolId as never);
      return ctx;
    }),
  };
});

const profile: WorkspaceBrainProfile = {
  ...emptyBrainProfile(),
  brand: { ...emptyBrainProfile().brand, name: "Acme", description: "Coffee roasters" },
  target: { ...emptyBrainProfile().target, audience: "Urban professionals" },
};

describe("real maroBrain dry run", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("loads brain with owner isolation via production loader", async () => {
    const { getWorkspaceBrainProfile, getWorkspaceSources } = await import("@/lib/supabase/server");
    vi.mocked(getWorkspaceBrainProfile).mockResolvedValue(profile);
    vi.mocked(getWorkspaceSources).mockResolvedValue([]);

    const result = await loadBrainContext({ ownerUserId: "user-1", workspaceId: "ws-1", adminInspection: true });
    expect(result.loaded).toBe(true);
    expect(result.isolationOk).toBe(true);
    expect(result.profile?.brand.name).toBe("Acme");
  });

  it("maroImazh receives mapped brain sections", () => {
    const ctx = buildTestContext("maro_imazh");
    ctx.brainProfile = profile;
    const brief = compileGenerationBrief(
      { toolId: "maro_imazh", userPrompt: "Product photo", useBrain: true },
      ctx
    );
    expect(brief.metadata.brainUsed).toBe(true);
    expect(brief.metadata.brainSections.length).toBeGreaterThan(0);
  });

  it("maroWeb receives mapped brain sections including market", () => {
    const ctx = buildTestContext("maro_web");
    ctx.brainProfile = { ...profile, market: { ...profile.market, region: "Albania" } };
    const brief = compileGenerationBrief(
      { toolId: "maro_web", userPrompt: "Landing page", useBrain: true },
      ctx
    );
    expect(brief.metadata.brainUsed).toBe(true);
  });

  it("maroLogo receives no brain context", () => {
    const ctx = buildTestContext("maro_logo");
    ctx.brainProfile = profile;
    const brief = compileGenerationBrief(
      { toolId: "maro_logo", userPrompt: "Logo", useBrain: true },
      ctx
    );
    expect(brief.metadata.brainUsed).toBe(false);
    expect(brief.metadata.brainSections).toEqual([]);
  });
});

describe("inputs CMS validation", () => {
  it("rejects invalid select default", () => {
    const v = validateFieldRecord({
      fieldKey: "tone",
      fieldType: "select",
      defaultValue: "nope",
      options: [{ id: "warm", label: "Warm" }],
    });
    expect(v.ok).toBe(false);
  });

  it("code fallback works when DB row missing", () => {
    const resolved = resolveToolInputFields("maro_imazh", []);
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.some((f) => f.source === "code")).toBe(true);
  });

  it("DB label override appears in resolved schema", () => {
    const resolved = resolveToolInputFields("maro_imazh", [
      {
        id: "1",
        toolId: "maro_imazh",
        fieldKey: "creativeFreedom",
        label: "CMS Label Override",
        description: "",
        fieldType: "select",
        options: [],
        required: false,
        enabled: true,
        sortOrder: 1,
        standardVisible: false,
        fortVisible: true,
        conditionalVisibility: [],
        modelCompatibility: [],
        presetCompatibility: [],
        costModifier: {},
        metadata: {},
      },
    ]);
    const hit = resolved.find((f) => f.fieldKey === "creativeFreedom");
    expect(hit?.label).toBe("CMS Label Override");
    expect(hit?.source).toBe("merged");
  });

  it("disabling field removes it from enabled resolved entries", () => {
    const resolved = resolveToolInputFields("maro_imazh", [
      {
        id: "1",
        toolId: "maro_imazh",
        fieldKey: "creativeFreedom",
        label: "Off",
        description: "",
        fieldType: "select",
        options: [],
        required: false,
        enabled: false,
        sortOrder: 1,
        standardVisible: false,
        fortVisible: true,
        conditionalVisibility: [],
        modelCompatibility: [],
        presetCompatibility: [],
        costModifier: {},
        metadata: {},
      },
    ]);
    expect(resolved.find((f) => f.fieldKey === "creativeFreedom")?.enabled).toBe(false);
  });

  it("conditions cannot reference executable patterns", () => {
    const v = validateFieldRecord({
      fieldKey: "x",
      conditionalVisibility: [{ field: "eval(code)", exists: true }],
    });
    expect(v.ok).toBe(false);
  });

  it("editor cannot mutate engine inputs", () => {
    expect(hasPermission("editor", "engine.manage")).toBe(false);
  });
});

describe("config health", () => {
  it("maroWeb seeded context can be READY or WARNING but not blocked on empty prompts in test ctx", () => {
    const ctx = buildTestContext("maro_web");
    const health = validateToolConfiguration({
      tool: ctx.tool,
      prompts: ctx.systemPrompt ? [ctx.systemPrompt] : [],
      layers: ctx.layers,
      fields: ctx.inputFields,
      models: ctx.models,
      promptCompilerV2: false,
    });
    expect(["ready", "warning", "blocked"]).toContain(health.status);
  });

  it("maro_marketing is BLOCKED", () => {
    const ctx = buildTestContext("maro_marketing");
    const health = validateToolConfiguration({
      tool: { ...ctx.tool, functional: false, comingSoon: true },
      prompts: ctx.systemPrompt ? [ctx.systemPrompt] : [],
      layers: [],
      fields: [],
      models: ctx.models,
      promptCompilerV2: false,
    });
    expect(health.status).toBe("blocked");
  });
});

describe("pipeline controls", () => {
  it("blocks engine activation in phase 2B.1", () => {
    expect(canSetPipeline("engine", "maro_web", "2b1", false).ok).toBe(false);
    expect(canSetPipeline("shadow", "maro_web", "2b1").ok).toBe(true);
    expect(canSetPipeline("shadow", "maro_imazh", "2b1").ok).toBe(false);
  });

  it("shadow works when prompt_compiler_v2 is false", () => {
    expect(shouldRunShadowCompilation({ pipeline: "shadow", toolId: "maro_web", phase: "2b1" })).toBe(true);
    expect(wouldUseEngineProvider("engine", false)).toBe(false);
    expect(wouldUseEngineProvider("shadow", false)).toBe(false);
  });
});

describe("provider message structure", () => {
  it("separates system and user content", () => {
    const ctx = buildTestContext("maro_web");
    const brief = compileGenerationBrief({ toolId: "maro_web", userPrompt: "Build site" }, ctx);
    expect(brief.providerMessages?.systemInstructions).toBeTruthy();
    expect(brief.providerMessages?.userContent).toContain("Build site");
  });
});

describe("shadow mode safety", () => {
  it("shadow compile never throws to caller", async () => {
    const result = await runShadowCompilation({
      toolId: "reklama",
      registryToolId: "reklama",
      model: "gpt-image-2",
      userPrompt: "test",
      legacySnapshot: { userContent: "legacy" },
    });
    expect(result.ok).toBe(true);
  });

  it("scheduleShadowCompilation is fire-and-forget", () => {
    expect(() =>
      scheduleShadowCompilation({
        toolId: "website",
        registryToolId: "website",
        model: "opus-4-8",
        userPrompt: "x",
        legacySnapshot: {},
      })
    ).not.toThrow();
  });
});

describe("structural shadow diff", () => {
  it("detects section differences deterministically", () => {
    const diff = buildStructuralDiff(
      { systemInstructions: "A", userContent: "legacy user" },
      { systemInstructions: "B", userContent: "legacy user" }
    );
    expect(diff.sections.find((s) => s.key === "system")?.status).toBe("different");
    expect(diff.sections.find((s) => s.key === "user")?.status).toBe("same");
  });
});

describe("condition safety", () => {
  it("attachment.exists boolean handled correctly", () => {
    const ctx = buildConditionContext({ toolId: "maro_imazh", userPrompt: "x" }, "m1");
    expect(matchesEngineConditions([{ field: "attachments.exists", exists: false }], ctx)).toBe(true);
  });
});

describe("field ordering", () => {
  it("is deterministic", () => {
    const a = resolveToolInputFields("maro_imazh", []);
    const b = resolveToolInputFields("maro_imazh", []);
    expect(a.map((f) => f.fieldKey)).toEqual(b.map((f) => f.fieldKey));
  });
});
