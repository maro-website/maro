import { NextResponse } from "next/server";
import { CHAT_MODEL, completeChat, hasChatKey, streamChat } from "@/lib/ai/anthropic";
import { CHAT_HISTORY_LIMIT, type AiChatRequest, type ChatMsg } from "@/lib/ai/chatTypes";
import {
  getAppSettings,
  getUserFromToken,
  hasFort,
  logGeneration,
  resolveWorkspaceId,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { getTool, visibleSettings, defaultSelections } from "@/lib/tools/registry";
import { getIdempotencyKey } from "@/lib/generation/idempotency";
import {
  prepareGeneration,
  settlePreparedGeneration,
  ensurePreparedGenerationTerminal,
  guardErrorResponse,
  bearer,
  type GenerationFinancialState,
} from "@/lib/generation/orchestrator";
import { denyIfProductionWithoutSupabase } from "@/lib/security/protectedRoute";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_BASE =
  "Je maro Fjalë, një asistent shkrimi dhe planifikimi brenda platformës maro (një AI hub për website, logo dhe imazhe). " +
  "Përgjigju shkurt, konkret dhe me shije, në gjuhën shqipe nëse përdoruesi nuk kërkon ndryshe. " +
  "Ndihmo përdoruesin të mendojë ide, të përmirësojë tekstin dhe të ndërtojë prompte më të mira. " +
  "Kur jep një prompt gati për t'u përdorur, jepe të pastër dhe të drejtpërdrejtë pa shpjegime të tepërta.";

function buildSystem(toolPrompts: Record<string, string>, toolId?: string): string {
  const parts: string[] = [];
  parts.push((toolPrompts["assistant.base"] || DEFAULT_BASE).trim());

  const tool = toolId ? getTool(toolId) : undefined;
  if (tool) {
    const perTool = toolPrompts[`assistant.${tool.id}`];
    if (perTool && perTool.trim()) parts.push(perTool.trim());

    const settingLabels = visibleSettings(tool, defaultSelections(tool))
      .map((s) => s.label)
      .join(", ");
    parts.push(
      `KONTEKST: Përdoruesi është te "${tool.name}" (${tool.description}). ` +
        (settingLabels ? `Opsionet e disponueshme: ${settingLabels}. ` : "") +
        `Përshtat këshillat dhe promptet posaçërisht për këtë mjet.`
    );
  } else {
    parts.push(
      "KONTEKST: Përdoruesi është në modin e përgjithshëm të shkrimit/planifikimit (jo brenda një mjeti specifik)."
    );
  }
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  if (!hasChatKey()) {
    return NextResponse.json({ error: "no-key" }, { status: 503 });
  }

  const infraDeny = denyIfProductionWithoutSupabase();
  if (infraDeny) return infraDeny;

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAiChat);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as AiChatRequest;

  const messages: ChatMsg[] = Array.isArray(body?.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-CHAT_HISTORY_LIMIT)
    : [];
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "missing-message" }, { status: 400 });
  }

  const settings = await getAppSettings();
  const system = buildSystem(settings.tool_prompts ?? {}, body.toolId);

  let userId: string | null = null;
  let userEmail = "";
  let workspaceId: string | null = null;
  let cost = 0;
  let prep: Awaited<ReturnType<typeof prepareGeneration>> | null = null;

  if (supabaseServerConfigured()) {
    const user = await getUserFromToken(bearer(req));
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    cost = (await hasFort(user.id)) ? 0 : settings.pricing.chatCost ?? 1;

    try {
      prep = await prepareGeneration({
        req,
        module: "chat",
        cost,
        model: CHAT_MODEL,
        idempotencyKey: getIdempotencyKey(req, body.idempotencyKey),
        promptText: messages[messages.length - 1]?.content ?? "",
      });
      userId = prep.userId;
      userEmail = prep.userEmail;
      workspaceId = await resolveWorkspaceId(prep.userId, body.workspaceId);
    } catch (e) {
      return guardErrorResponse(e);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sentAny = false;
      const financial: GenerationFinancialState = { terminal: "pending" };

      const settleSuccess = async () => {
        if (!userId || !prep) return;
        const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";
        await logGeneration({
          user_id: userId,
          user_email: userEmail,
          prompt: lastUser.slice(0, 500),
          final_prompt: system.slice(0, 500),
          model: CHAT_MODEL,
          credits_spent: cost,
          tool_id: body.toolId ?? "chat",
          kind: "chat",
          workspace_id: workspaceId ?? undefined,
        });
        await settlePreparedGeneration({
          financial,
          prep,
          userId,
          module: "chat",
          cost,
          model: CHAT_MODEL,
          outcome: "success",
        });
      };

      const settleFailure = async (error: string) => {
        if (!prep || !userId) return;
        await settlePreparedGeneration({
          financial,
          prep,
          userId,
          module: "chat",
          cost,
          model: CHAT_MODEL,
          outcome: "failure",
          error,
        });
      };

      try {
        for await (const delta of streamChat({ system, messages })) {
          sentAny = true;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: delta })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        await settleSuccess();
      } catch (streamErr) {
        console.error("[ai/chat] streaming failed, trying fallback:", streamErr);
        if (!sentAny) {
          try {
            const text = await completeChat({ system, messages });
            if (text) {
              sentAny = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: text })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              await settleSuccess();
              return;
            }
          } catch (fallbackErr) {
            console.error("[ai/chat] fallback failed:", fallbackErr);
          }
        }
        const detail = streamErr instanceof Error ? streamErr.message : String(streamErr);
        await settleFailure(detail);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "ai-failed", detail })}\n\n`)
        );
      } finally {
        if (prep && userId) {
          await ensurePreparedGenerationTerminal({
            financial,
            prep,
            userId,
            module: "chat",
            cost,
            model: CHAT_MODEL,
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Chat-Model": CHAT_MODEL,
      "X-Credits-Spent": String(cost),
    },
  });
}
