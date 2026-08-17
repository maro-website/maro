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
  completeGeneration,
  failGeneration,
  guardErrorResponse,
} from "@/lib/generation/orchestrator";
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
  type ImageShadowSchedulePayload,
} from "@/lib/engine/imageShadowRuntime";
import {
  createImageReferenceTracker,
  toSafeAttachmentMeta,
} from "@/lib/engine/imageReferenceTracker";
import { IMAGE_PROVIDER_REF_LIMIT, buildImageTextInstruction } from "@/lib/engine/imageCompile";
import { maybeScheduleImageShadow } from "@/lib/engine/productionShadow";
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

      try {
        const b64s = refs.length
          ? await editImages({
              prompt: finalPrompt,
              images: refs,
              size,
              quality: body.quality,
              n: body.n,
            })
          : await generateImages({
              prompt: finalPrompt,
              size,
              quality: body.quality,
              n,
            });

        if (!b64s.length) {
          let refunded = false;
          if (prep && cost) {
            refunded = await failGeneration({
              jobId: prep.job.id,
              idempotencyKey: prep.idempotencyKey,
              error: "empty",
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
            final_prompt: finalPrompt,
            model: IMAGE_MODEL,
            credits_spent: cost,
            tool_id: tool.id,
            kind: "image",
            output_urls: urls.filter((u) => !u.startsWith("data:")),
            selections: Object.keys(selections).length ? selections : undefined,
            fort: fortLog,
            workspace_id: workspaceId ?? undefined,
          });

          const providerRefsUsed = refs.length
            ? Math.min(refs.length, IMAGE_PROVIDER_REF_LIMIT)
            : 0;
          const referenceOutcome = refTracker.finalize(providerRefsUsed);
          const legacyImageProvider = buildRuntimeImageLegacyProvider({
            finalPrompt,
            model: IMAGE_MODEL,
            size: (size ?? "1024x1024") as ImageSize,
            quality: body.quality,
            n,
            referenceOutcome,
          });

          const shadowPayload: ImageShadowSchedulePayload = {
            registryToolId: tool.id,
            finalPrompt,
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
          };

          void maybeScheduleImageShadow(shadowPayload);
          if (prep) {
            await completeGeneration({
              jobId: prep.job.id,
              userId,
              module: tool.id,
              cost,
              model: IMAGE_MODEL,
              imageCount: b64s.length,
            });
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
          errorCode === "timeout" ? "timeout" : errorCode === "empty" ? "empty" : "ai-failed";
        if (prep && cost) {
          refunded = await failGeneration({
            jobId: prep.job.id,
            idempotencyKey: prep.idempotencyKey,
            error: errorCode,
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
