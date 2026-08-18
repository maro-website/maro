import { NextResponse } from "next/server";
import {
  hasElevenKey,
  textToSpeech,
  generateMusic,
  generateSoundEffect,
  speechToSpeech,
  isolateAudio,
  speechToText,
} from "@/lib/ai/elevenlabs";
import type { AiAudioRequest } from "@/lib/ai/audioTypes";
import {
  getAppSettings,
  logGeneration,
  resolveWorkspaceId,
  supabaseServerConfigured,
  uploadGeneratedAudio,
  resolveStoredAssetUrl,
} from "@/lib/supabase/server";
import { getIdempotencyKey } from "@/lib/generation/idempotency";
import {
  prepareGeneration,
  completeGeneration,
  failGeneration,
  guardErrorResponse,
} from "@/lib/generation/orchestrator";
import {
  composeToolPrompt,
  findOption,
  getTool,
  toolSelectionCost,
} from "@/lib/tools/registry";
import { denyIfProductionWithoutSupabase } from "@/lib/security/protectedRoute";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function POST(req: Request) {
  if (!hasElevenKey()) {
    return NextResponse.json({ error: "no-key" }, { status: 503 });
  }

  const infraDeny = denyIfProductionWithoutSupabase();
  if (infraDeny) return infraDeny;

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAiAudio);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as AiAudioRequest;

  const tool = getTool(body?.toolId ?? "");
  if (!tool || tool.kind !== "audio") {
    return NextResponse.json({ error: "bad-tool" }, { status: 400 });
  }

  const selections = body.selections ?? {};
  const mode = body.mode || selections.mode || "tts";
  const modeOpt = findOption(tool.settings[0], mode);
  if (!modeOpt) {
    return NextResponse.json({ error: "bad-mode" }, { status: 400 });
  }

  const needsAudio = Boolean(modeOpt.inputAudio);
  const needsPrompt = !modeOpt.noPrompt;
  const hasAudio =
    typeof body.audio === "string" && body.audio.startsWith("data:audio/");

  if (needsAudio && !hasAudio) {
    return NextResponse.json({ error: "missing-audio" }, { status: 400 });
  }
  if (needsPrompt && !body.prompt?.trim()) {
    return NextResponse.json({ error: "missing-prompt" }, { status: 400 });
  }

  const settings = await getAppSettings();
  // Compose the final prompt (base + selected fragments + user text) for the
  // text-driven modes. Audio-only modes ignore this.
  const finalPrompt = needsPrompt
    ? composeToolPrompt(tool, selections, settings.tool_prompts ?? {}, body.prompt ?? "")
    : `[${modeOpt.label}]`;

  // Resolve audio length (music / SFX) from the selected length option.
  const lengthOpt = findOption(
    tool.settings.find((s) => s.id === "length") ?? tool.settings[0],
    selections.length ?? "15s"
  );
  const seconds = lengthOpt?.seconds ?? 15;

  const voice = selections.voice ?? "female";
  const model = selections.model ?? "eleven-v3";

  let userId: string | null = null;
  let userEmail = "";
  let workspaceId: string | null = null;
  let cost = 0;
  let prep: Awaited<ReturnType<typeof prepareGeneration>> | null = null;

  if (supabaseServerConfigured()) {
    cost = toolSelectionCost(tool, selections, settings.pricing.options);
    try {
      prep = await prepareGeneration({
        req,
        module: "zo",
        cost,
        model,
        idempotencyKey: getIdempotencyKey(req, body.idempotencyKey),
        promptText: body.prompt ?? "",
        attachmentCount: hasAudio ? 1 : 0,
      });
      userId = prep.userId;
      userEmail = prep.userEmail;
      workspaceId = await resolveWorkspaceId(prep.userId, body.workspaceId);
    } catch (e) {
      return guardErrorResponse(e);
    }
  }

  const finishOk = async () => {
    if (userId && prep) {
      await completeGeneration({
        jobId: prep.job.id,
        userId,
        module: "zo",
        cost,
        model,
      });
    }
  };

  const finishFail = async (error: string) => {
    if (prep && cost) {
      return failGeneration({
        jobId: prep.job.id,
        idempotencyKey: prep.idempotencyKey,
        error,
      });
    }
    return false;
  };

  try {
    // Speech-to-text returns text; every other mode returns base64 mp3.
    if (mode === "stt") {
      const text = await speechToText({ audio: body.audio! });
      if (userId) {
        await logGeneration({
          user_id: userId,
          user_email: userEmail,
          prompt: "[Transkriptim]",
          final_prompt: text.slice(0, 2000),
          model: "scribe_v1",
          credits_spent: cost,
          tool_id: tool.id,
          kind: "audio",
          selections: Object.keys(selections).length ? selections : undefined,
          workspace_id: workspaceId ?? undefined,
        });
        await finishOk();
      }
      return NextResponse.json({ text, creditsSpent: cost, jobId: prep?.job.id });
    }

    let b64: string;
    switch (mode) {
      case "tts":
        b64 = await textToSpeech({ text: body.prompt!, voice, model });
        break;
      case "music":
        b64 = await generateMusic({ prompt: body.prompt!, lengthMs: seconds * 1000 });
        break;
      case "sfx":
        b64 = await generateSoundEffect({ text: body.prompt!, durationSeconds: seconds });
        break;
      case "sts":
        b64 = await speechToSpeech({ audio: body.audio!, voice });
        break;
      case "isolate":
        b64 = await isolateAudio({ audio: body.audio! });
        break;
      default:
        await finishFail("bad-mode");
        return NextResponse.json({ error: "bad-mode" }, { status: 400 });
    }

    if (!b64) {
      await finishFail("empty");
      return NextResponse.json({ error: "empty" }, { status: 502 });
    }

    let storedAudio = "";
    if (userId && supabaseServerConfigured()) {
      storedAudio = (await uploadGeneratedAudio(userId, b64)) ?? "";
    }
    let audioUrl = storedAudio ? await resolveStoredAssetUrl(storedAudio) : "";
    if (!audioUrl) {
      audioUrl = `data:audio/mpeg;base64,${b64}`;
    }

    if (userId) {
      await logGeneration({
        user_id: userId,
        user_email: userEmail,
        prompt: needsPrompt ? body.prompt ?? "" : `[${modeOpt.label}]`,
        final_prompt: finalPrompt,
        model: model,
        credits_spent: cost,
        tool_id: tool.id,
        kind: "audio",
        output_urls: storedAudio ? [storedAudio] : [],
        selections: Object.keys(selections).length ? selections : undefined,
        workspace_id: workspaceId ?? undefined,
      });
      await finishOk();
    }

    return NextResponse.json({ audioUrl, creditsSpent: cost, jobId: prep?.job.id });
  } catch (err) {
    console.error("[ai/audio] failed:", err);
    await finishFail((err as Error)?.message ?? "ai-failed");
    return NextResponse.json({ error: "ai-failed" }, { status: 502 });
  }
}
