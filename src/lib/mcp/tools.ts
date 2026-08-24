import "server-only";

import { z } from "zod";
import type { AiImageRequest } from "@/lib/ai/imageTypes";
import {
  executeMaroImageApplication,
  type MaroImageApplicationAdapter,
} from "@/lib/maro-imazh/applicationService";
import { resolveEntitlements } from "@/lib/commerce/entitlements";
import { getMaroAccountSummary } from "@/lib/supabase/server";
import type { MaroMcpActor } from "@/lib/mcp/auth";
import { getMaroMcpResource } from "@/lib/mcp/config";
import { resolvePrivateImageContent } from "@/lib/ai/imageReferences";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

export const maroAccountInputSchema = z.object({}).strict();

export const maroImageInputSchema = z
  .object({
    request: z.string().trim().min(3).max(4_000),
    aspect_ratio: z.enum(["square", "portrait", "story", "landscape"]).optional(),
    text_preference: z.enum(["no_text", "include_text"]).optional(),
  })
  .strict();

export type MaroImageInput = z.infer<typeof maroImageInputSchema>;

export type MaroMcpErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID"
  | "INSUFFICIENT_PERMISSION"
  | "NO_ACTIVE_WORKSPACE"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "GENERATION_FAILED"
  | "SERVICE_UNAVAILABLE";

export type MaroMcpToolSuccess = {
  ok: true;
  text: string;
  structuredContent: Record<string, unknown>;
  content?: ContentBlock[];
};

export type MaroMcpToolFailure = {
  ok: false;
  code: MaroMcpErrorCode;
  message: string;
};

export type MaroMcpToolOutcome = MaroMcpToolSuccess | MaroMcpToolFailure;

type CanonicalOutcome = { payload: Record<string, unknown>; status: number };

function fail(code: MaroMcpErrorCode, message: string): MaroMcpToolFailure {
  return { ok: false, code, message };
}

export async function getMaroAccountTool(actor: MaroMcpActor): Promise<MaroMcpToolOutcome> {
  const [account, entitlements] = await Promise.all([
    getMaroAccountSummary(actor.userId),
    resolveEntitlements(actor.userId).catch(() => null),
  ]);

  if (!account) return fail("AUTH_INVALID", "Llogaria Maro nuk u gjet.");
  if (!account.activeWorkspaceName) {
    return fail("NO_ACTIVE_WORKSPACE", "Llogaria nuk ka një workspace aktiv të vlefshëm.");
  }

  const structuredContent: Record<string, unknown> = {
    connected: true,
    display_name: account.displayName,
    active_workspace_name: account.activeWorkspaceName,
  };
  if (entitlements) {
    structuredContent.plan = entitlements.plan_display_name ?? entitlements.plan_status;
    structuredContent.available_credits = entitlements.credits_available;
  }

  return {
    ok: true,
    text: `Maro është lidhur si ${account.displayName}; workspace aktiv: ${account.activeWorkspaceName}.`,
    structuredContent,
  };
}

const ASPECT_TO_FORMAT: Record<NonNullable<MaroImageInput["aspect_ratio"]>, string> = {
  square: "fb-post",
  portrait: "ig-post",
  story: "ig-story",
  landscape: "yt-thumb",
};

function mapCanonicalError(payload: Record<string, unknown>, status: number): MaroMcpToolFailure {
  const raw = typeof payload.error === "string" ? payload.error : "";
  if (status === 401 || raw === "unauthorized") {
    return fail("AUTH_INVALID", "Lidhja me Maro nuk është më e vlefshme.");
  }
  if (status === 402 || raw === "insufficient-credits") {
    return fail("INSUFFICIENT_CREDITS", "Nuk ka kredi të mjaftueshme për këtë gjenerim.");
  }
  if (status === 429 || raw === "rate_limited" || raw === "concurrency_limit") {
    return fail("RATE_LIMITED", "Limiti i përkohshëm i gjenerimeve është arritur. Provo pak më vonë.");
  }
  if (
    status === 400 ||
    raw === "missing-prompt" ||
    raw === "bad-tool" ||
    raw === "prompt_too_long" ||
    raw === "prompt_rejected"
  ) {
    return fail("INVALID_REQUEST", "Kërkesa për imazh nuk është e vlefshme.");
  }
  if (
    status === 503 ||
    raw === "service_unavailable" ||
    raw === "no-supabase" ||
    raw === "no-key" ||
    raw === "platform_busy"
  ) {
    return fail("SERVICE_UNAVAILABLE", "Maro Imazh nuk është i disponueshëm për momentin.");
  }
  return fail("GENERATION_FAILED", "Imazhi nuk u gjenerua. Kreditet rezervë lirohen automatikisht pas dështimit teknik.");
}

function isSafeAssetUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.startsWith("data:") || value.startsWith("blob:")) {
    return false;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function canonicalAdapter(): MaroImageApplicationAdapter<Promise<CanonicalOutcome>> {
  return {
    failure(payload, status) {
      return Promise.resolve({ payload, status });
    },
    async stream(run) {
      let finalPayload: Record<string, unknown> | null = null;
      let succeeded = false;
      await run((payload) => {
        finalPayload = payload;
        succeeded = payload.ok === true;
      });
      return {
        payload: finalPayload ?? { ok: false, error: "empty" },
        status: succeeded ? 200 : 502,
      };
    },
  };
}

export async function generateMaroImageTool(input: {
  actor: MaroMcpActor;
  args: MaroImageInput;
  idempotencyKey: string;
  sourceRequest: Request;
}): Promise<MaroMcpToolOutcome> {
  const selections: Record<string, string> = {
    model: "gpt-image-2",
    speed: "normal",
    format: ASPECT_TO_FORMAT[input.args.aspect_ratio ?? "portrait"],
    text: input.args.text_preference === "include_text" ? "on" : "off",
  };

  const body: AiImageRequest = {
    toolId: "reklama",
    prompt: input.args.request,
    selections,
    useWorkspaceBrand: true,
    n: 1,
    idempotencyKey: input.idempotencyKey,
  };

  const headers = new Headers({
    authorization: `Bearer ${input.actor.token}`,
    "idempotency-key": input.idempotencyKey,
    "content-type": "application/json",
  });
  for (const name of ["x-forwarded-for", "x-real-ip"]) {
    const value = input.sourceRequest.headers.get(name);
    if (value) headers.set(name, value);
  }

  const canonicalRequest = new Request(getMaroMcpResource(), {
    method: "POST",
    headers,
    signal: input.sourceRequest.signal,
  });
  const outcome = await executeMaroImageApplication(
    canonicalRequest,
    body,
    canonicalAdapter()
  );

  if (outcome.payload.ok !== true) {
    return mapCanonicalError(outcome.payload, outcome.status);
  }

  const images = Array.isArray(outcome.payload.images)
    ? outcome.payload.images.filter(isSafeAssetUrl)
    : [];
  if (!images.length) {
    return fail("GENERATION_FAILED", "Gjenerimi nuk prodhoi një URL të sigurt të ruajtur.");
  }

  const aspectRatio = input.args.aspect_ratio ?? "portrait";
  const creditsSpent =
    typeof outcome.payload.creditsSpent === "number" ? outcome.payload.creditsSpent : undefined;
  const structuredContent: Record<string, unknown> = {
    asset_url: images[0],
    media_type: "image/png",
    aspect_ratio: aspectRatio,
    url_expires_in_seconds: 3600,
  };
  if (creditsSpent !== undefined) structuredContent.credits_spent = creditsSpent;

  // Keep a standards-compliant raw MCP image block for non-UI hosts. ChatGPT's
  // plugin surface renders the primary result through the MCP Apps resource
  // attached to this tool and hydrates it from structuredContent.asset_url.
  const storageRefs = Array.isArray(outcome.payload.storageRefs)
    ? outcome.payload.storageRefs.filter((value): value is string => typeof value === "string")
    : [];
  let inlineImage: Awaited<ReturnType<typeof resolvePrivateImageContent>> | null = null;
  for (const storageRef of storageRefs) {
    try {
      inlineImage = await resolvePrivateImageContent(storageRef, input.actor.userId);
      break;
    } catch {
      // Preserve the successful generation/link result if inline hydration
      // fails. Never generate or charge again merely to format the response.
    }
  }

  const text = inlineImage
    ? `Imazhi u gjenerua me Maro për workspace-in aktiv dhe është bashkëngjitur direkt. Link rezervë (60 minuta): ${images[0]}`
    : `Imazhi u gjenerua me Maro për workspace-in aktiv. Linku i sigurt është i vlefshëm për 60 minuta: ${images[0]}`;
  const content: ContentBlock[] = inlineImage
    ? [
        {
          type: "image",
          data: inlineImage.data,
          mimeType: inlineImage.mimeType,
          annotations: { audience: ["user", "assistant"], priority: 1 },
        },
        { type: "text", text },
      ]
    : [{ type: "text", text }];

  return {
    ok: true,
    text,
    structuredContent,
    content,
  };
}
