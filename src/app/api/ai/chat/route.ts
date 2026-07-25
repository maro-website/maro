import { NextResponse } from "next/server";
import { CHAT_MODEL, completeChat, hasOpenAiKey, streamChat } from "@/lib/ai/openai";
import { CHAT_HISTORY_LIMIT, type AiChatRequest, type ChatMsg } from "@/lib/ai/chatTypes";
import {
  getAppSettings,
  getProfileCredits,
  getUserFromToken,
  refundCredits,
  spendCredits,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { getTool, visibleSettings, defaultSelections } from "@/lib/tools/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

const DEFAULT_BASE =
  "Je maro Fjalë, një asistent shkrimi dhe planifikimi brenda platformës maro (një AI hub për website, logo dhe imazhe). " +
  "Përgjigju shkurt, konkret dhe me shije, në gjuhën shqipe nëse përdoruesi nuk kërkon ndryshe. " +
  "Ndihmo përdoruesin të mendojë ide, të përmirësojë tekstin dhe të ndërtojë prompte më të mira. " +
  "Kur jep një prompt gati për t'u përdorur, jepe të pastër dhe të drejtpërdrejtë pa shpjegime të tepërta.";

// Build the system prompt: global assistant base + per-tool guidance + a short
// auto-context line derived from the tool registry.
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
  if (!hasOpenAiKey()) {
    return NextResponse.json({ error: "no-key" }, { status: 503 });
  }

  let body: AiChatRequest;
  try {
    body = (await req.json()) as AiChatRequest;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

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

  // ---- Auth + credits (free for maroFort) ----
  let userId: string | null = null;
  let cost = 0;
  if (supabaseServerConfigured()) {
    const user = await getUserFromToken(bearer(req));
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;

    const profile = await getProfileCredits(userId);
    const isFort = profile?.plan === "fort";
    cost = isFort ? 0 : settings.pricing.chatCost ?? 1;
    if (cost > 0) {
      if (!profile || profile.credits < cost) {
        return NextResponse.json(
          { error: "insufficient-credits", needed: cost, have: profile?.credits ?? 0 },
          { status: 402 }
        );
      }
      const balance = await spendCredits(userId, cost);
      if (balance < 0) {
        return NextResponse.json({ error: "insufficient-credits", needed: cost }, { status: 402 });
      }
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sentAny = false;
      try {
        for await (const delta of streamChat({ system, messages })) {
          sentAny = true;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: delta })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (streamErr) {
        console.error("[ai/chat] streaming failed, trying fallback:", streamErr);
        // Fallback: some hosts buffer/break SSE; try a single non-streamed reply.
        if (!sentAny) {
          try {
            const text = await completeChat({ system, messages });
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: text })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              return;
            }
          } catch (fallbackErr) {
            console.error("[ai/chat] fallback failed:", fallbackErr);
          }
        }
        const detail = streamErr instanceof Error ? streamErr.message : String(streamErr);
        if (userId && cost && !sentAny) await refundCredits(userId, cost);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "ai-failed", detail })}\n\n`)
        );
      } finally {
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
