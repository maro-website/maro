import { NextResponse } from "next/server";
import { IMAGE_MODEL, generateImages, editImages, hasOpenAiKey, OpenAIImageError } from "@/lib/ai/openai";
import type { AiImageRequest } from "@/lib/ai/imageTypes";
import {
  getAppSettings,
  getPromptTemplate,
  getWorkspaceBrand,
  getWorkspaceBrainProfile,
  getWorkspaceSources,
  incrementPromptUse,
  logGeneration,
  resolveWorkspaceId,
  supabaseServerConfigured,
  uploadGeneratedImage,
} from "@/lib/supabase/server";
import { buildWorkspaceBrandBrief } from "@/lib/workspaces/brand";
import {
  buildBrainBrief,
  buildMatchedSourcesBrief,
  matchSourcesByPrompt,
} from "@/lib/workspaces/brainProfile";
import { getIdempotencyKey } from "@/lib/generation/idempotency";
import {
  prepareGeneration,
  guardErrorResponse,
  settlePreparedGeneration,
  ensurePreparedGenerationTerminal,
  type GenerationFinancialState,
} from "@/lib/generation/orchestrator";
import { createImageClientAbortScope } from "@/lib/generation/imageStreamLifecycle";
import { MODULE_LIMITS } from "@/lib/generation/limits";
import {
  composeToolPrompt,
  findOption,
  toolSelectionCost,
  getTool,
} from "@/lib/tools/registry";
import { toolToFortModule } from "@/lib/fort/types";
import { buildFortBrief } from "@/lib/fort/briefBuilder";
import { compileBrief } from "@/lib/fort/compile";
import {
  buildRuntimeImageLegacyProvider,
} from "@/lib/engine/imageShadowRuntime";
import {
  createImageReferenceTracker,
  toSafeAttachmentMeta,
} from "@/lib/engine/imageReferenceTracker";
import { IMAGE_PROVIDER_REF_LIMIT, buildImageTextInstruction } from "@/lib/engine/imageCompile";
import { maybeScheduleImageShadow } from "@/lib/engine/productionShadow";
import { resolveImageExecutionContext } from "@/lib/engine/imageExecution";
import { runImageEngineInternalGeneration } from "@/lib/engine/imageEngineRun";
import {
  buildInitialExecutionTelemetry,
  stampJobExecutionTelemetry,
} from "@/lib/engine/executionTelemetry";
import type { ImageSize } from "@/lib/tools/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!hasOpenAiKey()) {
    return NextResponse.json({ error: "no-key" }, { status: 503 });
  }

  let body: AiImageRequest;
  try {
    body = (await req.json()) as AiImageRequest;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const tool = getTool(body?.toolId ?? "");
  if (!tool || tool.kind !== "image") {
    return NextResponse.json({ error: "bad-tool" }, { status: 400 });
  }
  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: "missing-prompt" }, { status: 400 });
  }

  const settings = await getAppSettings();
  const selections = body.selections ?? {};
  let finalPrompt = composeToolPrompt(tool, selections, settings.tool_prompts ?? {}, body.prompt);

  let maroPromptId: string | undefined;
  let presetPromptText: string | undefined;
  if (body.maroPrompt?.id) {
    const tpl = await getPromptTemplate(body.maroPrompt.id);
    if (tpl?.full_prompt?.trim()) {
      presetPromptText = tpl.full_prompt.trim();
      finalPrompt = `${presetPromptText}\n\n${finalPrompt}`;
      maroPromptId = body.maroPrompt.id;
    }
  }

  const hasRefs = (body.attachments ?? []).some(
    (a) => typeof a === "string" && a.startsWith("data:image/")
  );
  if (hasRefs) {
    finalPrompt = `${finalPrompt}\n\nIMPORTANT: Use the provided reference image(s) as the main subject/product. Keep the product's real shape, colors, label and proportions faithful; integrate it naturally and prominently into the composition.`;
  }

  const textSetting = tool.settings.find((s) => s.id === "text");
  const textOn = textSetting
    ? (selections.text ?? textSetting.default) === "on"
    : false;
  let fontSelection: string | undefined;
  let textOffDeferred = false;
  if (textSetting) {
    if (textOn) {
      const fontSetting = tool.settings.find((s) => s.id === "font");
      const fontOpt = fontSetting
        ? findOption(fontSetting, selections.font ?? fontSetting.default)
        : undefined;
      fontSelection = fontOpt?.id ?? selections.font;
      const fontNote = fontOpt ? ` Use a ${fontOpt.label} typography style.` : "";
      finalPrompt = `${finalPrompt}\n\nText: render any requested headline/text cleanly and legibly, spelling every word correctly.${fontNote}`;
    } else if (hasRefs) {
      const instruction = buildImageTextInstruction("maro_imazh", selections, {
        hasReferences: true,
      });
      if (instruction) finalPrompt = `${finalPrompt}\n\n${instruction}`;
    } else {
      textOffDeferred = true;
    }
  }

  let size = body.size;
  for (const s of tool.settings) {
    const opt = findOption(s, selections[s.id] ?? s.default);
    if (opt?.size) size = opt.size;
  }

  const n = Math.min(body.n ?? 1, MODULE_LIMITS.image.maxImagesPerRequest);

  let userId: string | null = null;
  let userEmail = "";
  let workspaceId: string | null = null;
  let cost = 0;
  let entitled = !supabaseServerConfigured();
  let prep: Awaited<ReturnType<typeof prepareGeneration>> | null = null;

  if (supabaseServerConfigured()) {
    cost = toolSelectionCost(tool, selections, settings.pricing.options);
    try {
      prep = await prepareGeneration({
        req,
        module: tool.id,
        cost,
        model: IMAGE_MODEL,
        idempotencyKey: getIdempotencyKey(req, body.idempotencyKey),
        promptText: body.prompt,
        attachmentCount: (body.attachments ?? []).length,
      });
      userId = prep.userId;
      userEmail = prep.userEmail;
      workspaceId = await resolveWorkspaceId(prep.userId, body.workspaceId);
      entitled = prep.isFort;
    } catch (e) {
      return guardErrorResponse(e);
    }
  }

  const fortModule = toolToFortModule(tool.id);
  let fortLog: Record<string, unknown> | undefined;
  let fortLayerText: string | undefined;
  let fortExpertBrief: string | undefined;
  if (entitled && body.fort?.enabled && fortModule) {
    const brief = buildFortBrief({
      module: fortModule,
      config: settings.fort_config,
      values: body.fort.values ?? {},
    });
    const compiled = compileBrief(brief.briefText);
    fortLayerText = brief.appliedLayers
      .map((l) => l.content.trim())
      .filter(Boolean)
      .join("\n\n");
    fortExpertBrief = compiled.text.trim();
    const parts: string[] = [];
    if (fortLayerText) parts.push(fortLayerText);
    parts.push(finalPrompt);
    if (fortExpertBrief) parts.push(`## BRIEF EKSPERT (maroFort)\n${fortExpertBrief}`);
    finalPrompt = parts.join("\n\n");
    fortLog = {
      enabled: true,
      values: body.fort.values ?? {},
      appliedLayerIds: brief.appliedLayerIds,
      score: brief.score,
    };
  }

  const refTracker = createImageReferenceTracker();
  const fetchedUrls: string[] = [];

  for (const attachment of body.attachments ?? []) {
    if (typeof attachment !== "string") continue;
    refTracker.recordAttempt("user", attachment);
  }

  const refs = (body.attachments ?? []).filter(
    (a) => typeof a === "string" && a.startsWith("data:image/")
  );

  async function pushRefFromUrl(
    url: string,
    sourceType: "workspace_brain" | "matched_source" = "workspace_brain"
  ) {
    const u = url.trim();
    if (!u) return;
    if (u.startsWith("data:image/")) {
      refTracker.recordAttempt(sourceType, u, true);
      if (!refs.includes(u)) refs.push(u);
      return;
    }
    if (!u.startsWith("http")) return;
    refTracker.recordAttempt(sourceType, u, false);
    try {
      const res = await fetch(u);
      if (!res.ok) return;
      const mime = res.headers.get("content-type") || "image/png";
      const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      const dataUrl = `data:${mime};base64,${b64}`;
      refTracker.markUsable(u);
      fetchedUrls.push(u);
      refs.push(dataUrl);
    } catch {
      /* skip failed reference fetch — legacy falls back when none remain */
    }
  }

  let brainBrief: string | undefined;
  let workspaceBrandBrief: string | undefined;
  let matchedSourcesBrief: string | undefined;
  let brainLogoUrl: string | undefined;
  let matchedSourceUrls: string[] = [];
  let brandOnly = false;

  if (body.useWorkspaceBrand && userId && workspaceId) {
    const brain = await getWorkspaceBrainProfile(userId, workspaceId);
    const brand = await getWorkspaceBrand(userId, workspaceId);
    if (brain) {
      brainBrief = buildBrainBrief(brain);
      finalPrompt = `${finalPrompt}\n\n${brainBrief}`;
      const sources = await getWorkspaceSources(userId, workspaceId);
      const matched = matchSourcesByPrompt(body.prompt, sources);
      if (matched.length) {
        matchedSourcesBrief = buildMatchedSourcesBrief(matched);
        matchedSourceUrls = matched.map((s) => s.fileUrl).filter(Boolean);
        finalPrompt = `${finalPrompt}\n\n${matchedSourcesBrief}`;
        for (const s of matched) await pushRefFromUrl(s.fileUrl, "matched_source");
      }
      if (brain.brand.logoUrl) {
        brainLogoUrl = brain.brand.logoUrl;
        await pushRefFromUrl(brain.brand.logoUrl, "workspace_brain");
      }
    } else if (brand) {
      workspaceBrandBrief = buildWorkspaceBrandBrief(brand);
      brandOnly = true;
      finalPrompt = `${finalPrompt}\n\n${workspaceBrandBrief}`;
      if (brand.logoUrl) {
        brainLogoUrl = brand.logoUrl;
        await pushRefFromUrl(brand.logoUrl, "workspace_brain");
      }
    }
  }

  if (textSetting && textOffDeferred) {
    const instruction = buildImageTextInstruction("maro_imazh", selections, {
      hasReferences: refs.length > 0,
    });
    if (instruction) finalPrompt = `${finalPrompt}\n\n${instruction}`;
  }

  const execution = await resolveImageExecutionContext({
    userId,
    registryToolId: tool.id,
  });

  const inferredOperation = refs.length ? ("edit" as const) : ("generate" as const);

  if (prep) {
    await stampJobExecutionTelemetry(
      prep.job.id,
      buildInitialExecutionTelemetry({
        configuredPipeline: execution.configuredPipeline,
        effectiveExecution: execution.label,
        internalCanary: execution.internalCanary,
        model: IMAGE_MODEL,
        module: tool.id,
        provider: "openai",
        compiler: execution.mode === "engine_internal" ? "maro_engine_v1" : "legacy",
        operation: execution.mode === "engine_internal" ? inferredOperation : null,
      })
    );
  }

  const abortScope = createImageClientAbortScope(req);

  // Stream heartbeats while OpenAI generates so Cloudflare (~100s proxy timeout)
  // keeps the connection open until images are ready (maro Imazh + maro Logo).
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const heartbeat = setInterval(() => {
        controller.enqueue(enc.encode(": ping\n\n"));
      }, 15000);

      const financial: GenerationFinancialState = { terminal: "pending" };

      try {
        const routeStarted = Date.now();
        let b64s: string[] = [];
        let persistedFinalPrompt = finalPrompt;

        if (execution.mode === "engine_internal" && userId) {
          const engineResult = await runImageEngineInternalGeneration({
            engineToolId: execution.engineToolId,
            userId,
            workspaceId,
            userPrompt: body.prompt,
            selections,
            model: IMAGE_MODEL,
            fort: body.fort,
            useBrain: Boolean(body.useWorkspaceBrand && workspaceId),
            presetId: maroPromptId,
            presetPrompt: presetPromptText,
            workspaceBrandBrief,
            brainLogoUrl,
            matchedSourceUrls,
            fetchedUrls,
            attachments: body.attachments,
            resolvedRefBytes: refs,
            quality: body.quality,
            n,
            size: (size ?? "1024x1024") as ImageSize,
            abortSignal: abortScope.abortSignal,
            onProviderAttemptStart: async (info) => {
              abortScope.markProviderAttemptStarted();
              if (prep) {
                await stampJobExecutionTelemetry(prep.job.id, {
                  provider_request_count: info.providerRequestCount,
                  operation: info.operation,
                });
              }
            },
          });

          if (!engineResult.ok) {
            let refunded = false;
            if (prep && cost && userId) {
              await settlePreparedGeneration({
                financial,
                prep,
                userId,
                module: tool.id,
                cost,
                model: IMAGE_MODEL,
                outcome: "failure",
                error: engineResult.code ?? engineResult.error,
              });
              refunded = financial.terminal === "failed";
            }
            if (prep) {
              await stampJobExecutionTelemetry(prep.job.id, {
                provider_request_count: engineResult.providerRequestCount,
                failure_stage: engineResult.stage,
                error_code: engineResult.code ?? engineResult.error,
                success: false,
                total_latency_ms: Date.now() - routeStarted,
                system_prompt_version: engineResult.brief?.systemPromptVersion?.versionLabel ?? null,
                system_prompt_status: engineResult.brief?.systemPromptVersion?.status ?? null,
              });
            }
            send({
              ok: false,
              error: engineResult.code ?? engineResult.error,
              detail: engineResult.error,
              refunded,
              jobId: prep?.job.id,
            });
            return;
          }

          b64s = engineResult.b64s;
          persistedFinalPrompt = engineResult.finalPrompt;

          if (prep) {
            await stampJobExecutionTelemetry(prep.job.id, {
              provider_request_count: engineResult.providerRequestCount,
              provider_latency_ms: engineResult.providerLatencyMs,
              operation: engineResult.providerRequest.operation,
              image_size: engineResult.providerRequest.size ?? null,
              image_quality: engineResult.providerRequest.quality ?? body.quality ?? null,
              image_n: engineResult.providerRequest.n ?? n,
              reference_count_received: engineResult.providerRequest.referenceCountReceived ?? null,
              reference_count_usable: engineResult.providerRequest.referenceCountUsable ?? null,
              reference_count_used: engineResult.providerRequest.referenceCountUsed ?? null,
              reference_source_types: (engineResult.providerRequest.references ?? [])
                .map((r) => r.sourceType)
                .filter(Boolean),
              text_mode: textOn ? "on" : "off",
              fort_enabled: Boolean(body.fort?.enabled),
              brain_used: Boolean(brainBrief || workspaceBrandBrief),
              preset_present: Boolean(maroPromptId),
              system_prompt_version: engineResult.brief.systemPromptVersion?.versionLabel ?? null,
              system_prompt_status: engineResult.brief.systemPromptVersion?.status ?? null,
            });
          }
        } else {
          if (prep) {
            abortScope.markProviderAttemptStarted();
            await stampJobExecutionTelemetry(prep.job.id, {
              provider_request_count: 1,
              operation: inferredOperation,
            });
          }
          b64s = refs.length
            ? await editImages({
                prompt: finalPrompt,
                images: refs,
                size,
                quality: body.quality,
                n: body.n,
                abortSignal: abortScope.abortSignal,
              })
            : await generateImages({
                prompt: finalPrompt,
                size,
                quality: body.quality,
                n,
                abortSignal: abortScope.abortSignal,
              });
        }

        if (!b64s.length) {
          let refunded = false;
          if (prep && cost && userId) {
            await settlePreparedGeneration({
              financial,
              prep,
              userId,
              module: tool.id,
              cost,
              model: IMAGE_MODEL,
              outcome: "failure",
              error: "empty",
            });
            refunded = financial.terminal === "failed";
          }
          if (prep && execution.mode === "engine_internal") {
            await stampJobExecutionTelemetry(prep.job.id, {
              failure_stage: "provider",
              error_code: "empty",
              success: false,
              total_latency_ms: Date.now() - routeStarted,
            });
          }
          send({ ok: false, error: "empty", refunded, jobId: prep?.job.id });
          return;
        }

        let urls: string[] = [];
        if (userId && supabaseServerConfigured()) {
          urls = (await Promise.all(b64s.map((b) => uploadGeneratedImage(userId!, b)))).filter(
            (u): u is string => Boolean(u)
          );
        }
        if (!urls.length) {
          urls = b64s.map((b) => `data:image/png;base64,${b}`);
        }

        if (userId) {
          const generationId = await logGeneration({
            user_id: userId,
            user_email: userEmail,
            prompt: body.prompt,
            final_prompt: persistedFinalPrompt,
            model: IMAGE_MODEL,
            credits_spent: cost,
            tool_id: tool.id,
            kind: "image",
            output_urls: urls.filter((u) => !u.startsWith("data:")),
            selections: Object.keys(selections).length ? selections : undefined,
            fort: fortLog,
            workspace_id: workspaceId ?? undefined,
          });

          if (execution.scheduleShadowAfterSuccess && execution.mode !== "engine_internal") {
            const providerRefsUsed = refs.length
              ? Math.min(refs.length, IMAGE_PROVIDER_REF_LIMIT)
              : 0;
            const referenceOutcome = refTracker.finalize(providerRefsUsed);
            const legacyImageProvider = buildRuntimeImageLegacyProvider({
              finalPrompt: persistedFinalPrompt,
              model: IMAGE_MODEL,
              size: (size ?? "1024x1024") as ImageSize,
              quality: body.quality,
              n,
              referenceOutcome,
            });

            void maybeScheduleImageShadow({
              registryToolId: tool.id,
              finalPrompt: persistedFinalPrompt,
              model: IMAGE_MODEL,
              userId,
              workspaceId,
              userPrompt: body.prompt,
              selections,
              fort: body.fort,
              attachments: toSafeAttachmentMeta(body.attachments),
              useBrain: Boolean(body.useWorkspaceBrand && workspaceId),
              brandOnly,
              estimatedCredits: cost,
              generationId: generationId ?? undefined,
              jobId: prep?.job.id,
              presetId: maroPromptId,
              presetPrompt: presetPromptText,
              quality: body.quality,
              n,
              size: (size ?? "1024x1024") as ImageSize,
              toolPrompts: settings.tool_prompts ?? {},
              fortLayerText,
              fortExpertBrief,
              brainBrief,
              matchedSourcesBrief,
              workspaceBrandBrief,
              brainLogoUrl,
              matchedSourceUrls,
              fetchedUrls,
              legacyImageProvider,
              textMode: textOn ? "on" : "off",
              font: fontSelection,
            });
          }

          if (prep) {
            await settlePreparedGeneration({
              financial,
              prep,
              userId,
              module: tool.id,
              cost,
              model: IMAGE_MODEL,
              outcome: "success",
              generationId,
              imageCount: b64s.length,
            });
            if (execution.mode === "engine_internal") {
              await stampJobExecutionTelemetry(prep.job.id, {
                success: true,
                generation_id: generationId,
                total_latency_ms: Date.now() - routeStarted,
              });
            }
          }
        }

        if (maroPromptId) await incrementPromptUse(maroPromptId);

        send({
          ok: true,
          images: urls,
          creditsSpent: cost,
          jobId: prep?.job.id,
        });
      } catch (err) {
        console.error("[ai/image] failed:", err);
        let refunded = false;
        const errorCode =
          err instanceof OpenAIImageError ? err.code : (err as Error)?.message ?? "ai-failed";
        const clientError =
          errorCode === "timeout"
            ? "timeout"
            : errorCode === "empty"
              ? "empty"
              : errorCode === "client_disconnect"
                ? "ai-failed"
                : "ai-failed";
        if (prep && cost && userId) {
          await settlePreparedGeneration({
            financial,
            prep,
            userId,
            module: tool.id,
            cost,
            model: IMAGE_MODEL,
            outcome: "failure",
            error: errorCode,
          });
          refunded = financial.terminal === "failed";
        }
        if (prep && execution.mode === "engine_internal") {
          await stampJobExecutionTelemetry(prep.job.id, {
            failure_stage: "provider",
            error_code: errorCode,
            success: false,
          });
        }
        send({
          ok: false,
          error: clientError,
          detail:
            err instanceof OpenAIImageError
              ? err.detail || err.code
              : (err as Error)?.message,
          refunded,
          jobId: prep?.job.id,
        });
      } finally {
        if (prep && userId) {
          await ensurePreparedGenerationTerminal({
            financial,
            prep,
            userId,
            module: tool.id,
            cost,
            model: IMAGE_MODEL,
            incompleteError: abortScope.clientDisconnected
              ? "client_disconnect"
              : "stream_incomplete",
          });
        }
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
