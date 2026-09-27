import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildInitialExecutionTelemetry } from "@/lib/engine/executionTelemetry";
import { createImageClientAbortScope } from "@/lib/generation/imageStreamLifecycle";
import {
  runImageEngineInternalGeneration,
  type ImageEngineProviderCalls,
} from "@/lib/engine/imageEngineRun";
import { resolveImageEffectiveExecution } from "@/lib/engine/imageExecution";

const { releaseCreditReserve, finalizeCreditCharge } = vi.hoisted(() => ({
  releaseCreditReserve: vi.fn(async () => true),
  finalizeCreditCharge: vi.fn(async () => true),
}));

const getJob = vi.hoisted(() => vi.fn(async () => null as import("@/lib/generation/jobs").GenerationJob | null));

vi.mock("@/lib/credits/ledger", () => ({
  releaseCreditReserve,
  finalizeCreditCharge,
  reserveCredits: vi.fn(async () => 10),
}));

vi.mock("@/lib/generation/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/generation/jobs")>();
  return {
    ...actual,
    updateJob: vi.fn(async () => undefined),
    getJob,
  };
});

vi.mock("@/lib/cost/providerCost", () => ({
  estimateProviderCostUsd: vi.fn(() => 0),
}));

vi.mock("@/lib/cost/fallbackMaximums", () => ({
  getProviderCostFallbackMaximumUsd: vi.fn(() => 0),
}));

vi.mock("@/lib/cost/recordEstimate", () => ({
  recordProviderCostEstimate: vi.fn(async () => undefined),
}));

vi.mock("@/lib/pricing/snapshots", () => ({
  recordGenerationPricingSnapshot: vi.fn(async () => undefined),
}));

vi.mock("@/lib/security/circuitBreaker", () => ({
  recordJobSpend: vi.fn(async () => undefined),
}));

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  const { buildImazhTestContext } = await import("@/lib/engine/imageParityFixtures");
  return {
    ...actual,
    loadCompileContext: vi.fn(async () => buildImazhTestContext()),
  };
});

function imagePrep(jobId: string, idempotencyKey: string) {
  return {
    userId: "user-1",
    userEmail: "user@test.com",
    job: {
      id: jobId,
      user_id: "user-1",
      module: "reklama",
      model: "gpt-image-2",
      status: "processing" as const,
      idempotency_key: idempotencyKey,
      credits_reserved: 6,
      credits_charged: 0,
      provider_cost_usd: null,
      input_tokens: null,
      output_tokens: null,
      retry_count: 0,
      priority: 0,
      error: null,
      metadata: {},
      started_at: new Date().toISOString(),
      finished_at: null,
      created_at: new Date().toISOString(),
    },
    idempotencyKey,
    cost: 6,
    isFort: false,
    skipBilling: false,
  };
}

describe("image failure lifecycle hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseCreditReserve.mockResolvedValue(true);
    finalizeCreditCharge.mockResolvedValue(true);
    getJob.mockResolvedValue(null);
  });

  describe("initial execution telemetry", () => {
    it("includes pending success=false, provider_request_count=0, and started timestamp", () => {
      const stamp = buildInitialExecutionTelemetry({
        configuredPipeline: "engine",
        effectiveExecution: "engine_internal",
        internalCanary: true,
        model: "gpt-image-2",
        module: "reklama",
        provider: "openai",
        compiler: "maro_engine_v1",
        operation: "generate",
        executionStartedAt: "2026-08-17T21:43:10.000Z",
      });

      expect(stamp.provider_request_count).toBe(0);
      expect(stamp.success).toBe(false);
      expect(stamp.execution_started_at).toBe("2026-08-17T21:43:10.000Z");
      expect(stamp.effective_execution).toBe("engine_internal");
    });
  });

  describe("client abort scope", () => {
    it("A: abort before provider attempt cancels linked abortSignal", () => {
      const clientAc = new AbortController();
      const req = new Request("https://maro.test/api/ai/image", {
        method: "POST",
        signal: clientAc.signal,
      });
      const scope = createImageClientAbortScope(req);
      expect(scope.abortSignal.aborted).toBe(false);

      clientAc.abort();

      expect(scope.abortSignal.aborted).toBe(true);
      expect(scope.clientDisconnected).toBe(true);
    });

    it("B: abort after provider attempt started does not cancel linked abortSignal", () => {
      const clientAc = new AbortController();
      const req = new Request("https://maro.test/api/ai/image", {
        method: "POST",
        signal: clientAc.signal,
      });
      const scope = createImageClientAbortScope(req);
      scope.markProviderAttemptStarted();

      clientAc.abort();

      expect(scope.clientDisconnected).toBe(true);
      expect(scope.abortSignal.aborted).toBe(false);
    });
  });

  describe("engine internal provider attempt stamp", () => {
    const generate = vi.fn(async () => ["BASE64"]);
    const edit = vi.fn(async () => ["BASE64_EDIT"]);
    const provider: ImageEngineProviderCalls = { generate, edit };

    beforeEach(() => {
      generate.mockClear();
      edit.mockClear();
      generate.mockResolvedValue(["BASE64"]);
    });

    it("B: onProviderAttemptStart fires once immediately before generate", async () => {
      const attempts: Array<{ operation: string; when: "before" | "after" }> = [];
      generate.mockImplementation(async () => {
        attempts.push({ operation: "generate", when: "after" });
        return ["BASE64"];
      });

      await runImageEngineInternalGeneration({
        engineToolId: "maro_imazh",
        userId: "user-1",
        userPrompt: "Ceramic vase product photo",
        selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
        model: "gpt-image-2",
        useBrain: false,
        fetchedUrls: [],
        resolvedRefBytes: [],
        n: 1,
        size: "1024x1536",
        provider,
        onProviderAttemptStart: async (info) => {
          attempts.push({ operation: info.operation, when: "before" });
          expect(info.providerRequestCount).toBe(1);
        },
      });

      expect(generate).toHaveBeenCalledTimes(1);
      expect(attempts).toEqual([
        { operation: "generate", when: "before" },
        { operation: "generate", when: "after" },
      ]);
    });

    it("E: compile failure → zero provider calls and no attempt stamp", async () => {
      const { loadCompileContext } = await import("@/lib/engine/storage");
      vi.mocked(loadCompileContext).mockRejectedValueOnce(new Error("compile_failed"));

      const onStart = vi.fn();
      const result = await runImageEngineInternalGeneration({
        engineToolId: "maro_imazh",
        userId: "user-1",
        userPrompt: "x",
        selections: {},
        model: "gpt-image-2",
        useBrain: false,
        fetchedUrls: [],
        resolvedRefBytes: [],
        n: 1,
        provider,
        onProviderAttemptStart: onStart,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.stage).toBe("compile");
        expect(result.providerRequestCount).toBe(0);
      }
      expect(generate).not.toHaveBeenCalled();
      expect(onStart).not.toHaveBeenCalled();
    });

    it("D: provider error → one call max, no retry", async () => {
      generate.mockRejectedValueOnce(new Error("rate_limit_exceeded"));

      const result = await runImageEngineInternalGeneration({
        engineToolId: "maro_imazh",
        userId: "user-1",
        userPrompt: "Ceramic vase",
        selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
        model: "gpt-image-2",
        useBrain: false,
        fetchedUrls: [],
        resolvedRefBytes: [],
        n: 1,
        provider,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.providerRequestCount).toBe(1);
      expect(generate).toHaveBeenCalledTimes(1);
    });

    it("I: successful engine generate remains one provider call", async () => {
      const result = await runImageEngineInternalGeneration({
        engineToolId: "maro_imazh",
        userId: "user-1",
        userPrompt: "Ceramic vase",
        selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
        model: "gpt-image-2",
        useBrain: false,
        fetchedUrls: [],
        resolvedRefBytes: [],
        n: 1,
        provider,
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.providerRequestCount).toBe(1);
      expect(generate).toHaveBeenCalledTimes(1);
    });
  });

  describe("success settlement ordering", () => {
    it("A: completeGeneration failure leaves financial pending; finally releases reserve", async () => {
      finalizeCreditCharge.mockRejectedValueOnce(new Error("db unavailable"));
      const { settlePreparedGeneration, ensurePreparedGenerationTerminal } = await import(
        "@/lib/generation/orchestrator"
      );

      const prep = imagePrep("job-settle-fail", "img-settle-fail");
      const financial = { terminal: "pending" as const };

      await expect(
        settlePreparedGeneration({
          financial,
          prep,
          userId: prep.userId,
          module: "reklama",
          cost: 6,
          model: "gpt-image-2",
          outcome: "success",
          imageCount: 1,
          generationId: "gen-1",
        })
      ).rejects.toThrow("db unavailable");

      expect(financial.terminal).toBe("pending");
      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);
      expect(releaseCreditReserve).not.toHaveBeenCalled();

      await ensurePreparedGenerationTerminal({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
        incompleteError: "settlement_failed",
      });

      expect(financial.terminal).toBe("failed");
      expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);
    });

    it("B: successful settlement marks success only after finalize; finally does not release", async () => {
      const { settlePreparedGeneration, ensurePreparedGenerationTerminal } = await import(
        "@/lib/generation/orchestrator"
      );

      const prep = imagePrep("job-settle-ok", "img-settle-ok");
      const financial = { terminal: "pending" as const };

      await settlePreparedGeneration({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
        outcome: "success",
        imageCount: 1,
      });

      expect(financial.terminal).toBe("success");
      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);

      await ensurePreparedGenerationTerminal({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
      });

      expect(releaseCreditReserve).not.toHaveBeenCalled();
      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);
    });

    it("C: finally treats already-charged job as success and does not release", async () => {
      const { ensurePreparedGenerationTerminal } = await import("@/lib/generation/orchestrator");

      getJob.mockResolvedValueOnce({
        ...imagePrep("job-charged", "img-charged").job,
        status: "completed",
        credits_charged: 6,
      });

      const prep = imagePrep("job-charged", "img-charged");
      const financial = { terminal: "pending" as const };

      await ensurePreparedGenerationTerminal({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
        incompleteError: "stream_incomplete",
      });

      expect(financial.terminal).toBe("success");
      expect(releaseCreditReserve).not.toHaveBeenCalled();
    });
  });

  describe("financial terminalization", () => {
    it("F/G: ensurePreparedGenerationTerminal releases abandoned image job once", async () => {
      const { ensurePreparedGenerationTerminal } = await import("@/lib/generation/orchestrator");

      const prep = imagePrep("job-img-abandon", "img-abandon");
      const financial = { terminal: "pending" as const };

      await ensurePreparedGenerationTerminal({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
        incompleteError: "stream_incomplete",
      });

      expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
      expect(releaseCreditReserve).toHaveBeenCalledWith("job-img-abandon", "img-abandon");
      expect(finalizeCreditCharge).not.toHaveBeenCalled();
      expect(financial.terminal).toBe("failed");

      await ensurePreparedGenerationTerminal({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
      });
      expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
    });

    it("G: success terminal prevents duplicate failure release in finally", async () => {
      const { ensurePreparedGenerationTerminal, settlePreparedGeneration } = await import(
        "@/lib/generation/orchestrator"
      );

      const prep = imagePrep("job-img-success", "img-success");
      const financial = { terminal: "pending" as const };

      await settlePreparedGeneration({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
        outcome: "success",
      });

      await ensurePreparedGenerationTerminal({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 6,
        model: "gpt-image-2",
      });

      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);
      expect(releaseCreditReserve).not.toHaveBeenCalled();
    });
  });

  describe("non-canary legacy execution unchanged", () => {
    it("J: rolled-back flags keep legacy execution for canary user", () => {
      const decision = resolveImageEffectiveExecution({
        configuredPipeline: "shadow",
        promptCompilerV2: false,
        userId: "fec01baa-8451-4112-84fb-8552f8b31686",
        internalCanaryEligible: false,
        scheduleShadowAfterSuccess: true,
        engineToolId: "maro_imazh",
      });

      expect(decision.mode).toBe("legacy");
      expect(decision.label).toBe("shadow_legacy");
      expect(decision.internalCanary).toBe(false);
    });
  });
});
