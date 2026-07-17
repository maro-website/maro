"use client";

import type { Project } from "@/lib/types";
import type { AiEditHtmlRequest, AiEditHtmlResponse } from "@/lib/ai/types";
import { getAccessToken } from "@/lib/supabase/client";
import { InsufficientCreditsError } from "@/lib/services/generationService";

export { InsufficientCreditsError };

export interface HtmlEditResult {
  reply: string;
  versionLabel: string;
  cost: number;
  pageId: string;
  html: string;
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
    page: { name: page.name, slug: page.slug, html: page.html },
  };

  const token = await getAccessToken();
  const res = await fetch("/api/ai/edit-html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });

  if (res.status === 402) {
    const j = await res.json().catch(() => ({}));
    throw new InsufficientCreditsError(j.needed ?? 0, j.have ?? 0);
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
