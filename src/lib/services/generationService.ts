// Staged UX for the generation screen. The visual pipeline below is decoupled
// from the actual content generation (`generateSite`), which calls Claude Opus
// 4.8 when an API key is configured and otherwise leaves the local factory
// content in place.

import type { Project, Theme, WebsitePage } from "@/lib/types";
import type { AiGenerateRequest, AiGenerateResponse } from "@/lib/ai/types";
import { buildPagesFromAi, normalizeTheme } from "@/lib/ai/normalize";
import { getAccessToken } from "@/lib/supabase/client";

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
  constructor(code: string, status: number, fallbackOk: boolean) {
    super(code);
    this.name = "GenerationError";
    this.code = code;
    this.status = status;
    this.fallbackOk = fallbackOk;
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
  pages: WebsitePage[];
  activePageId: string;
  theme?: Partial<Theme>;
}

// Real site generation via Claude Opus 4.8 (/api/ai/generate). Throws on any
// failure so the generating screen can keep the local factory content.
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
    const j = (await res.json().catch(() => ({}))) as { error?: string; fallback?: boolean };
    const code = j.error || `http-${res.status}`;
    // Only a missing API key (dev) justifies falling back to factory content.
    throw new GenerationError(code, res.status, code === "no-key");
  }

  const data = (await res.json()) as AiGenerateResponse;
  const pages = buildPagesFromAi(data.pages, project.category, project.businessName);
  if (!pages.length) throw new Error("ai-generate-empty");

  return {
    pages,
    activePageId: pages[0].id,
    theme: data.theme && Object.keys(data.theme).length ? normalizeTheme(data.theme) : undefined,
  };
}
