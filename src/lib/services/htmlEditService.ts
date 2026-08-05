"use client";

import type { Project } from "@/lib/types";
import type { AiEditHtmlRequest, AiEditHtmlResponse } from "@/lib/ai/types";
import { getAccessToken } from "@/lib/supabase/client";
import { aiFetchHeaders, newIdempotencyKey } from "@/lib/client/idempotency";
import { InsufficientCreditsError } from "@/lib/services/aiEditService";

export interface HtmlEditResult {
  reply: string;
  versionLabel: string;
  cost: number;
  pageId: string;
  html: string;
}

type EditStreamPayload =
  | (AiEditHtmlResponse & { ok: true; jobId?: string })
  | {
      ok: false;
      error?: string;
      detail?: string;
      refunded?: boolean;
      jobId?: string;
    };

async function readEditStream(res: Response): Promise<AiEditHtmlResponse> {
  if (!res.body) throw new Error("empty-stream");

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let lastError: Error | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    let sep = buf.indexOf("\n\n");
    while (sep !== -1) {
      const chunk = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6)) as EditStreamPayload;
        if (payload.ok) {
          return {
            reply: payload.reply,
            versionLabel: payload.versionLabel,
            cost: payload.cost,
            html: payload.html,
          };
        }
        lastError = new Error(payload.detail || payload.error || "ai-failed");
      }
      sep = buf.indexOf("\n\n");
    }
  }

  if (lastError) throw lastError;
  throw new Error("stream-ended");
}

// Edit the active HTML page via Claude (/api/ai/edit-html). Throws
// InsufficientCreditsError (402) or Error on other failures.
export async function requestHtmlEdit(
  prompt: string,
  project: Project
): Promise<HtmlEditResult> {
  const pages = project.htmlPages ?? [];
  const page =
    pages.find((p) => p.id === project.activeHtmlPageId) ?? pages[0];
  if (!page) throw new Error("no-active-html-page");

  const req: AiEditHtmlRequest = {
    instruction: prompt,
    businessName: project.businessName,
    language: project.language,
    modelOptionId: project.toolSelections?.model,
    page: { name: page.name, slug: page.slug, html: page.html },
  };

  const token = await getAccessToken();
  const idempotencyKey = req.idempotencyKey ?? newIdempotencyKey("html");
  const res = await fetch("/api/ai/edit-html", {
    method: "POST",
    headers: aiFetchHeaders(token, idempotencyKey),
    body: JSON.stringify({ ...req, idempotencyKey }),
  });

  if (res.status === 402) {
    const j = await res.json().catch(() => ({}));
    throw new InsufficientCreditsError(j.needed ?? 0, j.have ?? 0);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    if (!res.ok) {
      throw new Error(`http-${res.status}`);
    }
    const data = await readEditStream(res);
    return {
      reply: data.reply,
      versionLabel: data.versionLabel,
      cost: data.cost,
      pageId: page.id,
      html: data.html,
    };
  }

  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(j.detail || j.error || `http-${res.status}`);
  }

  const data = (await res.json()) as AiEditHtmlResponse;
  return {
    reply: data.reply,
    versionLabel: data.versionLabel,
    cost: data.cost,
    pageId: page.id,
    html: data.html,
  };
}

export function htmlEditErrorMessage(err: unknown): string {
  if (err instanceof InsufficientCreditsError) {
    return `Nuk ke kredite të mjaftueshme për këtë ndryshim (nevojiten ${err.needed}).`;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("parse-failed") || msg.includes("no HTML parsed")) {
    return "Modeli nuk ktheu HTML të vlefshëm. Provo me një kërkesë më të shkurtër.";
  }
  if (msg.includes("524") || msg.includes("504") || msg.includes("timeout")) {
    return "Kërkesa zgjati shumë. Provo përsëri ose bëj një ndryshim më të vogël.";
  }
  if (msg.includes("job_create_failed")) {
    return "Gabim serveri (job). Kontakto support ose provo përsëri.";
  }
  if (msg.includes("unauthorized") || msg.includes("401")) {
    return "Sesioni skadoi. Hyr përsëri dhe provo.";
  }
  return "Nuk munda ta bëj këtë ndryshim tani. Provo përsëri ose ndrysho kërkesën.";
}
