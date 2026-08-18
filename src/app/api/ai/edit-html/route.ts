import { callClaudeText, hasAiKey } from "@/lib/ai/anthropic";
import { resolveWebModel } from "@/lib/ai/webModels";
import { getTool } from "@/lib/tools/registry";
import { buildHtmlEditSystem, buildHtmlEditUser } from "@/lib/ai/prompts";
import { parseHtmlEdit } from "@/lib/ai/htmlParse";
import type { AiEditHtmlRequest } from "@/lib/ai/types";
import {
  getAppSettings,
  logGeneration,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { getIdempotencyKey } from "@/lib/generation/idempotency";
import {
  prepareGeneration,
  completeGeneration,
  failGeneration,
  guardErrorResponse,
} from "@/lib/generation/orchestrator";
import { denyIfProductionWithoutSupabase } from "@/lib/security/protectedRoute";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

export async function POST(req: Request) {
  if (!hasAiKey()) {
    return new Response(JSON.stringify({ error: "no-key", fallback: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const infraDeny = denyIfProductionWithoutSupabase();
  if (infraDeny) return infraDeny;

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonEditHtml);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as AiEditHtmlRequest;
  if (!body?.instruction?.trim() || !body?.page?.html?.trim()) {
    return new Response(JSON.stringify({ error: "missing-input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId: string | null = null;
  let userEmail = "";
  let cost = 0;
  const settings = await getAppSettings();
  const webTool = getTool("website");
  const modelOptionId =
    body.modelOptionId ?? webTool?.settings.find((s) => s.id === "model")?.default;
  const modelOpt = webTool?.settings
    .find((s) => s.id === "model")
    ?.options.find((o) => o.id === modelOptionId);
  if (modelOpt && modelOpt.available === false) {
    return new Response(JSON.stringify({ error: "model-unavailable" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const claudeModel = resolveWebModel(modelOptionId);
  let prep: Awaited<ReturnType<typeof prepareGeneration>> | null = null;

  if (supabaseServerConfigured()) {
    cost = settings.pricing.editCost ?? 2;
    try {
      prep = await prepareGeneration({
        req,
        module: "edit-html",
        cost,
        model: claudeModel,
        idempotencyKey: getIdempotencyKey(req, body.idempotencyKey),
        promptText: body.instruction,
      });
      userId = prep.userId;
      userEmail = prep.userEmail;
    } catch (e) {
      return guardErrorResponse(e);
    }
  }

  const system = buildHtmlEditSystem(body.businessName, body.language);
  const user = buildHtmlEditUser(body.instruction, body.page.html);

  // SSE heartbeats — same as /api/ai/generate; keeps Cloudflare/Railway open on long edits.
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
        const { text } = await callClaudeText({ system, user, model: claudeModel });
        const parsed = parseHtmlEdit(text);
        if (!parsed) {
          let refunded = false;
          if (prep && cost) {
            refunded = await failGeneration({
              jobId: prep.job.id,
              idempotencyKey: prep.idempotencyKey,
              error: "parse-failed",
            });
          }
          send({
            ok: false,
            error: "parse-failed",
            detail: `no HTML parsed (chars=${text.length})`,
            refunded,
            jobId: prep?.job.id,
          });
          return;
        }
        if (userId) {
          await logGeneration({
            user_id: userId,
            user_email: userEmail,
            prompt: body.instruction,
            final_prompt: "(edit-html)",
            website_type: "edit-html",
            speed: "-",
            model: claudeModel,
            credits_spent: cost,
          });
          if (prep) {
            await completeGeneration({
              jobId: prep.job.id,
              userId,
              module: "edit-html",
              cost,
              model: claudeModel,
            });
          }
        }
        send({
          ok: true,
          reply: parsed.reply,
          versionLabel: parsed.versionLabel,
          cost: cost || parsed.cost,
          html: parsed.html,
          jobId: prep?.job.id,
        });
      } catch (err) {
        console.error("[ai/edit-html] failed:", err);
        let refunded = false;
        if (prep && cost) {
          refunded = await failGeneration({
            jobId: prep.job.id,
            idempotencyKey: prep.idempotencyKey,
            error: (err as Error)?.message ?? "ai-failed",
          });
        }
        const e = err as { code?: string; detail?: string; message?: string; status?: number };
        send({
          ok: false,
          error: e?.code || "ai-failed",
          detail: e?.detail || e?.message,
          status: e?.status,
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
