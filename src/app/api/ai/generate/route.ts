import { NextResponse } from "next/server";
import { AI_MODEL, callClaudeJSON, hasAiKey } from "@/lib/ai/anthropic";
import {
  buildComposedGenerateSystem,
  buildComposedGenerateUser,
} from "@/lib/ai/prompts";
import type { AiGenerateRequest, AiGenerateResponse } from "@/lib/ai/types";
import {
  getAppSettings,
  getProfileCredits,
  getUserFromToken,
  logGeneration,
  refundCredits,
  spendCredits,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { creditCost } from "@/lib/supabase/types";
import type { SpeedKey, WebsiteKind } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Opus 4.8 needs ~80-90s for a full site. Vercel Hobby allows up to 300s with
// Fluid Compute (default on new projects), so this fits comfortably.
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

  let body: AiGenerateRequest;
  try {
    body = (await req.json()) as AiGenerateRequest;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body?.businessName?.trim() && !body?.userPrompt?.trim()) {
    return NextResponse.json({ error: "missing-business" }, { status: 400 });
  }

  const kind = (body.websiteType ?? "business") as WebsiteKind;
  const speed = (body.speed ?? "fast") as SpeedKey;

  // ---- Auth + credits (required when Supabase is configured) ----
  let userId: string | null = null;
  let userEmail = "";
  let cost = 0;
  let effort: string | undefined;
  const settings = await getAppSettings();

  if (supabaseServerConfigured()) {
    const user = await getUserFromToken(bearer(req));
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = user.id;
    userEmail = user.email ?? "";

    cost = creditCost(settings.pricing, kind, speed);
    effort = settings.pricing.speed?.[speed]?.effort;

    const profile = await getProfileCredits(userId);
    if (!profile || profile.credits < cost) {
      return NextResponse.json(
        { error: "insufficient-credits", needed: cost, have: profile?.credits ?? 0 },
        { status: 402 }
      );
    }
    // Deduct atomically BEFORE calling Claude.
    const balance = await spendCredits(userId, cost);
    if (balance < 0) {
      return NextResponse.json({ error: "insufficient-credits", needed: cost }, { status: 402 });
    }
  }

  const system = buildComposedGenerateSystem(body, settings.master_prompt);
  const user = buildComposedGenerateUser(body);

  try {
    const result = await callClaudeJSON<AiGenerateResponse>({
      system,
      user,
      maxTokens: 32000,
      effort,
    });
    if (!result?.pages?.length) {
      if (userId && cost) await refundCredits(userId, cost);
      return NextResponse.json({ error: "empty", fallback: true }, { status: 502 });
    }
    if (userId) {
      await logGeneration({
        user_id: userId,
        user_email: userEmail,
        prompt: body.userPrompt || body.goal || "",
        final_prompt: `${system}\n\n---\n\n${user}`,
        website_type: kind,
        speed,
        model: AI_MODEL,
        credits_spent: cost,
      });
    }
    return NextResponse.json({ ...result, creditsSpent: cost });
  } catch (err) {
    console.error("[ai/generate] failed:", err);
    if (userId && cost) await refundCredits(userId, cost);
    return NextResponse.json({ error: "ai-failed", fallback: true }, { status: 502 });
  }
}
