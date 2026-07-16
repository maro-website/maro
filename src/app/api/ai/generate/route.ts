import { NextResponse } from "next/server";
import { callClaudeJSON, hasAiKey } from "@/lib/ai/anthropic";
import { buildGenerateSystem, buildGenerateUser } from "@/lib/ai/prompts";
import type { AiGenerateRequest, AiGenerateResponse } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 60s is the max on Vercel Hobby. If generation times out there, lower
// ANTHROPIC_EFFORT (e.g. "medium") or upgrade to Pro (up to 300s).
export const maxDuration = 60;

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
  if (!body?.businessName?.trim()) {
    return NextResponse.json({ error: "missing-business" }, { status: 400 });
  }

  try {
    const result = await callClaudeJSON<AiGenerateResponse>({
      system: buildGenerateSystem(body),
      user: buildGenerateUser(body),
      maxTokens: 32000,
    });
    if (!result?.pages?.length) {
      return NextResponse.json({ error: "empty", fallback: true }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/generate] failed:", err);
    return NextResponse.json({ error: "ai-failed", fallback: true }, { status: 502 });
  }
}
