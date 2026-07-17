import { NextResponse } from "next/server";
import { AI_MODEL, callClaudeText, hasAiKey } from "@/lib/ai/anthropic";
import { buildHtmlEditSystem, buildHtmlEditUser } from "@/lib/ai/prompts";
import { parseHtmlEdit } from "@/lib/ai/htmlParse";
import type { AiEditHtmlRequest } from "@/lib/ai/types";
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
    const { text } = await callClaudeText({
      system: buildHtmlEditSystem(body.businessName, body.language),
      user: buildHtmlEditUser(body.instruction, body.page.html),
    });
    const parsed = parseHtmlEdit(text);
    if (!parsed) {
      if (userId && cost) await refundCredits(userId, cost);
      return NextResponse.json(
        { error: "parse-failed", detail: `no HTML parsed (chars=${text.length})` },
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
    }
    return NextResponse.json({
      reply: parsed.reply,
      versionLabel: parsed.versionLabel,
      cost: cost || parsed.cost,
      html: parsed.html,
    });
  } catch (err) {
    console.error("[ai/edit-html] failed:", err);
    if (userId && cost) await refundCredits(userId, cost);
    const e = err as { code?: string; detail?: string; message?: string };
    return NextResponse.json(
      { error: e?.code || "ai-failed", detail: e?.detail || e?.message },
      { status: 502 }
    );
  }
}
