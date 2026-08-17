import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationJob } from "@/lib/generation/jobs";

const releaseCreditReserve = vi.fn(async () => true);
const finalizeCreditCharge = vi.fn(async () => true);
const reserveCredits = vi.fn(async () => 10);

const updateJob = vi.fn(async () => undefined);
const findJobByIdempotency = vi.fn(async (): Promise<GenerationJob | null> => null);
const createJob = vi.fn();
const countActiveJobs = vi.fn(async () => 0);

const supabaseFrom = vi.fn();

vi.mock("@/lib/credits/ledger", () => ({
  releaseCreditReserve,
  finalizeCreditCharge,
  reserveCredits,
}));

vi.mock("@/lib/generation/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/generation/jobs")>();
  return {
    ...actual,
    updateJob,
    findJobByIdempotency,
    createJob,
    countActiveJobs,
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
  assertCircuitAllows: vi.fn(async () => ({ ok: true })),
  getPlatformLimits: vi.fn(async () => ({
    maxConcurrentFort: 3,
    maxConcurrentFree: 1,
    maxActiveJobsGlobal: 50,
  })),
  recordJobSpend: vi.fn(async () => undefined),
}));

vi.mock("@/lib/operations/budgetGuards", () => ({
  assertBudgetGuards: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  detectPromptInjection: vi.fn(() => false),
  logAbuseEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/security/riskScore", () => ({
  bumpRiskScore: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServerConfigured: vi.fn(() => true),
  getUserFromToken: vi.fn(async () => ({ id: "user-1", email_confirmed_at: "2026-01-01" })),
  getProfileCredits: vi.fn(async () => ({
    credits: 100,
    email: "user@test.com",
    is_admin: true,
    plan: "free",
    generation_paused: false,
  })),
  getSupabaseAdmin: vi.fn(() => ({ from: supabaseFrom })),
}));

function job(overrides: Partial<GenerationJob> = {}): GenerationJob {
  return {
    id: "job-1",
    user_id: "user-1",
    module: "web",
    model: "claude-test",
    status: "processing",
    idempotency_key: "idem-1",
    credits_reserved: 5,
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
    ...overrides,
  };
}

function mockReq(): Request {
  return new Request("https://maro.test/api/ai/generate", {
    method: "POST",
    headers: { Authorization: "Bearer token" },
  });
}

describe("P0 credit lifecycle hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseCreditReserve.mockResolvedValue(true);
    finalizeCreditCharge.mockResolvedValue(true);
    reserveCredits.mockResolvedValue(95);
    countActiveJobs.mockResolvedValue(0);
    findJobByIdempotency.mockResolvedValue(null);
    createJob.mockResolvedValue({ ok: true, job: job({ status: "pending", credits_reserved: 0 }) });
  });

  describe("Test 1 — stale cleanup releases reserved credits", () => {
    function mockStaleSelect(rows: Array<{ id: string; status: string; credits_reserved: number }>) {
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const result = { data: rows, error: null };
      const selectChain: {
        in: ReturnType<typeof vi.fn>;
        lt: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        then: Promise<{ data: typeof rows; error: null }>["then"];
      } = {
        in: vi.fn(),
        lt: vi.fn(),
        eq: vi.fn(async () => result),
        then(onFulfilled, onRejected) {
          return Promise.resolve(result).then(onFulfilled, onRejected);
        },
      };
      selectChain.in.mockReturnValue(selectChain);
      selectChain.lt.mockReturnValue(selectChain);

      supabaseFrom.mockReturnValue({
        select: vi.fn(() => selectChain),
        update: vi.fn(() => ({ eq: updateEq })),
      });

      return { selectChain, updateEq };
    }

    it("releases reservation and marks stale_timeout, idempotent on second run", async () => {
      const staleJob = {
        id: "stale-job-1",
        status: "processing",
        credits_reserved: 7,
      };

      const { selectChain, updateEq } = mockStaleSelect([staleJob]);

      const { cleanupStaleJobs } = await import("@/lib/generation/jobs");

      await cleanupStaleJobs("user-1");

      expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
      expect(releaseCreditReserve).toHaveBeenCalledWith("stale-job-1", "stale-stale-job-1");
      expect(updateEq).toHaveBeenCalledWith("id", "stale-job-1");

      selectChain.eq.mockResolvedValueOnce({ data: [], error: null });
      await cleanupStaleJobs("user-1");
      expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
    });

    it("does not release when job has no reservation", async () => {
      const staleJob = {
        id: "stale-job-2",
        status: "pending",
        credits_reserved: 0,
      };

      const { updateEq } = mockStaleSelect([staleJob]);

      const { cleanupStaleJobs } = await import("@/lib/generation/jobs");

      await cleanupStaleJobs();

      expect(releaseCreditReserve).not.toHaveBeenCalled();
      expect(updateEq).toHaveBeenCalledWith("id", "stale-job-2");
    });
  });

  describe("Test 2 — in-flight idempotent retry", () => {
    it("rejects duplicate in-flight idempotency without second reserve", async () => {
      findJobByIdempotency.mockResolvedValue(job({ status: "processing" }));

      const { prepareGeneration, GenerationGuardError } = await import("@/lib/generation/orchestrator");

      await expect(
        prepareGeneration({
          req: mockReq(),
          module: "web",
          cost: 5,
          idempotencyKey: "idem-1",
        })
      ).rejects.toMatchObject({
        status: 409,
        code: "generation_in_progress",
      });

      expect(createJob).not.toHaveBeenCalled();
      expect(reserveCredits).not.toHaveBeenCalled();
    });

    it("rejects createJob race idempotency conflict without second reserve", async () => {
      createJob.mockResolvedValue({
        ok: false,
        code: "job_idempotency_conflict",
        detail: "job-race-1",
      });

      const { prepareGeneration } = await import("@/lib/generation/orchestrator");

      await expect(
        prepareGeneration({
          req: mockReq(),
          module: "web",
          cost: 5,
          idempotencyKey: "idem-race",
        })
      ).rejects.toMatchObject({
        status: 409,
        code: "generation_in_progress",
      });

      expect(reserveCredits).not.toHaveBeenCalled();
    });

    it("preserves completed duplicate semantics", async () => {
      findJobByIdempotency.mockResolvedValue(job({ status: "completed" }));

      const { prepareGeneration } = await import("@/lib/generation/orchestrator");

      await expect(
        prepareGeneration({
          req: mockReq(),
          module: "web",
          cost: 5,
          idempotencyKey: "idem-done",
        })
      ).rejects.toMatchObject({
        status: 409,
        code: "duplicate_job",
      });
    });
  });

  describe("Test 3 — finalize idempotency", () => {
    it("calls finalizeCreditCharge once on success and allows safe second settle attempt", async () => {
      const { settlePreparedGeneration } = await import("@/lib/generation/orchestrator");
      type GenerationFinancialState = import("@/lib/generation/orchestrator").GenerationFinancialState;

      const prep = {
        userId: "user-1",
        userEmail: "user@test.com",
        job: job({ id: "job-finalize-1" }),
        idempotencyKey: "idem-finalize",
        cost: 5,
        isFort: false,
        skipBilling: false,
      };

      const financial: GenerationFinancialState = { terminal: "pending" };

      await settlePreparedGeneration({
        financial,
        prep,
        userId: prep.userId,
        module: "web",
        cost: 5,
        outcome: "success",
      });

      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);
      expect(finalizeCreditCharge).toHaveBeenCalledWith("job-finalize-1");
      expect(financial.terminal).toBe("success");

      await settlePreparedGeneration({
        financial,
        prep,
        userId: prep.userId,
        module: "web",
        cost: 5,
        outcome: "success",
      });

      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);
    });

    it("finalizeCreditCharge RPC is invoked once per success path (DB enforces single charge)", async () => {
      const { completeGeneration } = await import("@/lib/generation/orchestrator");

      await completeGeneration({
        jobId: "job-finalize-2",
        userId: "user-1",
        module: "web",
        cost: 3,
      });
      await completeGeneration({
        jobId: "job-finalize-2",
        userId: "user-1",
        module: "web",
        cost: 3,
      });

      expect(finalizeCreditCharge).toHaveBeenCalledTimes(2);
    });
  });

  describe("Test 4 — failure after partial chat stream", () => {
    it("releases credits when partial stream fails", async () => {
      const { settlePreparedGeneration, ensurePreparedGenerationTerminal } = await import(
        "@/lib/generation/orchestrator"
      );

      const prep = {
        userId: "user-1",
        userEmail: "user@test.com",
        job: job({ id: "job-chat-1", module: "chat" }),
        idempotencyKey: "idem-chat",
        cost: 1,
        isFort: false,
        skipBilling: false,
      };

      const financial = { terminal: "pending" as const };

      await settlePreparedGeneration({
        financial,
        prep,
        userId: prep.userId,
        module: "chat",
        cost: 1,
        outcome: "failure",
        error: "stream broke after partial output",
      });

      expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
      expect(releaseCreditReserve).toHaveBeenCalledWith("job-chat-1", "idem-chat");
      expect(finalizeCreditCharge).not.toHaveBeenCalled();
      expect(financial.terminal).toBe("failed");
    });

    it("ensurePreparedGenerationTerminal closes abandoned reservations", async () => {
      const { ensurePreparedGenerationTerminal } = await import("@/lib/generation/orchestrator");

      const prep = {
        userId: "user-1",
        userEmail: "user@test.com",
        job: job({ id: "job-chat-2", module: "chat" }),
        idempotencyKey: "idem-chat-2",
        cost: 1,
        isFort: false,
        skipBilling: false,
      };

      const financial = { terminal: "pending" as const };

      await ensurePreparedGenerationTerminal({
        financial,
        prep,
        userId: prep.userId,
        module: "chat",
        cost: 1,
      });

      expect(releaseCreditReserve).toHaveBeenCalledWith("job-chat-2", "idem-chat-2");
      expect(financial.terminal).toBe("failed");
    });
  });

  describe("Test 5 — normal success regression", () => {
    it("new generation reserves then finalizes exactly once", async () => {
      const { prepareGeneration, settlePreparedGeneration } = await import("@/lib/generation/orchestrator");

      const prep = await prepareGeneration({
        req: mockReq(),
        module: "web",
        cost: 5,
        idempotencyKey: "idem-success",
      });

      expect(reserveCredits).toHaveBeenCalledTimes(1);
      expect(reserveCredits).toHaveBeenCalledWith("user-1", 5, prep.job.id, "idem-success");

      const financial = { terminal: "pending" as const };
      await settlePreparedGeneration({
        financial,
        prep,
        userId: prep.userId,
        module: "web",
        cost: 5,
        outcome: "success",
      });

      expect(finalizeCreditCharge).toHaveBeenCalledTimes(1);
      expect(releaseCreditReserve).not.toHaveBeenCalled();
    });
  });

  describe("Test 6 — normal provider failure regression", () => {
    it("failure releases exactly once and does not finalize", async () => {
      const { prepareGeneration, settlePreparedGeneration } = await import("@/lib/generation/orchestrator");

      const prep = await prepareGeneration({
        req: mockReq(),
        module: "reklama",
        cost: 4,
        idempotencyKey: "idem-fail",
      });

      expect(reserveCredits).toHaveBeenCalledTimes(1);

      const financial = { terminal: "pending" as const };
      await settlePreparedGeneration({
        financial,
        prep,
        userId: prep.userId,
        module: "reklama",
        cost: 4,
        outcome: "failure",
        error: "provider_failed",
      });

      expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
      expect(releaseCreditReserve).toHaveBeenCalledWith(prep.job.id, "idem-fail");
      expect(finalizeCreditCharge).not.toHaveBeenCalled();
    });
  });
});
