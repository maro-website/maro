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

  it("maps maroImazh brief to OpenAI image request with generate/edit", () => {
    const ctx = buildTestContext("maro_imazh");
    const input = { toolId: "maro_imazh" as const, userPrompt: "Product photo on marble" };
    const brief = compileGenerationBrief(input, ctx);
    const mapped = mapImageBriefToOpenAI(brief, { compileInput: input, compileContext: ctx });
    expect(mapped.ok).toBe(true);
    expect(mapped.request?.operation).toBe("generate");
    expect(mapped.request?.prompt).toBeTruthy();
    expect(mapped.request?.n).toBe(1);
  });

  it("mapEngineBriefToProviderRequest selects provider by tool", () => {
    const webCtx = buildTestContext("maro_web");
    const webBrief = compileGenerationBrief({ toolId: "maro_web", userPrompt: "Site" }, webCtx);
    expect(mapEngineBriefToProviderRequest(webBrief)?.provider).toBe("anthropic");

    const imCtx = buildTestContext("maro_imazh");
    const imInput = { toolId: "maro_imazh" as const, userPrompt: "Photo" };
    const imBrief = compileGenerationBrief(imInput, imCtx);
    expect(
      mapEngineBriefToProviderRequest(imBrief, {
        compileInput: imInput,
        compileContext: imCtx,
      })?.provider
    ).toBe("openai");
  });
});

describe("Engine provider execution gate", () => {
  it("blocks execution when prompt_compiler_v2=false", () => {
    expect(canExecuteEngineProvider({ toolId: "maro_web", pipeline: "engine", promptCompilerV2: false })).toBe(false);
    expect(canExecuteEngineProvider({ toolId: "maro_web", pipeline: "shadow", promptCompilerV2: false })).toBe(false);
    expect(canExecuteEngineProvider({ toolId: "maro_web", pipeline: "legacy", promptCompilerV2: false })).toBe(false);
  });

  it("allows execution only when engine pipeline, global flag, user, and allowlist", () => {
    expect(
      canExecuteEngineProvider({
        toolId: "maro_web",
        pipeline: "engine",
        promptCompilerV2: true,
        userId: "user-1",
        internalCanaryEligible: true,
      })
    ).toBe(true);

    expect(
      canExecuteEngineProvider({
        toolId: "maro_web",
        pipeline: "engine",
        promptCompilerV2: true,
      })
    ).toBe(false);
  });
});

describe("preset reveal policy", () => {
  it("is disabled", async () => {
    const { PRESET_REVEAL_DISABLED } = await import("@/lib/presets/policy");
    expect(PRESET_REVEAL_DISABLED).toBe(true);
  });
});
