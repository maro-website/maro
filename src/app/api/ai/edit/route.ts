import { NextResponse } from "next/server";
import { AI_MODEL, callClaudeJSON, hasAiKey } from "@/lib/ai/anthropic";
import { buildEditSystem, buildEditUser } from "@/lib/ai/prompts";
import type { AiEditRequest, AiEditResponse } from "@/lib/ai/types";
import {
  getAppSettings,
  getProfileCredits,
  getUserFromToken,
  logGeneration,
  refundCredits,
  spendCredits,
  supabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function POST(req: Request) {
  if (!hasAiKey()) {
    return NextResponse.json({ error: "no-key", fallback: true }, { status: 503 });
  }

  let body: AiEditRequest;
  try {
    body = (await req.json()) as AiEditRequest;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body?.instruction?.trim()) {
    return NextResponse.json({ error: "missing-instruction" }, { status: 400 });
  }

  let userId: string | null = null;
  let userEmail = "";
  let cost = 0;
  const settings = await getAppSettings();

  if (supabaseServerConfigured()) {
    const user = await getUserFromToken(bearer(req));
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
    userEmail = user.email ?? "";
    cost = settings.pricing.editCost ?? 2;

    const profile = await getProfileCredits(userId);
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
    }
    // Report the actual server-side cost so the client stays in sync with the DB.
    return NextResponse.json({ ...result, cost: cost || result.cost });
  } catch (err) {
    console.error("[ai/edit] failed:", err);
    if (userId && cost) await refundCredits(userId, cost);
    return NextResponse.json({ error: "ai-failed", fallback: true }, { status: 502 });
  }
}
