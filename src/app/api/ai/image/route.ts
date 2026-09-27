import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { validateCompiledImagePrompt } from "@/lib/generation/imagePromptValidation";
import { logImageValidation } from "@/lib/generation/imageValidationLog";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
import { generateImages, editImages, hasOpenAiKey } from "@/lib/ai/openai";
import type { ImageProviderObservation } from "@/lib/ai/imageObservation";
import { getUserFromToken, incrementPromptUse, resolveAssetListForClient } from "@/lib/supabase/server";
import { parseV1ImageRequest, resolveV1ImageRequest, v1ImageValidationResponse } from "@/lib/generation/v1ImageRequest";
import { compileTrustedImageRequest, recordCanonicalImageTrace } from "@/lib/generation/v1ImagePrompt";
import { getIdempotencyKey } from "@/lib/generation/idempotency";
import { prepareGeneration, guardErrorResponse, recordCompletedGenerationCosts } from "@/lib/generation/orchestrator";
import { storeV1ImageOutput, persistV1ImageHistory, settleV1ImageJob, failV1ImageJob, optionalImageWork, V1PersistenceError, type V1Failure } from "@/lib/generation/v1ImagePersistence";
import { createImageClientAbortScope } from "@/lib/generation/imageStreamLifecycle";
import { stampJobExecutionTelemetry } from "@/lib/engine/executionTelemetry";
import { denyIfProductionWithoutSupabase } from "@/lib/security/protectedRoute";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const requestId = randomUUID();
  const infraDeny = denyIfProductionWithoutSupabase();
  if (infraDeny) return infraDeny;
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!parsed.ok) {
    const body = await parsed.response.json();
    logImageValidation({ requestId }, new ImageRequestValidationError(body.error, parsed.response.status, "request"));
    return NextResponse.json({ ...body, requestId }, { status: parsed.response.status });
  }
  const raw = parsed.body && typeof parsed.body === "object" ? parsed.body as Record<string, unknown> : {};
  const validation: Parameters<typeof logImageValidation>[0] = {
    requestId, userPromptLength: typeof raw.prompt === "string" ? raw.prompt.length : undefined,
    hasReferences: Array.isArray(raw.attachments) && raw.attachments.length > 0,
  };
  let trusted: Awaited<ReturnType<typeof resolveV1ImageRequest>>;
  let resolved: Awaited<ReturnType<typeof compileTrustedImageRequest>>;
  try {
    const input = parseV1ImageRequest(parsed.body);
    validation.model = input.logicalModel;
    const header = req.headers.get("authorization");
    const owner = await getUserFromToken(header?.startsWith("Bearer ") ? header.slice(7) : header);
    if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    trusted = await resolveV1ImageRequest(input, owner.id);
    validation.model = trusted.snapshot.model.providerModelId;
    resolved = await compileTrustedImageRequest(trusted);
    validation.compiledPromptLength = resolved.compilation.prompt.length;
    validation.hasReferences = resolved.images.length > 0;
    // Validate the exact, immutable provider payload before admission/reservation.
    // No prompt transformations occur between this check and the adapter call.
    validateCompiledImagePrompt(trusted.snapshot.prompt, resolved.compilation.prompt, trusted.snapshot.model.providerModelId);
  } catch (error) {
    logImageValidation(validation, error);
    return v1ImageValidationResponse(error, requestId);
  }
  if (!hasOpenAiKey()) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const snapshot = trusted.snapshot;
  const canonical = resolved.compilation;
  const userId = snapshot.userId;
  const cost = snapshot.model.customerCredits;
  const model = snapshot.model.providerModelId;
  let prep: Awaited<ReturnType<typeof prepareGeneration>>;
  try {
    prep = await prepareGeneration({ req, module: snapshot.registryToolId, cost, model, provider: snapshot.model.provider,
      idempotencyKey: getIdempotencyKey(req, snapshot.idempotencyKey), promptText: snapshot.prompt,
      attachmentCount: snapshot.references.length,
      metadata: { request_id: requestId, v1_durable: true, v1_request: snapshot, canonical_prompt: { version: canonical.provenance.version, hash: canonical.provenance.promptHash,
        configurationHash: canonical.configurationHash, system: canonical.provenance.system,
        layers: canonical.provenance.layers.map(({ id, key, version, hash }) => ({ id, key, version, hash })),
        preset: canonical.provenance.preset, brainUsed: canonical.provenance.brainUsed } },
    });
  } catch (error) { return guardErrorResponse(error); }
  logImageValidation({ ...validation, jobId: prep.job.id });
  const abortScope = createImageClientAbortScope(req);
  let observation: ImageProviderObservation | undefined;
  const onObservation = async (value: ImageProviderObservation) => {
    observation = value;
    await optionalImageWork("provider observation", () => stampJobExecutionTelemetry(prep.job.id, { image_provider: value }));
  };
  let disconnected = false;
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const enqueue = (text: string) => { if (!disconnected) { try { controller.enqueue(enc.encode(text)); } catch { disconnected = true; } } };
      const send = (payload: Record<string, unknown>) => enqueue(`data: ${JSON.stringify(payload)}\n\n`);
      const heartbeat = setInterval(() => enqueue(": ping\n\n"), 15000);
      let stage: V1Failure = "execution_trace_unavailable";
      let generationId: string | undefined;
      let storageRef: string | undefined;
      let persisted = false;
      try {
        // Required private trace before any provider spend. Never put its prompt on an owner-readable job/history row.
        await recordCanonicalImageTrace(prep.job.id, snapshot, canonical);
        await optionalImageWork("execution telemetry", () => stampJobExecutionTelemetry(prep.job.id, { effective_execution: "canonical_v1", compiler: "maro_v1_canonical",
          provider: "openai", model, module: snapshot.registryToolId, internal_canary: false, provider_request_count: 1,
          operation: canonical.operation, system_prompt_version: canonical.provenance.system.version,
          system_prompt_status: "live", brain_used: canonical.provenance.brainUsed, fort_enabled: false }));
        stage = "provider_failed";
        send({ event: "generation_started", jobId: prep.job.id, requestId });
        abortScope.markProviderAttemptStarted();
        const options = { model, prompt: canonical.prompt, size: canonical.size, quality: canonical.quality, n: canonical.n,
          abortSignal: abortScope.abortSignal, onObservation };
        const b64s = canonical.operation === "edit" ? await editImages({ ...options, images: resolved.images }) : await generateImages(options);
        stage = "storage_failed";
        storageRef = await storeV1ImageOutput(userId, prep.job.id, b64s, observation);
        stage = "history_failed";
        generationId = await persistV1ImageHistory(prep.job.id);
        persisted = true;
        const settlement = await settleV1ImageJob(prep.job.id);
        if (settlement !== "finalized" && settlement !== "already_finalized") {
          send({ ok: false, error: "settlement_pending", jobId: prep.job.id, generationId, storageRefs: [storageRef], model: snapshot.logicalModel, refunded: false, recoverable: true });
          return;
        }
        // Everything below is auxiliary; no error here may release a committed charge.
        await optionalImageWork("cost accounting", () => recordCompletedGenerationCosts({ jobId: prep.job.id, userId, module: snapshot.registryToolId, cost, model,
          provider: snapshot.model.provider, imageObservation: observation, generationId, imageCount: 1 }));
        await optionalImageWork("success telemetry", () => stampJobExecutionTelemetry(prep.job.id, { success: true, generation_id: generationId }));
        if (snapshot.presetId) await optionalImageWork("preset use", () => incrementPromptUse(snapshot.presetId!));
        let displayUrls: string[] = [];
        await optionalImageWork("signed result URLs", async () => { displayUrls = await resolveAssetListForClient([storageRef!]); });
        send({ ok: true, images: displayUrls, generationId, storageRefs: [storageRef], creditsSpent: cost, jobId: prep.job.id, model: snapshot.logicalModel });
      } catch (error) {
        const code = error instanceof V1PersistenceError ? error.code : stage;
        const outcome = persisted ? "settlement_pending" : await failV1ImageJob(prep.job.id, code);
        const pending = outcome !== "released";
        await optionalImageWork("failure telemetry", () => stampJobExecutionTelemetry(prep.job.id, { success: false, error_code: code,
          failure_stage: code === "provider_failed" || code === "provider_output_invalid" ? "provider" : "persistence" }));
        send({ ok: false, error: pending ? "reconciliation_pending" : code, refunded: outcome === "released", jobId: prep.job.id,
          generationId, recoverable: pending, ...(generationId && storageRef ? { storageRefs: [storageRef] } : {}) });
      } finally {
        clearInterval(heartbeat);
        if (!disconnected) { try { controller.close(); } catch { /* Client left; durable completion is unaffected. */ } }
      }
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Request-Id": requestId } });
}
