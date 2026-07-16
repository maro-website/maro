import { NextResponse } from "next/server";
import { callClaudeJSON, hasAiKey } from "@/lib/ai/anthropic";
import { buildEditSystem, buildEditUser } from "@/lib/ai/prompts";
import type { AiEditRequest, AiEditResponse } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  try {
    const result = await callClaudeJSON<AiEditResponse>({
      system: buildEditSystem(body),
      user: buildEditUser(body),
      maxTokens: 16000,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/edit] failed:", err);
    return NextResponse.json({ error: "ai-failed", fallback: true }, { status: 502 });
  }
}
