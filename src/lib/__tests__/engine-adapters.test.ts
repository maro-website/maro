import { describe, expect, it } from "vitest";
import { compileGenerationBrief, buildTestContext } from "@/lib/engine";
import { mapWebBriefToClaude } from "@/lib/engine/adapters/claudeWeb";
import { mapImageBriefToOpenAI } from "@/lib/engine/adapters/openaiImage";
import { mapEngineBriefToProviderRequest } from "@/lib/engine/adapters/mapBrief";
import { canExecuteEngineProvider } from "@/lib/engine/adapters/executeGate";

describe("Engine provider adapters", () => {
  it("maps maroWeb brief to Claude system/user", () => {
    const ctx = buildTestContext("maro_web");
    const brief = compileGenerationBrief(
      { toolId: "maro_web", userPrompt: "Dental clinic landing page", selections: { type: "landing" } },
      ctx
    );
    const mapped = mapWebBriefToClaude(brief);
    expect(mapped.ok).toBe(true);
    expect(mapped.request?.system).toBeTruthy();
    expect(mapped.request?.user).toContain("Dental clinic");
  });

  it("maps maroImazh brief to OpenAI image request", () => {
    const ctx = buildTestContext("maro_imazh");
    const brief = compileGenerationBrief(
      { toolId: "maro_imazh", userPrompt: "Product photo on marble" },
      ctx
    );
    const mapped = mapImageBriefToOpenAI(brief);
    expect(mapped.ok).toBe(true);
    expect(mapped.request?.prompt).toBeTruthy();
  });

  it("mapEngineBriefToProviderRequest selects provider by tool", () => {
    const webCtx = buildTestContext("maro_web");
    const webBrief = compileGenerationBrief({ toolId: "maro_web", userPrompt: "Site" }, webCtx);
    expect(mapEngineBriefToProviderRequest(webBrief)?.provider).toBe("anthropic");

    const imCtx = buildTestContext("maro_imazh");
    const imBrief = compileGenerationBrief({ toolId: "maro_imazh", userPrompt: "Photo" }, imCtx);
    expect(mapEngineBriefToProviderRequest(imBrief)?.provider).toBe("openai");
  });
});

describe("Engine provider execution gate", () => {
  it("blocks execution when prompt_compiler_v2=false", () => {
    expect(canExecuteEngineProvider({ toolId: "maro_web", pipeline: "engine", promptCompilerV2: false })).toBe(false);
    expect(canExecuteEngineProvider({ toolId: "maro_web", pipeline: "shadow", promptCompilerV2: false })).toBe(false);
    expect(canExecuteEngineProvider({ toolId: "maro_web", pipeline: "legacy", promptCompilerV2: false })).toBe(false);
  });

  it("allows execution only when engine pipeline AND global flag", () => {
    expect(canExecuteEngineProvider({ toolId: "maro_web", pipeline: "engine", promptCompilerV2: true })).toBe(true);
  });
});

describe("preset reveal policy", () => {
  it("is disabled", async () => {
    const { PRESET_REVEAL_DISABLED } = await import("@/lib/presets/policy");
    expect(PRESET_REVEAL_DISABLED).toBe(true);
  });
});
