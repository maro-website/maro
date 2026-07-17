import { NextResponse } from "next/server";
import { IMAGE_MODEL, generateImages, hasOpenAiKey } from "@/lib/ai/openai";
import type { AiImageRequest } from "@/lib/ai/imageTypes";
import {
  getAppSettings,
  getProfileCredits,
  getUserFromToken,
  logGeneration,
  refundCredits,
  spendCredits,
  supabaseServerConfigured,
  uploadGeneratedImage,
} from "@/lib/supabase/server";
import { imageToolCost } from "@/lib/supabase/types";
import { getTool } from "@/lib/tools/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function POST(req: Request) {
  if (!hasOpenAiKey()) {
    return NextResponse.json({ error: "no-key" }, { status: 503 });
  }

  let body: AiImageRequest;
  try {
    body = (await req.json()) as AiImageRequest;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const tool = getTool(body?.toolId ?? "");
  if (!tool || tool.kind !== "image") {
    return NextResponse.json({ error: "bad-tool" }, { status: 400 });
  }
  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: "missing-prompt" }, { status: 400 });
  }

  const settings = await getAppSettings();
  // Admin-set prompt wins; otherwise fall back to the tool's built-in prompt.
  const masterPrompt = settings.tool_prompts?.[tool.id]?.trim() || tool.defaultPrompt || "";
  const finalPrompt = `${masterPrompt ? masterPrompt + "\n\n" : ""}${body.prompt.trim()}`;

  let userId: string | null = null;
  let userEmail = "";
  let cost = 0;

  if (supabaseServerConfigured()) {
    const user = await getUserFromToken(bearer(req));
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
    userEmail = user.email ?? "";
    cost = imageToolCost(settings.pricing, tool.id, tool.defaultCost);

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
    const b64s = await generateImages({
      prompt: finalPrompt,
      size: body.size,
      quality: body.quality,
      n: body.n,
    });
    if (!b64s.length) {
      if (userId && cost) await refundCredits(userId, cost);
      return NextResponse.json({ error: "empty" }, { status: 502 });
    }

    // Persist images to Supabase Storage (public URLs) so they survive.
    let urls: string[] = [];
    if (userId && supabaseServerConfigured()) {
      urls = (await Promise.all(b64s.map((b) => uploadGeneratedImage(userId!, b)))).filter(
        (u): u is string => Boolean(u)
      );
    }
    // Fallback to inline data URLs if storage failed / not configured.
    if (!urls.length) {
      urls = b64s.map((b) => `data:image/png;base64,${b}`);
    }

    if (userId) {
      await logGeneration({
        user_id: userId,
        user_email: userEmail,
        prompt: body.prompt,
        final_prompt: finalPrompt,
        model: IMAGE_MODEL,
        credits_spent: cost,
        tool_id: tool.id,
        kind: "image",
        output_urls: urls.filter((u) => !u.startsWith("data:")),
      });
    }

    return NextResponse.json({ images: urls, creditsSpent: cost });
  } catch (err) {
    console.error("[ai/image] failed:", err);
    if (userId && cost) await refundCredits(userId, cost);
    return NextResponse.json({ error: "ai-failed" }, { status: 502 });
  }
}
