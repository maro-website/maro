// Staged UX for the generation screen. The visual pipeline below is decoupled
// from the actual content generation (`generateSite`), which calls Claude Opus
// 4.8 when an API key is configured and otherwise leaves the local factory
// content in place.

import type { Project, HtmlPage } from "@/lib/types";
import type { AiGenerateRequest, AiGenerateHtmlResponse } from "@/lib/ai/types";
import { getAccessToken } from "@/lib/supabase/client";
import { uid, slugify } from "@/lib/utils/format";

export class InsufficientCreditsError extends Error {
  needed: number;
  have: number;
  constructor(needed: number, have: number) {
    super("INSUFFICIENT_CREDITS");
    this.name = "InsufficientCreditsError";
    this.needed = needed;
    this.have = have;
  }
}

// A real generation failure. `fallbackOk` is true only when there is no API key
// configured (dev mode) — in that case the caller may use local factory content.
export class GenerationError extends Error {
  code: string;
  fallbackOk: boolean;
  status: number;
  detail?: string;
  constructor(code: string, status: number, fallbackOk: boolean, detail?: string) {
    super(code);
    this.name = "GenerationError";
    this.code = code;
    this.status = status;
    this.fallbackOk = fallbackOk;
    this.detail = detail;
  }
}

export interface GenStage {
  key: string;
  label: string;
}

export const GENERATION_STAGES: GenStage[] = [
  { key: "understand", label: "Po e kuptojmë biznesin tënd" },
  { key: "structure", label: "Po krijojmë strukturën" },
  { key: "direction", label: "Po zgjedhim drejtimin vizual" },
  { key: "brand", label: "Po aplikojmë brandin" },
  { key: "pages", label: "Po marojmë faqet" },
  { key: "mobile", label: "Po kontrollojmë versionin mobile" },
  { key: "final", label: "Po bëjmë kontrollin final" },
];

export interface GenerationHandle {
  cancel: () => void;
  skip: () => void;
}

export function runGeneration(opts: {
  onStage: (index: number) => void;
  onDone: () => void;
  totalMs?: number;
}): GenerationHandle {
  const total = opts.totalMs ?? 11000;
  const per = total / GENERATION_STAGES.length;
  let idx = 0;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;

  const tick = () => {
    if (cancelled) return;
    opts.onStage(idx);
    idx++;
    if (idx >= GENERATION_STAGES.length) {
      timer = setTimeout(() => !cancelled && opts.onDone(), per);
      return;
    }
    timer = setTimeout(tick, per);
  };
  tick();

  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(timer);
    },
    skip: () => {
      cancelled = true;
      clearTimeout(timer);
      opts.onStage(GENERATION_STAGES.length - 1);
      opts.onDone();
    },
  };
}

export interface GeneratedSite {
  htmlPages: HtmlPage[];
  activeHtmlPageId: string;
}

// Real site generation via Claude Opus 4.8 (/api/ai/generate). Returns full,
// Claude-authored HTML pages. Throws on any real failure.
export async function generateSite(project: Project): Promise<GeneratedSite> {
  const req: AiGenerateRequest = {
    businessName: project.businessName,
    goal: project.goal,
    tagline: project.tagline,
    category: project.category,
    language: project.language,
    email: project.email,
    phone: project.phone,
    location: project.location,
    primaryColor: project.theme.primaryColor,
    userPrompt: project.prompt ?? project.goal,
    websiteType: project.websiteType,
    speed: project.speed,
  };

  const token = await getAccessToken();
  const res = await fetch("/api/ai/generate", {
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
    const j = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      fallback?: boolean;
    };
    const code = j.error || `http-${res.status}`;
    // Only a missing API key (dev) justifies falling back to factory content.
    throw new GenerationError(code, res.status, code === "no-key", j.detail);
  }

  const data = (await res.json()) as AiGenerateHtmlResponse;
  const htmlPages: HtmlPage[] = (data.pages ?? [])
    .filter((p) => p?.html?.trim())
    .map((p) => ({
      id: uid("hpage"),
      name: p.name?.trim() || "Home",
      slug: slugify(p.slug || p.name || "home") || "home",
      html: p.html,
    }));
  if (!htmlPages.length) throw new GenerationError("empty", 502, false, "no HTML pages");

  return { htmlPages, activeHtmlPageId: htmlPages[0].id };
}
