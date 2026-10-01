import { NextResponse } from "next/server";
import { callClaudeText, hasAiKey } from "@/lib/ai/anthropic";
import { resolveWebModel } from "@/lib/ai/webModels";
import { wrapPresetRecommendation } from "@/lib/presets/model";
import {
  buildHtmlGenerateSystem,
  buildHtmlGenerateUser,
} from "@/lib/ai/prompts";
import { parseHtmlPages } from "@/lib/ai/htmlParse";
import type { AiGenerateRequest } from "@/lib/ai/types";
import { validateWebReferenceImages } from "@/lib/ai/webReferences";
import {
  getAppSettings,
  getUserFromToken,
  getProfileCredits,
  getPromptTemplate,
  incrementPromptUse,
  logGeneration,
  resolveAssetListForClient,
  resolveWorkspaceId,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { getIdempotencyKey } from "@/lib/generation/idempotency";
import {
  prepareGeneration,
  failGeneration,
  guardErrorResponse,
  settlePreparedGeneration,
  type GenerationFinancialState,
} from "@/lib/generation/orchestrator";
import { creditCost } from "@/lib/supabase/types";
import type { SpeedKey, WebsiteKind } from "@/lib/supabase/types";
import { getTool, toolSelectionCost } from "@/lib/tools/registry";
import { buildFortBrief } from "@/lib/fort/briefBuilder";
import { compileBrief } from "@/lib/fort/compile";
import { maybeScheduleWebShadow } from "@/lib/engine/productionShadow";
import { resolveWebExecutionContext } from "@/lib/engine/webExecution";
import { runWebEngineInternalGeneration } from "@/lib/engine/webEngineRun";
import {
  buildInitialExecutionTelemetry,
  stampJobExecutionTelemetry,
} from "@/lib/engine/executionTelemetry";
import { denyIfProductionWithoutSupabase } from "@/lib/security/protectedRoute";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { issueThumbnailCaptureToken } from "@/lib/generation/thumbnailToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function POST(req: Request) {
  if (!hasAiKey()) {
    return NextResponse.json({ error: "no-key", fallback: true }, { status: 503 });
  }

  const infraDeny = denyIfProductionWithoutSupabase();
  if (infraDeny) return infraDeny;

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonWebGenerate);
  if (!parsed.ok) return parsed.response;

  let body: AiGenerateRequest;
  try {
    body = parsed.body as AiGenerateRequest;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body?.businessName?.trim() && !body?.userPrompt?.trim()) {
    return NextResponse.json({ error: "missing-business" }, { status: 400 });
  }
  const references = validateWebReferenceImages(body.referenceImages, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    production: process.env.NODE_ENV === "production",
  });
  if (!references.ok) {
    return NextResponse.json({ error: references.error }, { status: 400 });
  }
  body.referenceImages = references.images.length ? references.images : undefined;
  if (body.referenceImages?.length && supabaseServerConfigured()) {
    const referenceOwner = await getUserFromToken(bearer(req));
    if (!referenceOwner) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const ownedReferences = validateWebReferenceImages(body.referenceImages, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      production: process.env.NODE_ENV === "production",
      expectedUserId: referenceOwner.id,
    });
    if (!ownedReferences.ok) {
      return NextResponse.json({ error: ownedReferences.error }, { status: 400 });
    }
    body.referenceImages = ownedReferences.images;
    body.referenceImages = await resolveAssetListForClient(body.referenceImages);
  }

  const kind = (body.websiteType ?? "business") as WebsiteKind;
  const speed = (body.speed ?? "fast") as SpeedKey;
  const selections = body.selections;
  const settings = await getAppSettings();
  const webTool = getTool("website");
  const modelOptionId = selections?.model ?? webTool?.settings.find((s) => s.id === "model")?.default;
  const modelOpt = webTool?.settings
    .find((s) => s.id === "model")
    ?.options.find((o) => o.id === modelOptionId);
  if (modelOpt && modelOpt.available === false) {
    return NextResponse.json({ error: "model-unavailable" }, { status: 400 });
  }
  const claudeModel = resolveWebModel(modelOptionId);

  // Per-option prompt fragments (Lloji/MaroSpeed etc.) appended to the master.
  let extraPrompt = "";
  if (webTool && selections) {
    const frags: string[] = [];
    for (const s of webTool.settings) {
      const optId = selections[s.id] ?? s.default;
      const frag = settings.tool_prompts?.[`website.${s.id}.${optId}`];
      if (frag && frag.trim()) frags.push(frag.trim());
    }
    extraPrompt = frags.join("\n\n");
  }

  // maro Prompts: prepend the hidden curated template (fetched server-side).
  let maroPromptId: string | undefined;
  let presetPromptText: string | undefined;
  if (body.maroPrompt?.id) {
    const tpl = await getPromptTemplate(body.maroPrompt.id, "website");
    if (tpl?.full_prompt?.trim()) {
      presetPromptText = wrapPresetRecommendation(tpl.full_prompt);
      extraPrompt = extraPrompt ? `${presetPromptText}\n\n${extraPrompt}` : presetPromptText;
      maroPromptId = body.maroPrompt.id;
    }
  }
  // Speed -> Claude effort. New ids: kadale/normal/fast; legacy: slow/fast/2x.
  const effortBySpeed: Record<string, string> = {
    kadale: "xhigh",
    normal: "high",
    fast: "medium",
    slow: "xhigh",
    "2x": "medium",
  };

  // ---- Auth + credits (reserve before AI via job ledger) ----
  let userId: string | null = null;
  let userEmail = "";
  let workspaceId: string | null = null;
  let cost = 0;
  let effort: string | undefined;
  let entitled = false;
  let prep: Awaited<ReturnType<typeof prepareGeneration>> | null = null;

  if (supabaseServerConfigured()) {
    cost =
      webTool && selections
        ? toolSelectionCost(webTool, selections, settings.pricing.options)
        : creditCost(settings.pricing, kind, speed);
    effort = selections?.speed
      ? effortBySpeed[selections.speed]
      : settings.pricing.speed?.[speed]?.effort;

    try {
      prep = await prepareGeneration({
        req,
        module: "web",
        cost,
        model: claudeModel,
        idempotencyKey: getIdempotencyKey(req, body.idempotencyKey),
        promptText: body.userPrompt || body.goal || "",
        attachmentCount: body.referenceImages?.length ?? 0,
        metadata: {
          selections,
          kind,
          speed,
          referenceImageCount: body.referenceImages?.length ?? 0,
        },
      });
      userId = prep.userId;
      userEmail = prep.userEmail;
      workspaceId = await resolveWorkspaceId(prep.userId, body.workspaceId);
      entitled = prep.isFort;
    } catch (e) {
      return guardErrorResponse(e);
    }
  }

  // maroFort: build the structured expert brief for the web module, bridge
  // mapsTo fields into the request, and inject brief + layers into the prompts.
  let fortBriefBlock = "";
  let fortLayerText = "";
  let fortLog: Record<string, unknown> | undefined;
  if (entitled && body.fort?.enabled) {
    const brief = buildFortBrief({
      module: "web",
      config: settings.fort_config,
      values: body.fort.values ?? {},
    });
    // Bridge mapped fields (primaryColor, language, ...) into the request.
    if (typeof brief.mapped.primaryColor === "string") body.primaryColor = brief.mapped.primaryColor;
    if (typeof brief.mapped.language === "string") body.language = brief.mapped.language;
    const compiled = compileBrief(brief.briefText);
    fortBriefBlock = compiled.text.trim();
    fortLayerText = brief.appliedLayers
      .map((l) => l.content.trim())
      .filter(Boolean)
      .join("\n\n");
    fortLog = {
      enabled: true,
      values: body.fort.values ?? {},
      appliedLayerIds: brief.appliedLayerIds,
      score: brief.score,
    };
  }

  const execution = await resolveWebExecutionContext({ userId });
  if (prep) {
    await stampJobExecutionTelemetry(
      prep.job.id,
      buildInitialExecutionTelemetry({
        configuredPipeline: execution.configuredPipeline,
        effectiveExecution: execution.label,
        internalCanary: execution.internalCanary,
        model: claudeModel,
        compiler: execution.mode === "engine_internal" ? "maro_engine_v1" : "legacy",
      })
    );
  }

  const masterPlusOptions = [settings.master_prompt, extraPrompt, fortLayerText]
    .filter(Boolean)
    .join("\n\n");

  let system = "";
  let user = "";
  if (execution.mode === "legacy") {
    system = buildHtmlGenerateSystem(body, masterPlusOptions);
    user = buildHtmlGenerateUser(body);
    if (fortBriefBlock) {
      user = `${user}\n\n## BRIEF EKSPERT (maroFort)\n${fortBriefBlock}`;
    }
  }

  // Stream heartbeats while Claude generates so Cloudflare (100s proxy timeout)
  // and Railway edge keep the connection open until the final HTML is ready.
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
      const routeStarted = Date.now();

      try {
        send({ stage: 0 });
        send({ stage: 1 });

        if (execution.mode === "engine_internal" && userId) {
          const engineResult = await runWebEngineInternalGeneration({
            body,
            userId,
            workspaceId,
            selections: selections ?? undefined,
            fort: body.fort,
            claudeModel,
            effort,
            presetId: maroPromptId,
            presetPrompt: presetPromptText,
          });

          if (!engineResult.ok) {
            let refunded = false;
            if (prep && cost) {
              refunded = Boolean(
                await failGeneration({
                  jobId: prep.job.id,
                  idempotencyKey: prep.idempotencyKey,
                  error: engineResult.code ?? engineResult.error,
                })
              );
              financial.terminal = "failed";
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
              fallback: true,
              refunded,
              jobId: prep?.job.id,
            });
            return;
          }

          send({ stage: 4 });
          send({ stage: 5 });

          let generationId: string | null = null;
          try {
            generationId = await logGeneration({
              user_id: userId,
              user_email: userEmail,
              prompt: body.userPrompt || body.goal || "",
              final_prompt: engineResult.finalPrompt,
              website_type: kind,
              speed,
              model: claudeModel,
              credits_spent: cost,
              selections: selections && Object.keys(selections).length ? selections : undefined,
              fort: fortLog,
              workspace_id: workspaceId ?? undefined,
            });
          } catch (persistErr) {
            console.error("[ai/generate] engine persistence failed:", persistErr);
            let refunded = false;
            if (prep && cost) {
              refunded = Boolean(
                await failGeneration({
                  jobId: prep.job.id,
                  idempotencyKey: prep.idempotencyKey,
                  error: "persistence_failed",
                })
              );
              financial.terminal = "failed";
            }
            if (prep) {
              await stampJobExecutionTelemetry(prep.job.id, {
                provider_request_count: engineResult.providerRequestCount,
                provider_latency_ms: engineResult.providerLatencyMs,
                failure_stage: "persistence",
                error_code: "persistence_failed",
                success: false,
                total_latency_ms: Date.now() - routeStarted,
              });
            }
            send({
              ok: false,
              error: "persistence_failed",
              fallback: true,
              refunded,
              jobId: prep?.job.id,
            });
            return;
          }

          if (prep) {
            await settlePreparedGeneration({
              financial,
              prep,
              userId,
              module: "web",
              cost,
              model: claudeModel,
              outcome: "success",
            });
            await stampJobExecutionTelemetry(prep.job.id, {
              provider_request_count: engineResult.providerRequestCount,
              provider_latency_ms: engineResult.providerLatencyMs,
              total_latency_ms: engineResult.totalLatencyMs,
              success: true,
              generation_id: generationId,
              system_prompt_version: engineResult.brief.systemPromptVersion?.versionLabel ?? null,
              system_prompt_status: engineResult.brief.systemPromptVersion?.status ?? null,
            });
          }
          if (maroPromptId) await incrementPromptUse(maroPromptId);
          const thumbnailToken = generationId && userId && workspaceId && engineResult.pages[0]?.html
            ? issueThumbnailCaptureToken({
                generationId,
                userId,
                workspaceId,
                html: engineResult.pages[0].html,
              })
            : undefined;
          send({
            ok: true,
            pages: engineResult.pages,
            creditsSpent: cost,
            generationId: generationId ?? undefined,
            thumbnailToken,
            jobId: prep?.job.id,
          });
          return;
        }

        const { text } = await callClaudeText({
          system,
          user,
          imageUrls: body.referenceImages,
          effort,
          model: claudeModel,
        });
        send({ stage: 4 });
        const pages = parseHtmlPages(text);
        send({ stage: 5 });
        if (!pages.length) {
          let refunded = false;
          if (prep && cost) {
            refunded = await failGeneration({
              jobId: prep.job.id,
              idempotencyKey: prep.idempotencyKey,
              error: "empty",
            });
            financial.terminal = "failed";
          }
          if (prep) {
            await stampJobExecutionTelemetry(prep.job.id, {
              provider_request_count: 1,
              failure_stage: "parse",
              error_code: "empty",
              success: false,
              total_latency_ms: Date.now() - routeStarted,
            });
          }
          send({
            ok: false,
            error: "empty",
            detail: `no HTML pages parsed (chars=${text.length})`,
            fallback: true,
            refunded,
            jobId: prep?.job.id,
          });
          return;
        }
        let generationId: string | null = null;
        if (userId) {
          generationId = await logGeneration({
            user_id: userId,
            user_email: userEmail,
            prompt: body.userPrompt || body.goal || "",
            final_prompt: `${system}\n\n---\n\n${user}`,
            website_type: kind,
            speed,
            model: claudeModel,
            credits_spent: cost,
            selections: selections && Object.keys(selections).length ? selections : undefined,
            fort: fortLog,
            workspace_id: workspaceId ?? undefined,
          });
          if (execution.scheduleShadowAfterSuccess) {
            void maybeScheduleWebShadow({
              body,
              masterPlusOptions,
              fortBriefBlock,
              legacySystem: system,
              legacyUser: user,
              model: claudeModel,
              userId,
              workspaceId,
              selections: selections ?? undefined,
              fort: body.fort,
              estimatedCredits: cost,
              generationId,
              jobId: prep?.job.id,
              providerRequestCount: 1,
            });
          }
          if (prep) {
            await settlePreparedGeneration({
              financial,
              prep,
              userId,
              module: "web",
              cost,
              model: claudeModel,
              outcome: "success",
            });
            await stampJobExecutionTelemetry(prep.job.id, {
              provider_request_count: 1,
              success: true,
              generation_id: generationId,
              total_latency_ms: Date.now() - routeStarted,
            });
          }
        }
        if (maroPromptId) await incrementPromptUse(maroPromptId);
        const thumbnailToken = generationId && userId && workspaceId && pages[0]?.html
          ? issueThumbnailCaptureToken({ generationId, userId, workspaceId, html: pages[0].html })
          : undefined;
        send({
          ok: true,
          pages,
          creditsSpent: cost,
          generationId: generationId ?? undefined,
          thumbnailToken,
          jobId: prep?.job.id,
        });
      } catch (err) {
        console.error("[ai/generate] failed:", err);
        let refunded = false;
        if (prep && cost) {
          refunded = await failGeneration({
            jobId: prep.job.id,
            idempotencyKey: prep.idempotencyKey,
            error: (err as Error)?.message ?? "ai-failed",
          });
          financial.terminal = "failed";
        }
        if (prep) {
          await stampJobExecutionTelemetry(prep.job.id, {
            provider_request_count: execution.mode === "engine_internal" ? 0 : 1,
            failure_stage: execution.mode === "engine_internal" ? "provider" : "provider",
            error_code: (err as Error)?.message ?? "ai-failed",
            success: false,
            total_latency_ms: Date.now() - routeStarted,
          });
        }
        const e = err as { code?: string; detail?: string; message?: string; status?: number };
        send({
          ok: false,
          error: e?.code || "ai-failed",
          detail: e?.detail || e?.message || undefined,
          status: e?.status,
          fallback: true,
          refunded,
        });
      } finally {
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
