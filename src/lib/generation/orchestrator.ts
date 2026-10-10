import "server-only";
import { IMAZH_REQUEST_PROMPT_MAX_CHARS } from "./imagePromptValidation";
import type { ImageProviderObservation } from "@/lib/ai/imageObservation";
import { generationAvailabilityError } from "@/lib/modules/availability";
import type { User } from "@supabase/supabase-js";
import {
  finalizeCreditCharge,
  releaseCreditReserve,
  reserveCredits,
} from "@/lib/credits/ledger";
import { estimateProviderCostUsd } from "@/lib/cost/providerCost";
import { getProviderCostFallbackMaximumUsd } from "@/lib/cost/fallbackMaximums";
import { getPromptMaxChars, MAX_REFERENCE_IMAGES } from "@/lib/generation/limits";
import {
  ADMISSION_ERROR_CODES,
  countActiveJobs,
  createJob,
  cleanupStaleJobs,
  findJobByIdempotency,
  getJob,
  isInFlightJobStatus,
  updateJob,
  type GenerationJob,
} from "@/lib/generation/jobs";
import { assertCircuitAllows, getPlatformLimits, recordJobSpend } from "@/lib/security/circuitBreaker";
import { assertBudgetGuards } from "@/lib/operations/budgetGuards";
import { recordProviderCostEstimate } from "@/lib/cost/recordEstimate";
import { recordGenerationPricingSnapshot } from "@/lib/pricing/snapshots";
import { resolveEntitlements } from "@/lib/commerce/entitlements";
import { checkRateLimit, clientIp, detectPromptInjection, logAbuseEvent } from "@/lib/security/rateLimit";
import { bumpRiskScore } from "@/lib/security/riskScore";
import {
  getProfileCredits,
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";

export class GenerationGuardError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;
  constructor(status: number, code: string, message?: string, extra?: Record<string, unknown>) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export interface PrepareGenerationInput {
  provider?: string;
  req: Request;
  module: string;
  cost: number;
  model?: string;
  idempotencyKey?: string | null;
  promptText?: string;
  attachmentCount?: number;
  metadata?: Record<string, unknown>;
}

export interface PreparedGeneration {
  userId: string;
  userEmail: string;
  job: GenerationJob;
  idempotencyKey: string | null;
  cost: number;
  isFort: boolean;
  skipBilling: boolean;
}

export type GenerationFinancialTerminal = "pending" | "success" | "failed";

export interface GenerationFinancialState {
  terminal: GenerationFinancialTerminal;
}

/** Settle a prepared generation job to success or failure exactly once. */
export async function settlePreparedGeneration(opts: {
  financial: GenerationFinancialState;
  prep: PreparedGeneration;
  userId: string;
  module: string;
  cost: number;
  model?: string;
  provider?: string;
  imageObservation?: ImageProviderObservation;
  outcome: "success" | "failure";
  error?: string;
  generationId?: string | null;
  imageCount?: number;
}): Promise<void> {
  if (opts.financial.terminal !== "pending") return;

  if (opts.outcome === "success") {
    await completeGeneration({
      jobId: opts.prep.job.id,
      userId: opts.userId,
      module: opts.module,
      cost: opts.cost,
      skipBilling: opts.cost <= 0,
      model: opts.model,
      generationId: opts.generationId,
      imageCount: opts.imageCount,
      provider: opts.provider,
      imageObservation: opts.imageObservation,
    });
    opts.financial.terminal = "success";
    return;
  }

  await failGeneration({
    jobId: opts.prep.job.id,
    idempotencyKey: opts.prep.idempotencyKey,
    error: opts.error ?? "generation_failed",
    skipBilling: opts.cost <= 0,
  });
  opts.financial.terminal = "failed";
}

/** Guarantee a prepared job reaches a financial terminal state (failure if still pending). */
export async function ensurePreparedGenerationTerminal(opts: {
  financial: GenerationFinancialState;
  prep: PreparedGeneration;
  userId: string;
  module: string;
  cost: number;
  model?: string;
  incompleteError?: string;
}): Promise<void> {
  if (opts.financial.terminal !== "pending") return;

  const job = await getJob(opts.prep.job.id);
  if (job?.status === "completed" || Number(job?.credits_charged ?? 0) > 0) {
    opts.financial.terminal = "success";
    return;
  }

  await settlePreparedGeneration({
    financial: opts.financial,
    prep: opts.prep,
    userId: opts.userId,
    module: opts.module,
    cost: opts.cost,
    model: opts.model,
    outcome: "failure",
    error: opts.incompleteError ?? "stream_incomplete",
  });
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

async function isEmailVerified(user: User): Promise<boolean> {
  if (user.email_confirmed_at) return true;
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.auth.admin.getUserById(user.id);
    return Boolean(data?.user?.email_confirmed_at);
  } catch {
    return false;
  }
}

export async function prepareGeneration(input: PrepareGenerationInput): Promise<PreparedGeneration> {
  const unavailable = generationAvailabilityError(input.module);
  if (unavailable) {
    const { status, error, ...extra } = unavailable;
    throw new GenerationGuardError(status, error, undefined, extra);
  }
  const { req, module, cost, model, promptText, attachmentCount, metadata } = input;
  const durableV1 = metadata?.v1_durable === true;
  if (durableV1) {
    const readiness = await getSupabaseAdmin().rpc("v1_image_lifecycle_version");
    if (readiness.error || readiness.data !== 2) throw new GenerationGuardError(503, "image_lifecycle_unavailable");
  }
  const idempotencyKey = input.idempotencyKey ?? null;
  const ip = clientIp(req);

  if (!supabaseServerConfigured()) {
    throw new GenerationGuardError(503, "no-supabase", "Supabase required for generation");
  }

  const user = await getUserFromToken(bearer(req));
  if (!user) {
    throw new GenerationGuardError(401, "unauthorized");
  }

  const profile = await getProfileCredits(user.id);
  if (!profile) {
    throw new GenerationGuardError(401, "unauthorized");
  }

  let admissionConcurrency = 1;
  if (profile.is_admin) {
    /* admins bypass most limits but still log jobs */
  } else {
    if (profile.generation_paused) {
      throw new GenerationGuardError(403, "generation_paused");
    }

    const verified = await isEmailVerified(user);
    if (!verified) {
      throw new GenerationGuardError(403, "email_not_verified", "Verify your email before generating.");
    }

    const circuit = await assertCircuitAllows(module);
    if (!circuit.ok) {
      throw new GenerationGuardError(503, circuit.reason);
    }

    const budget = await assertBudgetGuards({ module, toolId: module, provider: input.provider ?? inferProviderFromModule(module) });
    if (!budget.ok) {
      throw new GenerationGuardError(503, budget.reason);
    }

    const limits = await getPlatformLimits();

    if (promptText) {
      // V1 Imazh has a separate transport ceiling and compiled-provider preflight.
      // Leave every other module and legacy entry point on its existing policy.
      const maxChars = module === "reklama" && input.metadata?.v1_durable === true
        ? IMAZH_REQUEST_PROMPT_MAX_CHARS : getPromptMaxChars(limits);
      if (promptText.length > maxChars) {
        throw new GenerationGuardError(400, "prompt_too_long", undefined, { max: maxChars });
      }
      if (detectPromptInjection(promptText)) {
        await logAbuseEvent({
          user_id: user.id,
          ip,
          event_type: "prompt_injection_attempt",
          severity: "warn",
          metadata: { module },
        });
        throw new GenerationGuardError(400, "prompt_rejected");
      }
    }

    if ((attachmentCount ?? 0) > MAX_REFERENCE_IMAGES) {
      throw new GenerationGuardError(400, "too_many_attachments", undefined, {
        max: MAX_REFERENCE_IMAGES,
      });
    }

    const rlUser = await checkRateLimit("user", user.id, 120, 3600, "strict");
    if (!rlUser.allowed) {
      await bumpRiskScore(user.id, 5);
      throw new GenerationGuardError(429, "rate_limited", undefined, {
        retry_after: rlUser.retryAfter,
      });
    }

    const rlIp = await checkRateLimit("ip", ip, 200, 3600, "strict");
    if (!rlIp.allowed) {
      throw new GenerationGuardError(429, "rate_limited", undefined, {
        retry_after: rlIp.retryAfter,
      });
    }

    const rlGen = await checkRateLimit(`gen:${module}`, user.id, 30, 3600, "strict");
    if (!rlGen.allowed) {
      throw new GenerationGuardError(429, "rate_limited", undefined, {
        retry_after: rlGen.retryAfter,
      });
    }

    const entitlements = await resolveEntitlements(user.id);
    const maxConcurrent = profile.is_admin
      ? (limits.maxConcurrentFort ?? 3)
      : entitlements.concurrency_limit;
    admissionConcurrency = maxConcurrent;

    await cleanupStaleJobs();
    await cleanupStaleJobs(user.id);

    const active = await countActiveJobs(user.id);
    if (active >= maxConcurrent) {
      throw new GenerationGuardError(429, "concurrency_limit", undefined, {
        retry_after: 30,
        limit: maxConcurrent,
      });
    }

    const globalActive = await countActiveJobs();
    if (globalActive >= (limits.maxActiveJobsGlobal ?? 50)) {
      throw new GenerationGuardError(503, "platform_busy");
    }
  }

  const entitlements = await resolveEntitlements(user.id);
  const isProOrBusiness =
    entitlements.plan_status === "ACTIVE" ||
    entitlements.plan_status === "RENEWAL_WINDOW" ||
    entitlements.plan_status === "BUSINESS_ACTIVE";
  const skipBilling = cost <= 0;

  if (idempotencyKey) {
    const existing = await findJobByIdempotency(user.id, idempotencyKey);
    if (existing) {
      if (existing.status === "completed") {
        throw new GenerationGuardError(409, "duplicate_job", undefined, { job_id: existing.id });
      }
      if (isInFlightJobStatus(existing.status)) {
        throw new GenerationGuardError(409, "generation_in_progress", undefined, {
          job_id: existing.id,
          status: existing.status,
        });
      }
    }
  }

  const created = await createJob({
    user_id: user.id,
    module,
    model,
    idempotency_key: idempotencyKey,
    priority: isProOrBusiness ? 10 : 0,
    metadata: metadata ?? {},
    ...(["reklama", "logo"].includes(module) ? { admission: {
      exposureUsd: getProviderCostFallbackMaximumUsd(module), maxConcurrent: admissionConcurrency,
    } } : {}),
  });

  if (!created.ok) {
    if ((ADMISSION_ERROR_CODES as readonly string[]).includes(created.code)) {
      const timed = created.code.includes("spend_limit");
      const now = Date.now();
      const windowMs = created.code.includes("daily") ? 86400000 : 3600000;
      const retry = timed ? Math.ceil((windowMs - now % windowMs) / 1000) : undefined;
      throw new GenerationGuardError(created.code === "concurrency_limit" || timed ? 429 : 503, created.code, undefined, retry ? { retry_after: retry } : undefined);
    }
    if (created.code === "job_idempotency_conflict") {
      throw new GenerationGuardError(409, "generation_in_progress", undefined, {
        job_id: created.detail,
      });
    }
    // Database details are logged by createJob, never returned to customers.
    throw new GenerationGuardError(500, created.code);
  }

  const job = created.job;

  if (!skipBilling && cost > 0) {
    const available = Math.max(0, profile.credits);
    if (available < cost) {
      await updateJob(job.id, { status: "failed", error: "insufficient_credits" });
      throw new GenerationGuardError(402, "insufficient-credits", undefined, {
        needed: cost,
        have: available,
      });
    }

    const balance = await reserveCredits(user.id, cost, job.id, idempotencyKey ?? undefined);
    if (balance < 0) {
      await updateJob(job.id, { status: "failed", error: "insufficient_credits" });
      throw new GenerationGuardError(402, "insufficient-credits", undefined, { needed: cost });
    }

    if (!durableV1) await updateJob(job.id, { status: "reserved", credits_reserved: cost });
  }

  if (durableV1) {
    const started = await getSupabaseAdmin().rpc("start_v1_image_job", { p_job_id: job.id });
    if (started.error || started.data !== true) throw new GenerationGuardError(503, "image_job_start_unverified", undefined, { job_id: job.id });
  } else await updateJob(job.id, { status: "processing", started_at: new Date().toISOString() });

  return {
    userId: user.id,
    userEmail: profile.email,
    job,
    idempotencyKey,
    cost,
    isFort: isProOrBusiness,
    skipBilling,
  };
}

export async function completeGeneration(opts: {
  jobId: string;
  userId: string;
  module: string;
  cost: number;
  skipBilling?: boolean;
  model?: string;
  provider?: string;
  imageObservation?: ImageProviderObservation;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  generationId?: string | null;
  providerReportedUsd?: number | null;
  pricingBreakdown?: Record<string, unknown>;
}): Promise<void> {
  if (!opts.skipBilling && opts.cost > 0) {
    if (!(await finalizeCreditCharge(opts.jobId))) throw new GenerationGuardError(503, "credit_finalization_unverified");
  } else {
    await updateJob(opts.jobId, { status: "completed", credits_charged: 0, finished_at: new Date().toISOString() });
  }
  // Financial truth is committed. Optional accounting must not turn success into failure.
  try { await recordCompletedGenerationCosts(opts); }
  catch { console.error("[generation] post-settlement accounting requires repair", opts.jobId); }
}

export async function recordCompletedGenerationCosts(opts: Parameters<typeof completeGeneration>[0]): Promise<void> {
  const observation = opts.imageObservation;
  const inputTokens = typeof observation?.usage?.input_tokens === "number" ? observation.usage.input_tokens : opts.inputTokens;
  const outputTokens = typeof observation?.usage?.output_tokens === "number" ? observation.usage.output_tokens : opts.outputTokens;
  const usageUsd = observation ? observation.estimate.usd ?? 0 : estimateProviderCostUsd({
    model: opts.model,
    inputTokens,
    outputTokens,
    imageCount: opts.imageCount,
  });
  const fallbackMaxUsd = getProviderCostFallbackMaximumUsd(opts.module);
  const costUsd =
    opts.providerReportedUsd ??
    (observation ? observation.estimate.usd ?? fallbackMaxUsd : (usageUsd > 0 ? Math.max(usageUsd, fallbackMaxUsd) : fallbackMaxUsd || usageUsd));

  await updateJob(opts.jobId, {
    provider_cost_usd: opts.providerReportedUsd ?? costUsd,
    ...(inputTokens != null ? { input_tokens: inputTokens } : {}),
    ...(outputTokens != null ? { output_tokens: outputTokens } : {}),
    credits_charged: opts.skipBilling ? 0 : opts.cost,
  });

  await recordJobSpend(opts.userId, opts.module, opts.providerReportedUsd ?? costUsd, opts.skipBilling ? 0 : opts.cost, opts.jobId);

  await recordProviderCostEstimate({
    generationId: opts.generationId,
    jobId: opts.jobId,
    toolId: opts.module,
    modelId: opts.model,
    provider: opts.provider ?? inferProviderFromModule(opts.module),
    imageEstimate: observation?.estimate,
    usageMetadata: observation ? { image_provider: observation } : undefined,
    inputTokens,
    outputTokens,
    imageCount: opts.imageCount,
    providerReportedUsd: opts.providerReportedUsd,
    configuredFixedUsd: usageUsd > 0 ? usageUsd : null,
    fallbackMaximumUsd: fallbackMaxUsd,
  });

  await recordGenerationPricingSnapshot({
    generationId: opts.generationId,
    jobId: opts.jobId,
    userId: opts.userId,
    module: opts.module,
    creditsCharged: opts.skipBilling ? 0 : opts.cost,
    model: opts.model,
    pricingBreakdown: observation ? { ...opts.pricingBreakdown, image_provider: observation } : opts.pricingBreakdown,
  });
}

function inferProviderFromModule(module: string): string {
  if (module.includes("image") || module.includes("logo")) return "openai";
  if (module.includes("audio")) return "elevenlabs";
  return "anthropic";
}

export async function failGeneration(opts: {
  jobId: string;
  idempotencyKey?: string | null;
  error: string;
  skipBilling?: boolean;
}): Promise<boolean> {
  await updateJob(opts.jobId, {
    status: "failed",
    error: opts.error,
    finished_at: new Date().toISOString(),
  });
  if (opts.skipBilling) return false;
  return releaseCreditReserve(opts.jobId, opts.idempotencyKey ?? `fail-${opts.jobId}`);
}

export function guardErrorResponse(err: unknown): Response {
  if (err instanceof GenerationGuardError) {
    return Response.json(
      { error: err.code, message: err.message, ...err.extra },
      { status: err.status, headers: typeof err.extra?.retry_after === "number" ? { "Retry-After": String(err.extra.retry_after) } : undefined }
    );
  }
  return Response.json({ error: "internal" }, { status: 500 });
}

export { bearer };
