// Staged UX for the generation screen. The visual pipeline below is decoupled
// from the actual content generation (`generateSite`), which calls Claude Opus
// 5 when an API key is configured and otherwise leaves the local factory
// content in place.

import type { Project, HtmlPage } from "@/lib/types";
import type { AiGenerateRequest, AiGenerateHtmlResponse } from "@/lib/ai/types";
import { getAccessToken } from "@/lib/supabase/client";
import { aiFetchHeaders, newIdempotencyKey } from "@/lib/client/idempotency";
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
  refunded: boolean;
  constructor(
    code: string,
    status: number,
    fallbackOk: boolean,
    detail?: string,
    refunded = false
  ) {
    super(code);
    this.name = "GenerationError";
    this.code = code;
    this.status = status;
    this.fallbackOk = fallbackOk;
    this.detail = detail;
    this.refunded = refunded;
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
  generationId?: string;
  thumbnailToken?: string;
}

type GenerateStreamPayload =
  | {
      ok: true;
      pages: AiGenerateHtmlResponse["pages"];
      creditsSpent?: number;
      generationId?: string;
      thumbnailToken?: string;
    }
  | {
      ok: false;
      error?: string;
      detail?: string;
      fallback?: boolean;
      refunded?: boolean;
    }
  | { stage: number };

export interface GeneratedSiteResult extends GeneratedSite {
  creditsSpent: number;
}

function pagesToSite(pages: AiGenerateHtmlResponse["pages"]): GeneratedSite {
  const htmlPages: HtmlPage[] = (pages ?? [])
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

async function readGenerateStream(
  res: Response,
  onStage?: (index: number) => void
): Promise<GeneratedSiteResult> {
  if (!res.body) throw new GenerationError("ai-failed", 502, false, "empty stream");

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let lastError: GenerationError | null = null;

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
        const payload = JSON.parse(line.slice(6)) as GenerateStreamPayload;
        if ("stage" in payload && typeof payload.stage === "number") {
          onStage?.(payload.stage);
          continue;
        }
        if ("ok" in payload && payload.ok) {
          const site = pagesToSite(payload.pages);
          return {
            ...site,
            creditsSpent: payload.creditsSpent ?? 0,
            generationId: payload.generationId,
            thumbnailToken: payload.thumbnailToken,
          };
        }
        if ("ok" in payload && !payload.ok) {
          lastError = new GenerationError(
            payload.error || "ai-failed",
            502,
            payload.error === "no-key",
            payload.detail,
            payload.refunded ?? false
          );
        }
      }
      sep = buf.indexOf("\n\n");
    }
  }

  if (lastError) throw lastError;
  throw new GenerationError("ai-failed", 502, false, "stream ended without result");
}

// Real site generation via Claude Opus 5 (/api/ai/generate). Returns full,
// Claude-authored HTML pages. Throws on any real failure.
export async function generateSite(
  project: Project,
  opts?: { onStage?: (index: number) => void }
): Promise<GeneratedSiteResult> {
  const req: AiGenerateRequest = {
    businessName: project.businessName,
    goal: project.goal,
    tagline: project.tagline,
    category: project.category,
    language: project.language,
    email: project.email,
    phone: project.phone,
    location: project.location,
    ...(project.explicitBrandColor ? { primaryColor: project.explicitBrandColor } : {}),
    userPrompt: project.prompt ?? project.goal,
    websiteType: project.websiteType,
    speed: project.speed,
    selections: project.toolSelections,
    fort: project.fort,
    maroPrompt: project.maroPromptId ? { id: project.maroPromptId } : undefined,
    referenceImages: project.referenceImages?.length ? [...project.referenceImages] : undefined,
    workspaceId: project.workspaceId,
    useBrain: project.brain === true,
  };

  const token = await getAccessToken();
  const idempotencyKey = req.idempotencyKey ?? newIdempotencyKey("web");
  const res = await fetch("/api/ai/generate", {
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
      throw new GenerationError(`http-${res.status}`, res.status, false);
    }
    return readGenerateStream(res, opts?.onStage);
  }

  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      fallback?: boolean;
      refunded?: boolean;
    };
    const code = j.error || `http-${res.status}`;
    // Only a missing API key (dev) justifies falling back to factory content.
    throw new GenerationError(code, res.status, code === "no-key", j.detail, j.refunded ?? false);
  }

  const data = (await res.json()) as AiGenerateHtmlResponse & {
    creditsSpent?: number;
    generationId?: string;
    thumbnailToken?: string;
  };
  return {
    ...pagesToSite(data.pages),
    creditsSpent: data.creditsSpent ?? 0,
    generationId: data.generationId,
    thumbnailToken: data.thumbnailToken,
  };
}

export async function generateWebsiteThumbnail(input: {
  generationId: string;
  html: string;
  captureToken: string;
}): Promise<{ url: string; storageRef: string } | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const response = await fetch("/api/projects/thumbnail", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { url?: string; storageRef?: string };
    return payload.url && payload.storageRef ? { url: payload.url, storageRef: payload.storageRef } : null;
  } catch {
    return null;
  }
}
