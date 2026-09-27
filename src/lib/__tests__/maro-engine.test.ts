import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/admin/permissions";
import {
  compileGenerationBrief,
  matchesEngineConditions,
  resolveEngineToolId,
  validateModelForTool,
  defaultModelsFromRegistry,
  detectBriefConflicts,
  legacyComposePrompt,
  buildTestContext,
  PARITY_FIXTURES,
} from "@/lib/engine";
import { buildConditionContext } from "@/lib/engine/conditions";
import type { PromptLayerRecord } from "@/lib/engine/types";

describe("Engine tool registry", () => {
  it("resolves legacy registry ids", () => {
    expect(resolveEngineToolId("reklama")).toBe("maro_imazh");
    expect(resolveEngineToolId("website")).toBe("maro_web");
    expect(resolveEngineToolId("logo")).toBe("maro_logo");
    expect(resolveEngineToolId("maro_imazh")).toBe("maro_imazh");
  });

  it("maps maro_logo without brain", () => {
    const ctx = buildTestContext("maro_logo");
    const brief = compileGenerationBrief(
      { toolId: "maro_logo", userPrompt: "Logo test", useBrain: true },
      ctx
    );
    expect(brief.metadata.brainUsed).toBe(false);
  });
});

describe("Compiler determinism", () => {
  it("produces identical output for identical inputs", () => {
    const ctx = buildTestContext("maro_imazh");
    const input = { toolId: "maro_imazh", userPrompt: "Test prompt", selections: { format: "ig-post" } };
    const a = compileGenerationBrief(input, ctx);
    const b = compileGenerationBrief(input, ctx);
    expect(a).toEqual(b);
  });

  it("respects layer priority and conditions", () => {
    const ctx = buildTestContext("maro_imazh");
    const layers: PromptLayerRecord[] = [
      {
        id: "1",
        layerKey: "low",
        toolId: "maro_imazh",
        name: "Low",
        enabled: true,
        priority: 1,
        conditions: [],
        instructions: "LOW",
        versionLabel: "1",
        status: "live",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        layerKey: "high",
        toolId: "maro_imazh",
        name: "High",
        enabled: true,
        priority: 10,
        conditions: [{ field: "attachments.exists", exists: true }],
        instructions: "HIGH",
        versionLabel: "1",
        status: "live",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "3",
        layerKey: "disabled",
        toolId: "maro_imazh",
        name: "Off",
        enabled: false,
        priority: 99,
        conditions: [],
        instructions: "OFF",
        versionLabel: "1",
        status: "live",
        createdAt: "",
        updatedAt: "",
      },
    ];
    ctx.layers = layers;

    const without = compileGenerationBrief(
      { toolId: "maro_imazh", userPrompt: "x" },
      ctx
    );
    expect(without.appliedLayers.map((l) => l.layerKey)).toEqual(["low"]);

    const withAttachment = compileGenerationBrief(
      { toolId: "maro_imazh", userPrompt: "x", attachments: [{ type: "image/png" }] },
      ctx
    );
    expect(withAttachment.appliedLayers.map((l) => l.layerKey)).toEqual(["high", "low"]);
  });

  it("omits empty sections", () => {
    const ctx = buildTestContext("maro_logo");
    const brief = compileGenerationBrief({ toolId: "maro_logo", userPrompt: "Logo" }, ctx);
    expect(brief.brandContext).toBeUndefined();
    expect(brief.primaryUserRequest).toBe("Logo");
  });
});

describe("Condition engine", () => {
  it("evaluates attachment.exists safely", () => {
    const ctx = buildConditionContext(
      { toolId: "maro_imazh", userPrompt: "x", attachments: [{ type: "image/png" }] },
      "gpt-image-2"
    );
    expect(matchesEngineConditions([{ field: "attachments.exists", exists: true }], ctx)).toBe(true);
    expect(matchesEngineConditions([{ field: "attachments.exists", exists: false }], ctx)).toBe(false);
  });
});

describe("Model validation prep", () => {
  it("rejects disabled models", () => {
    const models = defaultModelsFromRegistry("maro_imazh").map((m) =>
      m.modelId === "gpt-image-2" ? { ...m, enabled: false } : m
    );
    const result = validateModelForTool("maro_imazh", "gpt-image-2", models);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("disabled");
  });
});

describe("Conflict precedence", () => {
  it("detects color conflicts", () => {
    const notes = detectBriefConflicts({
      userPrompt: "make it black and white",
      fortValues: { colorDirection: "vibrant colorful" },
    });
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe("Legacy parity fixtures", () => {
  for (const fixture of PARITY_FIXTURES) {
    it(`${fixture.id}: semantic parity markers present`, () => {
      const ctx = buildTestContext(fixture.toolId);
      const engineBrief = compileGenerationBrief(fixture.engine, ctx);
      const legacy = legacyComposePrompt(fixture.legacy);

      expect(engineBrief.tool).toBe(fixture.toolId);
      expect(legacy.prompt.length).toBeGreaterThan(0);
      expect(engineBrief.renderedProviderPrompt?.length).toBeGreaterThan(0);

      if (fixture.toolId === "maro_imazh") {
        expect(legacy.prompt.toLowerCase()).toContain("maro imazh");
        expect(engineBrief.renderedProviderPrompt!.toLowerCase()).toContain("maro imazh");
      }
      if (fixture.id === "imazh-text-on") {
        expect(legacy.prompt.toLowerCase()).toContain("text");
        expect(engineBrief.technicalDirection?.toLowerCase()).toContain("text");
      }
      if (fixture.id === "imazh-attachment") {
        expect(legacy.prompt.toLowerCase()).toContain("reference");
        expect(engineBrief.technicalDirection?.toLowerCase()).toContain("reference");
      }
    });
  }
});

describe("Engine admin security permissions", () => {
  it("denies editor engine manage/publish", () => {
    expect(hasPermission("editor", "engine.manage")).toBe(false);
    expect(hasPermission("editor", "engine.publish")).toBe(false);
    expect(hasPermission("editor", "engine.view")).toBe(false);
  });

  it("allows developer engine access", () => {
    expect(hasPermission("developer", "engine.manage")).toBe(true);
    expect(hasPermission("developer", "engine.publish")).toBe(true);
  });
});

describe("Dry run safety (compile API contract)", () => {
  it("compile output includes credits estimate without mutation flags", () => {
    const ctx = buildTestContext("maro_web");
    ctx.pricingOverrides = { "website.type.landing": 10 };
    const brief = compileGenerationBrief(
      {
        toolId: "maro_web",
        userPrompt: "Landing",
        selections: { type: "landing", model: "opus-4-8", speed: "normal" },
      },
      ctx
    );
    expect(brief.estimatedCredits?.total).toBeGreaterThanOrEqual(10);
    expect(brief.metadata.promptCompilerV2).toBe(false);
  });
});
