import "server-only";
import type { User } from "@supabase/supabase-js";
import {
  finalizeCreditCharge,
  releaseCreditReserve,
  reserveCredits,
} from "@/lib/credits/ledger";
import { estimateProviderCostUsd } from "@/lib/cost/providerCost";
import { getPromptMaxChars, MAX_REFERENCE_IMAGES } from "@/lib/generation/limits";
import {
  countActiveJobs,
  createJob,
  cleanupStaleJobs,
  findJobByIdempotency,
  updateJob,
  type GenerationJob,
} from "@/lib/generation/jobs";
import { assertCircuitAllows, getPlatformLimits, recordJobSpend } from "@/lib/security/circuitBreaker";
import { checkRateLimit, detectPromptInjection, logAbuseEvent } from "@/lib/security/rateLimit";
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
  const { req, module, cost, model, promptText, attachmentCount, metadata } = input;
  const idempotencyKey = input.idempotencyKey ?? null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

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

    const limits = await getPlatformLimits();

    if (promptText) {
      const maxChars = getPromptMaxChars(limits);
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

    const rlUser = await checkRateLimit("user", user.id, 120, 3600);
    if (!rlUser.allowed) {
      await bumpRiskScore(user.id, 5);
      throw new GenerationGuardError(429, "rate_limited", undefined, {
        retry_after: rlUser.retryAfter,
      });
    }

    const rlIp = await checkRateLimit("ip", ip, 200, 3600);
    if (!rlIp.allowed) {
      throw new GenerationGuardError(429, "rate_limited", undefined, {
        retry_after: rlIp.retryAfter,
      });
    }

    const rlGen = await checkRateLimit(`gen:${module}`, user.id, 30, 3600);
    if (!rlGen.allowed) {
      throw new GenerationGuardError(429, "rate_limited", undefined, {
        retry_after: rlGen.retryAfter,
      });
    }

    const isFort = profile.plan === "fort" && (await hasFortActive(user.id));
    const maxConcurrent = isFort
      ? (limits.maxConcurrentFort ?? 3)
      : (limits.maxConcurrentFree ?? 1);

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

  const isFort = profile.plan === "fort" && (await hasFortActive(user.id));
  const skipBilling = cost <= 0;

  if (idempotencyKey) {
    const existing = await findJobByIdempotency(user.id, idempotencyKey);
    if (existing) {
      if (existing.status === "completed") {
        throw new GenerationGuardError(409, "duplicate_job", undefined, { job_id: existing.id });
      }
      return {
        userId: user.id,
        userEmail: profile.email,
        job: existing,
        idempotencyKey,
        cost,
        isFort,
        skipBilling,
      };
    }
  }

  const created = await createJob({
    user_id: user.id,
    module,
    model,
    idempotency_key: idempotencyKey,
    priority: isFort ? 10 : 0,
    metadata: metadata ?? {},
  });

  if (!created.ok) {
    throw new GenerationGuardError(500, created.code, created.detail);
  }

  const job = created.job;

  if (!skipBilling && cost > 0) {
    const available = profile.credits;
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

    await updateJob(job.id, { status: "reserved", credits_reserved: cost });
  }

  await updateJob(job.id, { status: "processing", started_at: new Date().toISOString() });

  return {
    userId: user.id,
    userEmail: profile.email,
    job,
    idempotencyKey,
    cost,
    isFort,
    skipBilling,
  };
}

async function hasFortActive(userId: string): Promise<boolean> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("profiles")
      .select("plan, fort_until")
      .eq("id", userId)
      .single();
    if ((data?.plan as string) !== "fort") return false;
    const until = data?.fort_until as string | null;
    if (until && new Date(until) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function completeGeneration(opts: {
  jobId: string;
  userId: string;
  module: string;
  cost: number;
  skipBilling?: boolean;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
}): Promise<void> {
  const costUsd = estimateProviderCostUsd({
    model: opts.model,
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
    imageCount: opts.imageCount,
  });

  if (!opts.skipBilling && opts.cost > 0) {
    await finalizeCreditCharge(opts.jobId);
  } else {
    await updateJob(opts.jobId, {
      status: "completed",
      credits_charged: opts.skipBilling ? 0 : opts.cost,
      finished_at: new Date().toISOString(),
    });
  }

  await updateJob(opts.jobId, {
    provider_cost_usd: costUsd,
    ...(opts.inputTokens != null ? { input_tokens: opts.inputTokens } : {}),
    ...(opts.outputTokens != null ? { output_tokens: opts.outputTokens } : {}),
    credits_charged: opts.skipBilling ? 0 : opts.cost,
  });

  await recordJobSpend(opts.userId, opts.module, costUsd, opts.skipBilling ? 0 : opts.cost);
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
      { status: err.status }
    );
  }
  return Response.json({ error: "internal" }, { status: 500 });
}

export { bearer };
