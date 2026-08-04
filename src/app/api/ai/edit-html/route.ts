import { NextResponse } from "next/server";
import { AI_MODEL, callClaudeText, hasAiKey } from "@/lib/ai/anthropic";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

export async function POST(req: Request) {
  if (!hasAiKey()) {
    return NextResponse.json({ error: "no-key", fallback: true }, { status: 503 });
  }

  let body: AiEditHtmlRequest;
  try {
    body = (await req.json()) as AiEditHtmlRequest;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body?.instruction?.trim() || !body?.page?.html?.trim()) {
    return NextResponse.json({ error: "missing-input" }, { status: 400 });
  }

  let userId: string | null = null;
  let userEmail = "";
  let cost = 0;
  const settings = await getAppSettings();
  let prep: Awaited<ReturnType<typeof prepareGeneration>> | null = null;

  if (supabaseServerConfigured()) {
    cost = settings.pricing.editCost ?? 2;
    try {
      prep = await prepareGeneration({
        req,
        module: "edit-html",
        cost,
        model: AI_MODEL,
        idempotencyKey: getIdempotencyKey(req, body.idempotencyKey),
        promptText: body.instruction,
      });
      userId = prep.userId;
      userEmail = prep.userEmail;
    } catch (e) {
      return guardErrorResponse(e);
    }
  }

  try {
    const { text } = await callClaudeText({
      system: buildHtmlEditSystem(body.businessName, body.language),
      user: buildHtmlEditUser(body.instruction, body.page.html),
    });
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
      return NextResponse.json(
        { error: "parse-failed", detail: `no HTML parsed (chars=${text.length})`, refunded },
        { status: 502 }
      );
    }
    if (userId) {
      await logGeneration({
        user_id: userId,
        user_email: userEmail,
        prompt: body.instruction,
        final_prompt: "(edit-html)",
        website_type: "edit-html",
        speed: "-",
        model: AI_MODEL,
        credits_spent: cost,
      });
      if (prep) {
        await completeGeneration({
          jobId: prep.job.id,
          userId,
          module: "edit-html",
          cost,
          model: AI_MODEL,
        });
      }
    }
    return NextResponse.json({
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
    return NextResponse.json(
      { error: e?.code || "ai-failed", detail: e?.detail || e?.message, status: e?.status, refunded },
      { status: 502 }
    );
  }
}
