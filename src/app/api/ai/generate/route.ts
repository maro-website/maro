import { NextResponse } from "next/server";
import { AI_MODEL, callClaudeText, hasAiKey } from "@/lib/ai/anthropic";
import {
  buildHtmlGenerateSystem,
  buildHtmlGenerateUser,
} from "@/lib/ai/prompts";
import { parseHtmlPages } from "@/lib/ai/htmlParse";
import type { AiGenerateRequest } from "@/lib/ai/types";
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
import { getTool, toolSelectionCost } from "@/lib/tools/registry";
import { buildFortBrief } from "@/lib/fort/briefBuilder";
import { compileBrief } from "@/lib/fort/compile";

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
  const selections = body.selections;
  const settings = await getAppSettings();

  // Per-option prompt fragments (Lloji/MaroSpeed etc.) appended to the master.
  const webTool = getTool("website");
  let extraPrompt = "";
  if (webTool && selections) {
    const frags: string[] = [];
    for (const s of webTool.settings) {
      const optId = selections[s.id] ?? s.default;
      const frag = settings.tool_prompts?.[`website.${s.id}.${optId}`];
      if (frag && frag.trim()) frags.push(frag.trim());
    }
    extraPrompt = frags.join("\n\n");
  }
  // Speed -> Claude effort. New ids: kadale/normal/fast; legacy: slow/fast/2x.
  const effortBySpeed: Record<string, string> = {
    kadale: "xhigh",
    normal: "high",
    fast: "medium",
    slow: "xhigh",
    "2x": "medium",
  };

  // ---- Auth + credits (required when Supabase is configured) ----
  let userId: string | null = null;
  let userEmail = "";
  let cost = 0;
  let effort: string | undefined;
  // maroFort is entitlement-gated. In dev (no Supabase) allow it for testing.
  let entitled = !supabaseServerConfigured();

  if (supabaseServerConfigured()) {
    const user = await getUserFromToken(bearer(req));
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = user.id;
    userEmail = user.email ?? "";

    cost =
      webTool && selections
        ? toolSelectionCost(webTool, selections, settings.pricing.options)
        : creditCost(settings.pricing, kind, speed);
    effort = selections?.speed
      ? effortBySpeed[selections.speed]
      : settings.pricing.speed?.[speed]?.effort;

    const profile = await getProfileCredits(userId);
    entitled = profile?.plan === "fort";
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

  // maroFort: build the structured expert brief for the web module, bridge
  // mapsTo fields into the request, and inject brief + layers into the prompts.
  let fortBriefBlock = "";
  let fortLayerText = "";
  let fortLog: Record<string, unknown> | undefined;
  if (entitled && body.fort?.enabled) {
    const brief = buildFortBrief({
      module: "web",
      config: settings.fort_config,
      values: body.fort.values ?? {},
    });
    // Bridge mapped fields (primaryColor, language, ...) into the request.
    if (typeof brief.mapped.primaryColor === "string") body.primaryColor = brief.mapped.primaryColor;
    if (typeof brief.mapped.language === "string") body.language = brief.mapped.language;
    const compiled = compileBrief(brief.briefText);
    fortBriefBlock = compiled.text.trim();
    fortLayerText = brief.appliedLayers
      .map((l) => l.content.trim())
      .filter(Boolean)
      .join("\n\n");
    fortLog = {
      enabled: true,
      values: body.fort.values ?? {},
      appliedLayerIds: brief.appliedLayerIds,
      score: brief.score,
    };
  }

  const masterPlusOptions = [settings.master_prompt, extraPrompt, fortLayerText]
    .filter(Boolean)
    .join("\n\n");
  const system = buildHtmlGenerateSystem(body, masterPlusOptions);
  let user = buildHtmlGenerateUser(body);
  if (fortBriefBlock) {
    user = `${user}\n\n## BRIEF EKSPERT (maroFort)\n${fortBriefBlock}`;
  }

  try {
    const { text } = await callClaudeText({ system, user, effort });
    const pages = parseHtmlPages(text);
    if (!pages.length) {
      if (userId && cost) await refundCredits(userId, cost);
      return NextResponse.json(
        { error: "empty", detail: `no HTML pages parsed (chars=${text.length})`, fallback: true },
        { status: 502 }
      );
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
        selections: selections && Object.keys(selections).length ? selections : undefined,
        fort: fortLog,
      });
    }
    return NextResponse.json({ pages, creditsSpent: cost });
  } catch (err) {
    console.error("[ai/generate] failed:", err);
    if (userId && cost) await refundCredits(userId, cost);
    const e = err as { code?: string; detail?: string; message?: string; status?: number };
    return NextResponse.json(
      {
        error: e?.code || "ai-failed",
        detail: e?.detail || e?.message || undefined,
        status: e?.status,
        fallback: true,
      },
      { status: 502 }
    );
  }
}
