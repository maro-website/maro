import { describe, expect, it } from "vitest";
import { canExecuteEngineProvider } from "@/lib/engine/adapters/executeGate";
import { resolveImageEffectiveExecution } from "@/lib/engine/imageExecution";

const USER = "11111111-1111-1111-1111-111111111111";

function decide(input: {
  flag: boolean;
  pipeline: "legacy" | "shadow" | "engine";
  eligible: boolean;
  userId?: string | null;
  lookupFailed?: boolean;
  scheduleShadow?: boolean;
}) {
  return resolveImageEffectiveExecution({
    configuredPipeline: input.pipeline,
    promptCompilerV2: input.flag,
    userId: input.userId === undefined ? USER : input.userId,
    internalCanaryEligible: input.eligible,
    scheduleShadowAfterSuccess: input.scheduleShadow ?? input.pipeline === "shadow",
    engineToolId: "maro_imazh",
    lookupFailed: input.lookupFailed,
  });
}

describe("maroImazh execution decision truth table", () => {
  it("A: pipeline legacy + canary + global flag → legacy only", () => {
    const r = decide({ flag: true, pipeline: "legacy", eligible: true });
    expect(r.mode).toBe("legacy");
    expect(r.label).toBe("legacy");
    expect(r.scheduleShadowAfterSuccess).toBe(false);
  });

  it("B: pipeline engine + live flag OFF + canary → legacy only", () => {
    const r = decide({ flag: false, pipeline: "engine", eligible: true });
    expect(r.mode).toBe("legacy");
    expect(r.legacyReason).toBe("prompt_compiler_v2_disabled");
  });

  it("C: pipeline engine + live ON + non-canary → legacy only", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: false });
    expect(r.mode).toBe("legacy");
    expect(r.internalCanary).toBe(false);
    expect(r.legacyReason).toBe("not_internal_canary_eligible");
  });

  it("D: pipeline engine + live ON + canary → engine_internal", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: true, userId: USER });
    expect(r.mode).toBe("engine_internal");
    expect(r.label).toBe("engine_internal");
    expect(r.scheduleShadowAfterSuccess).toBe(false);
    expect(r.internalCanary).toBe(true);
  });

  it("pipeline shadow + canary → shadow_legacy label, legacy mode", () => {
    const r = decide({ flag: true, pipeline: "shadow", eligible: true, scheduleShadow: true });
    expect(r.mode).toBe("legacy");
    expect(r.label).toBe("shadow_legacy");
    expect(r.scheduleShadowAfterSuccess).toBe(true);
  });

  it("unauthenticated → legacy never Engine", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: true, userId: null });
    expect(r.mode).toBe("legacy");
    expect(r.legacyReason).toBe("unauthenticated");
  });

  it("lookup fails → fail closed legacy", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: true, lookupFailed: true });
    expect(r.mode).toBe("legacy");
    expect(r.legacyReason).toBe("lookup_failed");
  });

  it("T: non-canary while pipeline engine → still legacy", () => {
    const r = decide({ flag: true, pipeline: "engine", eligible: false });
    expect(r.mode).toBe("legacy");
    expect(r.configuredPipeline).toBe("engine");
    expect(r.label).toBe("legacy");
  });
});

describe("Engine provider execution gate (maroImazh)", () => {
  it("requires flag, engine pipeline, userId, and allowlist", () => {
    expect(
      canExecuteEngineProvider({
        toolId: "maro_imazh",
        pipeline: "engine",
        promptCompilerV2: true,
        userId: USER,
        internalCanaryEligible: true,
      })
    ).toBe(true);

    expect(
      canExecuteEngineProvider({
        toolId: "maro_imazh",
        pipeline: "engine",
        promptCompilerV2: false,
        userId: USER,
        internalCanaryEligible: true,
      })
    ).toBe(false);
  });
});
