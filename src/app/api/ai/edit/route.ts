import { NextResponse } from "next/server";
import { AI_MODEL, callClaudeJSON, hasAiKey } from "@/lib/ai/anthropic";
import { buildEditSystem, buildEditUser } from "@/lib/ai/prompts";
import type { AiEditRequest, AiEditResponse } from "@/lib/ai/types";
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
    return NextResponse.json({ error: "no-key", fallback: true }, { status: 503 });
  }

  const infraDeny = denyIfProductionWithoutSupabase();
  if (infraDeny) return infraDeny;

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAiEdit);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as AiEditRequest;
  if (!body?.instruction?.trim()) {
    return NextResponse.json({ error: "missing-instruction" }, { status: 400 });
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
        module: "edit",
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
    const result = await callClaudeJSON<AiEditResponse>({
      system: buildEditSystem(body),
      user: buildEditUser(body),
      maxTokens: 16000,
    });
    if (userId) {
      await logGeneration({
        user_id: userId,
        user_email: userEmail,
        prompt: body.instruction,
        final_prompt: "(edit)",
        website_type: "edit",
        speed: "-",
        model: AI_MODEL,
        credits_spent: cost,
      });
      if (prep) {
        await completeGeneration({
          jobId: prep.job.id,
          userId,
          module: "edit",
          cost,
          model: AI_MODEL,
        });
      }
    }
    return NextResponse.json({ ...result, cost: cost || result.cost, jobId: prep?.job.id });
  } catch (err) {
    console.error("[ai/edit] failed:", err);
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
      { error: e?.code || "ai-failed", detail: e?.detail || e?.message, fallback: true, refunded },
      { status: 502 }
    );
  }
}
