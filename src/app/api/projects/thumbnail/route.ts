import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { getUserFromToken, getSupabaseAdmin, resolveAssetForClient, supabaseServerConfigured, uploadWebThumbnail } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { validateResolvedOutboundHttpUrl } from "@/lib/security/ssrf";
import { verifyThumbnailCaptureToken } from "@/lib/generation/thumbnailToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function bearer(req: Request): string | null {
  const value = req.headers.get("authorization") || req.headers.get("Authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : value;
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonWebGenerate);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { generationId?: string; html?: string; captureToken?: string };
  if (!body.generationId || !body.html?.trim() || !body.captureToken) {
    return NextResponse.json({ error: "generation_html_and_token_required" }, { status: 400 });
  }

  const token = verifyThumbnailCaptureToken({ token: body.captureToken, html: body.html });
  if (
    !token.ok ||
    token.payload.generationId !== body.generationId ||
    token.payload.userId !== user.id
  ) {
    return NextResponse.json({ error: token.ok ? "capture_not_authorized" : token.reason }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data: generation } = await admin
    .from("generations")
    .select("id,user_id,workspace_id,website_type,thumbnail_path")
    .eq("id", body.generationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!generation) return NextResponse.json({ error: "generation_not_found" }, { status: 404 });
  if (
    !generation.workspace_id ||
    generation.workspace_id !== token.payload.workspaceId ||
    !["landing", "business", "platform"].includes(String(generation.website_type ?? ""))
  ) {
    return NextResponse.json({ error: "not_a_workspace_web_generation" }, { status: 403 });
  }
  const { data: workspace } = await admin
    .from("workspaces")
    .select("id")
    .eq("id", generation.workspace_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) return NextResponse.json({ error: "workspace_not_found" }, { status: 403 });

  if (generation.thumbnail_path) {
    return NextResponse.json({
      url: await resolveAssetForClient(String(generation.thumbnail_path)),
      storageRef: generation.thumbnail_path,
      existing: true,
    });
  }

  for (const [scope, key, limit, windowSeconds] of [
    ["thumbnail:user", `${user.id}:${clientIp(req)}`, 6, 3600],
    ["thumbnail:generation", `${user.id}:${body.generationId}`, 2, 3600],
  ] as const) {
    const rateLimit = await enforceRateLimit(req, scope, key, limit, windowSeconds);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retry_after: rateLimit.retryAfter },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>["newPage"]>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--no-first-run",
      ],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    page = await browser.newPage();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(15_000);
    await page.setViewport({ width: 1440, height: 810, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on("popup", (popup) => {
      if (popup) void popup.close().catch(() => undefined);
    });
    browser.on("targetcreated", (target) => {
      void target.page().then((candidate) => {
        if (candidate && candidate !== page) return candidate.close().catch(() => undefined);
      });
    });
    page.on("dialog", (dialog) => void dialog.dismiss().catch(() => undefined));
    page.on("request", (request) => {
      void (async () => {
        const url = request.url();
        if (request.isNavigationRequest() && request.frame() === page?.mainFrame()) {
          await request.abort("blockedbyclient").catch(() => undefined);
          return;
        }
        if (url.startsWith("data:") || url.startsWith("blob:")) {
          await request.continue().catch(() => undefined);
          return;
        }
        const validated = await validateResolvedOutboundHttpUrl(url);
        if (validated.ok) await request.continue().catch(() => undefined);
        else await request.abort("blockedbyclient").catch(() => undefined);
      })();
    });
    await page.setContent(body.html, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10_000 }).catch(() => undefined);
    await page.evaluate(async () => { await document.fonts?.ready; window.scrollTo(0, 0); });
    const bytes = await page.screenshot({ type: "jpeg", quality: 84, clip: { x: 0, y: 0, width: 1440, height: 810 } });
    const storageRef = await uploadWebThumbnail(user.id, body.generationId, Buffer.from(bytes));
    if (!storageRef) return NextResponse.json({ error: "thumbnail_upload_failed" }, { status: 502 });
    const { error: updateError } = await admin
      .from("generations")
      .update({ thumbnail_path: storageRef })
      .eq("id", body.generationId)
      .eq("user_id", user.id);
    if (updateError) return NextResponse.json({ error: "thumbnail_persist_failed" }, { status: 502 });
    const url = await resolveAssetForClient(storageRef);
    return NextResponse.json({ url, storageRef });
  } catch (error) {
    console.error("[web-thumbnail] capture failed", error);
    return NextResponse.json({ error: "thumbnail_capture_failed" }, { status: 502 });
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
