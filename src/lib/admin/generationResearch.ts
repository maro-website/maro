import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { GenerationReviewError, validGenerationJobId } from "./generationReview";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value : null;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const strings = (value: unknown) => Object.fromEntries(Object.entries(record(value)).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
const stringList = (value: unknown) => Array.isArray(value) ? value.filter(item => typeof item === "string").join(", ") : "";

/** A bounded batch; operational access alone never enables identity or prompt research. */
export async function generationResearchSummaries(jobs: Array<{ id: string; userId: string }>, actor: { actorId: string; requestId: string }) {
  if (!jobs.length) return [];
  const db = getSupabaseAdmin();
  const [profiles, requests] = await Promise.all([
    db.from("profiles").select("id,email,full_name,created_at").in("id", [...new Set(jobs.map(job => job.userId))]),
    db.from("generation_jobs").select("id,user_id,prompt:metadata->v1_request->>prompt").in("id", jobs.map(job => job.id)),
  ]);
  if (profiles.error || requests.error) throw new GenerationReviewError(503, "research_unavailable");
  const audit = await db.from("audit_events").insert({ actor_id: actor.actorId, action: "v1.generation_research.listed",
    target_type: "generation_job", request_id: actor.requestId,
    metadata: { purpose: "product_research", jobIds: jobs.map(job => job.id) } });
  if (audit.error) throw new GenerationReviewError(503, "research_audit_unavailable");
  return jobs.map(job => {
    const profile = profiles.data?.find(row => row.id === job.userId);
    const request = requests.data?.find(row => row.id === job.id && row.user_id === job.userId);
    const prompt = text(request?.prompt);
    return { ...job, researcher: {
      name: text(profile?.full_name), email: text(profile?.email), joinedAt: text(profile?.created_at),
      profileAvailable: Boolean(profile), promptPreview: prompt?.slice(0, 180) ?? null,
    } };
  });
}

export async function readGenerationResearch(input: { jobId: string; actorId: string; requestId: string }) {
  if (!validGenerationJobId(input.jobId)) throw new GenerationReviewError(400, "invalid_job_id");
  const db = getSupabaseAdmin();
  const jobResult = await db.from("generation_jobs").select("id,user_id,created_at,started_at,finished_at,status,credits_charged,credits_reserved,metadata").eq("id", input.jobId).maybeSingle();
  if (jobResult.error) throw new GenerationReviewError(503, "research_unavailable");
  const job = jobResult.data;
  const metadata = record(job?.metadata), request = record(metadata.v1_request);
  if (!job || !validGenerationJobId(job.user_id) || metadata.v1_durable !== true || !["maro_imazh", "maro_logo"].includes(String(request.module))) {
    throw new GenerationReviewError(404, "generation_unavailable");
  }
  const now = new Date().toISOString();
  const [profile, trace, history, membership, activity] = await Promise.all([
    db.from("profiles").select("id,email,full_name,created_at,credits,is_creator").eq("id", job.user_id).maybeSingle(),
    db.from("pricing_snapshots").select("id,created_at,snapshot").eq("job_id", job.id).eq("user_id", job.user_id).eq("snapshot->>record_type", "v1_image_execution").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("generations").select("id,created_at").eq("job_id", job.id).eq("user_id", job.user_id).maybeSingle(),
    db.from("memberships").select("plan_id,expires_at").eq("user_id", job.user_id).eq("suspended", false).lte("started_at", now).gt("expires_at", now).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("generation_jobs").select("id", { count: "exact", head: true }).eq("user_id", job.user_id).eq("metadata->>v1_durable", "true"),
  ]);
  if ([profile, trace, history, membership, activity].some(result => result.error)) throw new GenerationReviewError(503, "research_unavailable");
  let workspace: { id: string; name: string } | null = null;
  if (typeof request.workspaceId === "string") {
    const result = await db.from("workspaces").select("id,name").eq("id", request.workspaceId).eq("owner_id", job.user_id).maybeSingle();
    if (result.error) throw new GenerationReviewError(503, "research_unavailable");
    workspace = result.data;
  }
  const snapshot = record(trace.data?.snapshot);
  // Never associate another user's trace with this job, or reconstruct old prompts from today's config.
  const traceMatches = record(snapshot.request).userId === job.user_id;
  const canonical = traceMatches ? record(snapshot.canonical) : {};
  const provenance = record(canonical.provenance);
  const execution = record(metadata.execution), observation = record(execution.image_provider);
  const estimate = record(observation.estimate), usage = record(observation.usage), model = record(request.model);
  const logoWizard = record(request.logoWizard), logoColors = record(record(logoWizard.look).colors);
  const profileRow = profile.data;
  const result = {
    jobId: job.id, userId: job.user_id,
    user: { name: text(profileRow?.full_name), email: text(profileRow?.email), joinedAt: text(profileRow?.created_at),
      profileAvailable: Boolean(profileRow), currentCredits: number(profileRow?.credits), creator: typeof profileRow?.is_creator === "boolean" ? profileRow.is_creator : null,
      currentPlan: profileRow ? text(membership.data?.plan_id) ?? "free" : null, planExpiresAt: text(membership.data?.expires_at), recordedGenerations: activity.count ?? null },
    originalPrompt: text(request.prompt), providerPrompt: text(canonical.prompt), traceAvailable: traceMatches,
    module: text(request.module), model: text(request.logicalModel), provider: text(model.provider), providerModel: text(model.providerModelId),
    operation: text(canonical.operation) ?? text(observation.operation), size: text(request.size), quality: text(request.quality),
    imageCount: number(request.imageCount), referenceCount: Array.isArray(request.references) ? request.references.length : null,
    brainRequested: typeof request.useBrain === "boolean" ? request.useBrain : null,
    brainUsed: typeof provenance.brainUsed === "boolean" ? provenance.brainUsed : null,
    selections: strings(request.selections),
    logoAnswers: request.module === "maro_logo" ? {
      brand: strings(logoWizard.brand), logo: strings(logoWizard.logo), look: strings(logoWizard.look), presentation: strings(logoWizard.presentation),
      direction: { traits: stringList(record(logoWizard.direction).traits) }, colors: { ...strings(logoColors), values: stringList(logoColors.values) },
    } : null,
    presetId: text(request.presetId), styleId: text(request.moodId), styleTitle: text(request.moodTitle),
    workspace, conversationId: text(request.conversationId), revision: text(request.revision),
    createdAt: text(job.created_at), startedAt: text(job.started_at), finishedAt: text(job.finished_at),
    status: text(job.status), phase: text(record(metadata.v1_lifecycle).phase), generationId: text(history.data?.id),
    charged: number(job.credits_charged), reserved: number(job.credits_reserved), configuredCredits: number(model.customerCredits),
    requestId: text(metadata.request_id), providerRequestId: text(observation.requestId), latencyMs: number(observation.latencyMs),
    inputTokens: number(usage.input_tokens), outputTokens: number(usage.output_tokens),
    estimatedCostUsd: number(estimate.usd), costSource: text(estimate.source), costRateVersion: text(estimate.rateVersion),
    systemVersion: text(record(provenance.system).version), promptHash: text(provenance.promptHash),
    // Provider messages and arbitrary metadata can contain private URLs or credentials. Return only the code/status.
    providerErrorCode: text(record(observation.error).code), providerErrorStatus: number(record(observation.error).status),
  };
  const audit = await db.from("audit_events").insert({ actor_id: input.actorId, action: "v1.generation_research.viewed",
    target_type: "generation_job", target_id: job.id, request_id: input.requestId,
    metadata: { purpose: "product_research", generationId: result.generationId } });
  if (audit.error) throw new GenerationReviewError(503, "research_audit_unavailable");
  return result;
}

export type GenerationResearch = Awaited<ReturnType<typeof readGenerationResearch>>;
export type GenerationResearchSummary = Awaited<ReturnType<typeof generationResearchSummaries>>[number]["researcher"];
