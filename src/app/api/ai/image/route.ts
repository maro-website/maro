import { NextResponse } from "next/server";
import { IMAGE_MODEL, generateImages, editImages, hasOpenAiKey } from "@/lib/ai/openai";
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
import {
  composeToolPrompt,
  findOption,
  toolSelectionCost,
  getTool,
} from "@/lib/tools/registry";
import { toolToFortModule } from "@/lib/fort/types";
import { buildFortBrief } from "@/lib/fort/briefBuilder";
import { compileBrief } from "@/lib/fort/compile";

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
  // Compose the final prompt: base + each selected option's fragment + user text.
  const selections = body.selections ?? {};
  let finalPrompt = composeToolPrompt(tool, selections, settings.tool_prompts ?? {}, body.prompt);

  // If the user attached reference images, tell the model to actually use them.
  const hasRefs = (body.attachments ?? []).some(
    (a) => typeof a === "string" && a.startsWith("data:image/")
  );
  if (hasRefs) {
    finalPrompt = `${finalPrompt}\n\nIMPORTANT: Use the provided reference image(s) as the main subject/product. Keep the product's real shape, colors, label and proportions faithful; integrate it naturally and prominently into the composition.`;
  }

  // maro Imazh: honour the Text on/off switch and the selected font style.
  const textSetting = tool.settings.find((s) => s.id === "text");
  if (textSetting) {
    const textOn = (selections.text ?? textSetting.default) === "on";
    if (textOn) {
      const fontSetting = tool.settings.find((s) => s.id === "font");
      const fontOpt = fontSetting
        ? findOption(fontSetting, selections.font ?? fontSetting.default)
        : undefined;
      const fontNote = fontOpt ? ` Use a ${fontOpt.label} typography style.` : "";
      finalPrompt = `${finalPrompt}\n\nText: render any requested headline/text cleanly and legibly, spelling every word correctly.${fontNote}`;
    } else {
      finalPrompt = `${finalPrompt}\n\nDo not include any text, letters, words, numbers or watermarks in the image.`;
    }
  }

  // Derive the requested image size from the selected format option, if any.
  let size = body.size;
  for (const s of tool.settings) {
    const opt = findOption(s, selections[s.id] ?? s.default);
    if (opt?.size) size = opt.size;
  }

  let userId: string | null = null;
  let userEmail = "";
  let cost = 0;
  // maroFort is entitlement-gated. In dev (no Supabase) we allow it for testing.
  let entitled = !supabaseServerConfigured();

  if (supabaseServerConfigured()) {
    const user = await getUserFromToken(bearer(req));
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
    userEmail = user.email ?? "";
    cost = toolSelectionCost(tool, selections, settings.pricing.options);

    const profile = await getProfileCredits(userId);
    entitled = profile?.plan === "fort";
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

  // maroFort: augment the prompt with the structured expert brief + relevant
  // prompt layers. Only when the user is entitled and the toggle was on.
  const fortModule = toolToFortModule(tool.id);
  let fortLog: Record<string, unknown> | undefined;
  if (entitled && body.fort?.enabled && fortModule) {
    const brief = buildFortBrief({
      module: fortModule,
      config: settings.fort_config,
      values: body.fort.values ?? {},
      // base finalPrompt already carries the user text; don't duplicate it here.
    });
    const compiled = compileBrief(brief.briefText);
    const layerText = brief.appliedLayers
      .map((l) => l.content.trim())
      .filter(Boolean)
      .join("\n\n");
    const parts: string[] = [];
    if (layerText) parts.push(layerText);
    parts.push(finalPrompt);
    if (compiled.text.trim()) parts.push(`## BRIEF EKSPERT (maroFort)\n${compiled.text}`);
    finalPrompt = parts.join("\n\n");
    fortLog = {
      enabled: true,
      values: body.fort.values ?? {},
      appliedLayerIds: brief.appliedLayerIds,
      score: brief.score,
    };
  }

  const refs = (body.attachments ?? []).filter(
    (a) => typeof a === "string" && a.startsWith("data:image/")
  );

  try {
    const b64s = refs.length
      ? await editImages({
          prompt: finalPrompt,
          images: refs,
          size,
          quality: body.quality,
          n: body.n,
        })
      : await generateImages({
          prompt: finalPrompt,
          size,
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
        selections: Object.keys(selections).length ? selections : undefined,
        fort: fortLog,
      });
    }

    return NextResponse.json({ images: urls, creditsSpent: cost });
  } catch (err) {
    console.error("[ai/image] failed:", err);
    if (userId && cost) await refundCredits(userId, cost);
    return NextResponse.json({ error: "ai-failed" }, { status: 502 });
  }
}
