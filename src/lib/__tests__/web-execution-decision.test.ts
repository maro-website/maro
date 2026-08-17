import { describe, expect, it } from "vitest";
import { canExecuteEngineProvider } from "@/lib/engine/adapters/executeGate";
import { resolveWebEffectiveExecution } from "@/lib/engine/webExecution";

const USER = "11111111-1111-1111-1111-111111111111";

function decide(input: {
  flag: boolean;
  pipeline: "legacy" | "shadow" | "engine";
  eligible: boolean;
  userId?: string | null;
  lookupFailed?: boolean;
}) {
  return resolveWebEffectiveExecution({
    configuredPipeline: input.pipeline,
    promptCompilerV2: input.flag,
    userId: input.userId === undefined ? USER : input.userId,
    internalCanaryEligible: input.eligible,
    lookupFailed: input.lookupFailed,
  });
}

describe("maroWeb execution decision truth table", () => {
  it("Case A: flag FALSE + pipeline ENGINE + allowlisted → LEGACY", () => {
    const r = decide({ flag: false, pipeline: "engine", eligible: true });
    expect(r.mode).toBe("legacy");
    expect(r.label).toBe("legacy");
    expect(r.scheduleShadowAfterSuccess).toBe(false);
  });

  it("Case B: flag TRUE + pipeline LEGACY + allowlisted → LEGACY", () => {
    const r = decide({ flag: true, pipeline: "legacy", eligible: true });
    expect(r.mode).toBe("legacy");
    expect(r.label).toBe("legacy");
  });

  it("Case C: flag TRUE + pipeline SHADOW + allowlisted → LEGACY + shadow", () => {
    const r = decide({ flag: true, pipeline: "shadow", eligible: true });
    expect(r.mode).toBe("legacy");
    expect(r.label).toBe("shadow_legacy");
    expect(r.scheduleShadowAfterSuccess).toBe(true);
  });

  it("Case D: flag TRUE + pipeline ENGINE + non-allowlisted → LEGACY", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: false });
    expect(r.mode).toBe("legacy");
    expect(r.internalCanary).toBe(false);
  });

  it("Case E: flag TRUE + pipeline ENGINE + allowlisted authenticated → ENGINE_INTERNAL", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: true, userId: USER });
    expect(r.mode).toBe("engine_internal");
    expect(r.label).toBe("engine_internal");
    expect(r.scheduleShadowAfterSuccess).toBe(false);
    expect(r.internalCanary).toBe(true);
  });

  it("Case F: unauthenticated/guest → LEGACY never Engine", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: true, userId: null });
    expect(r.mode).toBe("legacy");
    expect(r.legacyReason).toBe("unauthenticated");
  });

  it("Case G: lookup fails → fail closed LEGACY", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: true, lookupFailed: true });
    expect(r.mode).toBe("legacy");
    expect(r.legacyReason).toBe("lookup_failed");
  });
});

describe("Engine provider execution gate", () => {
  it("requires flag, engine pipeline, userId, and allowlist", () => {
    expect(
      canExecuteEngineProvider({
        toolId: "maro_web",
        pipeline: "engine",
        promptCompilerV2: true,
        userId: USER,
        internalCanaryEligible: true,
      })
    ).toBe(true);

    expect(
      canExecuteEngineProvider({
        toolId: "maro_web",
        pipeline: "engine",
        promptCompilerV2: false,
        userId: USER,
        internalCanaryEligible: true,
      })
    ).toBe(false);

    expect(
      canExecuteEngineProvider({
        toolId: "maro_web",
        pipeline: "shadow",
        promptCompilerV2: true,
        userId: USER,
        internalCanaryEligible: true,
      })
    ).toBe(false);

    expect(
      canExecuteEngineProvider({
        toolId: "maro_web",
        pipeline: "engine",
        promptCompilerV2: true,
        userId: USER,
        internalCanaryEligible: false,
      })
    ).toBe(false);

    expect(
      canExecuteEngineProvider({
        toolId: "maro_web",
        pipeline: "engine",
        promptCompilerV2: true,
        internalCanaryEligible: true,
      })
    ).toBe(false);
  });
});

describe("kill switch behavior (pure decision)", () => {
  it("prompt_compiler_v2=false blocks engine internal even when pipeline=engine", () => {
    const r = decide({ flag: false, pipeline: "engine", eligible: true });
    expect(r.mode).toBe("legacy");
  });

  it("production_pipeline=legacy blocks engine internal even when flag=true", () => {
    const r = decide({ flag: true, pipeline: "legacy", eligible: true });
    expect(r.mode).toBe("legacy");
  });
});
